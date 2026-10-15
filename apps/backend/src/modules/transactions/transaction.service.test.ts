import { beforeEach, describe, expect, it } from "vitest";
import { BadRequestError, NotFoundError } from "../../shared/errors.js";
import {
  InMemoryCategoryRepository,
  InMemoryTransactionRepository,
  makeCategory,
} from "../../testing/fakes.js";
import { TransactionService } from "./transaction.service.js";

const USER = "user-1";
const OTHER_USER = "user-2";

describe("TransactionService", () => {
  let categories: InMemoryCategoryRepository;
  let transactions: InMemoryTransactionRepository;
  let service: TransactionService;
  const food = makeCategory({ id: "food", name: "Makanan", type: "expense" });
  const salary = makeCategory({ id: "salary", name: "Gaji", type: "income" });
  const othersCustom = makeCategory({ id: "secret", userId: OTHER_USER, name: "Rahasia" });

  beforeEach(() => {
    categories = new InMemoryCategoryRepository([food, salary, othersCustom]);
    transactions = new InMemoryTransactionRepository(categories);
    service = new TransactionService({ transactions, categories });
  });

  describe("list", () => {
    it("returns the month's visible transactions newest first, hiding ignored ones", async () => {
      transactions.seed({
        userId: USER,
        amount: 10,
        merchant: "Old",
        transactionDate: new Date("2026-10-02T03:00:00Z"),
      });
      transactions.seed({
        userId: USER,
        amount: 20,
        merchant: "New",
        transactionDate: new Date("2026-10-20T03:00:00Z"),
      });
      transactions.seed({ userId: USER, amount: 30, status: "ignored" });
      transactions.seed({
        userId: USER,
        amount: 40,
        transactionDate: new Date("2026-09-20T03:00:00Z"),
      });
      transactions.seed({ userId: OTHER_USER, amount: 50 });

      const result = await service.list(USER, { month: "2026-10" });

      expect(result.items.map((item) => item.merchant)).toEqual(["New", "Old"]);
      expect(result.nextCursor).toBeNull();
    });

    it("paginates with a cursor", async () => {
      for (let day = 1; day <= 5; day++) {
        transactions.seed({
          userId: USER,
          amount: day,
          merchant: `M${day}`,
          transactionDate: new Date(`2026-10-0${day}T05:00:00Z`),
        });
      }

      const first = await service.list(USER, { month: "2026-10", limit: 2 });
      expect(first.items.map((item) => item.merchant)).toEqual(["M5", "M4"]);
      expect(first.nextCursor).toBe(first.items[1]!.id);

      const second = await service.list(USER, {
        month: "2026-10",
        limit: 2,
        cursor: first.nextCursor!,
      });
      expect(second.items.map((item) => item.merchant)).toEqual(["M3", "M2"]);

      const last = await service.list(USER, {
        month: "2026-10",
        limit: 2,
        cursor: second.nextCursor!,
      });
      expect(last.items.map((item) => item.merchant)).toEqual(["M1"]);
      expect(last.nextCursor).toBeNull();
    });

    it("filters by status", async () => {
      transactions.seed({ userId: USER, amount: 1, status: "pending_review", merchant: "Pending" });
      transactions.seed({ userId: USER, amount: 2, status: "confirmed" });

      const result = await service.list(USER, { month: "2026-10", status: "pending_review" });
      expect(result.items.map((item) => item.merchant)).toEqual(["Pending"]);
    });
  });

  describe("create", () => {
    it("creates a confirmed manual transaction with a normalized merchant", async () => {
      const created = await service.create(USER, {
        merchant: "  Warung   Bu Tini ",
        amount: 25000,
        type: "expense",
        categoryId: "food",
        transactionDate: "2026-10-14T05:00:00.000Z",
      });

      expect(created).toMatchObject({
        merchant: "Warung Bu Tini",
        amount: 25000,
        source: "manual",
        status: "confirmed",
        category: { id: "food", isDefault: true },
      });
    });

    it("rejects a category whose type does not match", async () => {
      await expect(
        service.create(USER, {
          merchant: "Kantor",
          amount: 1,
          type: "expense",
          categoryId: "salary",
          transactionDate: "2026-10-14T05:00:00.000Z",
        }),
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it("rejects another user's custom category", async () => {
      await expect(
        service.create(USER, {
          merchant: "X",
          amount: 1,
          type: "expense",
          categoryId: "secret",
          transactionDate: "2026-10-14T05:00:00.000Z",
        }),
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it("rejects a whitespace-only merchant", async () => {
      await expect(
        service.create(USER, {
          merchant: "   ",
          amount: 1,
          type: "expense",
          categoryId: null,
          transactionDate: "2026-10-14T05:00:00.000Z",
        }),
      ).rejects.toBeInstanceOf(BadRequestError);
    });
  });

  describe("update", () => {
    it("updates fields and confirms a pending transaction", async () => {
      const row = transactions.seed({
        userId: USER,
        amount: 100,
        status: "pending_review",
        categoryId: "food",
      });

      const updated = await service.update(USER, row.id, { amount: 150, status: "confirmed" });

      expect(updated).toMatchObject({ amount: 150, status: "confirmed", category: { id: "food" } });
    });

    it("drops a category that no longer matches a flipped type", async () => {
      const row = transactions.seed({
        userId: USER,
        amount: 100,
        type: "expense",
        categoryId: "food",
      });

      const updated = await service.update(USER, row.id, { type: "income" });

      expect(updated.type).toBe("income");
      expect(updated.category).toBeNull();
    });

    it("does not let a user touch someone else's transaction", async () => {
      const row = transactions.seed({ userId: OTHER_USER, amount: 100 });
      await expect(service.update(USER, row.id, { amount: 1 })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe("snippet retention", () => {
    it("drops the Gmail snippet once a pending entry is confirmed", async () => {
      const row = transactions.seed({
        userId: USER,
        amount: 1,
        source: "gmail",
        status: "pending_review",
        rawSnippet: "Pembayaran QRIS Rp1",
      });
      const updated = await service.update(USER, row.id, { status: "confirmed" });
      expect(updated.rawSnippet).toBeNull();
    });

    it("keeps the snippet while an entry is still pending", async () => {
      const row = transactions.seed({
        userId: USER,
        amount: 1,
        source: "gmail",
        status: "pending_review",
        rawSnippet: "Pembayaran QRIS Rp1",
      });
      const updated = await service.update(USER, row.id, { merchant: "Bakmi" });
      expect(updated.rawSnippet).toBe("Pembayaran QRIS Rp1");
    });
  });

  describe("remove", () => {
    it("hard-deletes manual transactions", async () => {
      const row = transactions.seed({ userId: USER, amount: 1, source: "manual" });
      await service.remove(USER, row.id);
      expect(transactions.rows).toHaveLength(0);
    });

    it("keeps gmail transactions as ignored tombstones so they are not re-imported", async () => {
      const row = transactions.seed({
        userId: USER,
        amount: 1,
        source: "gmail",
        gmailMessageId: "m1",
      });
      await service.remove(USER, row.id);
      expect(transactions.rows[0]).toMatchObject({
        id: row.id,
        status: "ignored",
        rawSnippet: null,
      });
    });
  });
});

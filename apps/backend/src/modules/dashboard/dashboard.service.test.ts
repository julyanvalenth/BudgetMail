import { beforeEach, describe, expect, it } from "vitest";
import {
  InMemoryBudgetRepository,
  InMemoryCategoryRepository,
  InMemoryTransactionRepository,
  makeCategory,
} from "../../testing/fakes.js";
import { BudgetService, budgetState } from "../budgets/index.js";
import { DashboardService } from "./dashboard.service.js";

const USER = "user-1";
const MONTH = "2026-10";
const inMonth = new Date("2026-10-10T05:00:00Z");

describe("budget state thresholds", () => {
  it("follows Design.md: warning from 80%, over only past 100%", () => {
    expect(budgetState(0.79)).toBe("ok");
    expect(budgetState(0.8)).toBe("warning");
    expect(budgetState(1)).toBe("warning");
    expect(budgetState(1.01)).toBe("over");
  });
});

describe("BudgetService + DashboardService", () => {
  let categories: InMemoryCategoryRepository;
  let transactions: InMemoryTransactionRepository;
  let budgets: InMemoryBudgetRepository;
  let budgetService: BudgetService;
  let dashboard: DashboardService;

  beforeEach(() => {
    categories = new InMemoryCategoryRepository([
      makeCategory({ id: "food", name: "Makanan", type: "expense" }),
      makeCategory({ id: "transport", name: "Transport", type: "expense", icon: "car" }),
      makeCategory({ id: "salary", name: "Gaji", type: "income", icon: "wallet" }),
    ]);
    transactions = new InMemoryTransactionRepository(categories);
    budgets = new InMemoryBudgetRepository(categories);
    budgetService = new BudgetService({ budgets, categories, transactions });
    dashboard = new DashboardService({ transactions, categories, budgets });

    transactions.seed({
      userId: USER,
      amount: 10_000_000,
      type: "income",
      categoryId: "salary",
      transactionDate: inMonth,
    });
    transactions.seed({
      userId: USER,
      amount: 300_000,
      categoryId: "food",
      transactionDate: inMonth,
    });
    transactions.seed({
      userId: USER,
      amount: 150_000,
      categoryId: "food",
      transactionDate: inMonth,
    });
    transactions.seed({
      userId: USER,
      amount: 50_000,
      categoryId: "transport",
      transactionDate: inMonth,
    });
    transactions.seed({
      userId: USER,
      amount: 999_999,
      categoryId: "food",
      status: "pending_review",
      transactionDate: inMonth,
    });
    transactions.seed({
      userId: USER,
      amount: 999_999,
      categoryId: "food",
      status: "ignored",
      transactionDate: inMonth,
    });
    transactions.seed({
      userId: USER,
      amount: 999_999,
      categoryId: "food",
      transactionDate: new Date("2026-09-15T05:00:00Z"),
    });
  });

  it("summarizes confirmed totals, category breakdown and pending count", async () => {
    const summary = await dashboard.summary(USER, MONTH);

    expect(summary).toMatchObject({
      month: MONTH,
      totalIncome: 10_000_000,
      totalExpense: 500_000,
      balance: 9_500_000,
      pendingReviewCount: 1,
    });
    expect(
      summary.expenseByCategory.map((item) => [item.category?.id, item.total, item.count]),
    ).toEqual([
      ["food", 450_000, 2],
      ["transport", 50_000, 1],
    ]);
    expect(summary.expenseByCategory[0]!.share).toBeCloseTo(0.9);
  });

  it("reports budget progress in the summary and the budget list", async () => {
    await budgetService.upsert(USER, { categoryId: "food", month: MONTH, amountLimit: 500_000 });
    await budgetService.upsert(USER, {
      categoryId: "transport",
      month: MONTH,
      amountLimit: 40_000,
    });

    const progress = await budgetService.listProgress(USER, MONTH);
    const byCategory = Object.fromEntries(progress.map((item) => [item.category.id, item]));

    expect(byCategory.food).toMatchObject({
      limit: 500_000,
      spent: 450_000,
      remaining: 50_000,
      state: "warning",
    });
    expect(byCategory.transport).toMatchObject({
      spent: 50_000,
      remaining: -10_000,
      state: "over",
    });

    const summary = await dashboard.summary(USER, MONTH);
    expect(summary.budgets).toHaveLength(2);
  });

  it("overwrites an existing budget instead of duplicating it", async () => {
    await budgetService.upsert(USER, { categoryId: "food", month: MONTH, amountLimit: 100 });
    const updated = await budgetService.upsert(USER, {
      categoryId: "food",
      month: MONTH,
      amountLimit: 900_000,
    });

    expect(budgets.rows).toHaveLength(1);
    expect(updated.limit).toBe(900_000);
  });

  it("refuses budgets on income categories", async () => {
    await expect(
      budgetService.upsert(USER, { categoryId: "salary", month: MONTH, amountLimit: 1 }),
    ).rejects.toThrow("pengeluaran");
  });

  it("copies last month's budgets without overwriting ones already set", async () => {
    await budgetService.upsert(USER, { categoryId: "food", month: "2026-09", amountLimit: 1_000 });
    await budgetService.upsert(USER, {
      categoryId: "transport",
      month: "2026-09",
      amountLimit: 2_000,
    });
    await budgetService.upsert(USER, { categoryId: "food", month: MONTH, amountLimit: 5_000 });

    const result = await budgetService.copy(USER, { fromMonth: "2026-09", toMonth: MONTH });

    expect(result.created).toBe(1);
    const october = await budgetService.listProgress(USER, MONTH);
    expect(october.find((item) => item.category.id === "food")?.limit).toBe(5_000);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import {
  InMemoryCategoryRepository,
  InMemoryTransactionRepository,
  makeCategory,
} from "../../testing/fakes.js";
import { EmailParsingService } from "./emailParsing.service.js";
import type { ExtractedTransaction } from "./strategies/extraction.strategy.js";
import { ExtractionStrategyResolver } from "./strategies/strategyResolver.js";

const SNIPPET = "Pembayaran QRIS Rp96.000 ke BAKMI GM berhasil";

function makeService(extracted: ExtractedTransaction) {
  const categories = new InMemoryCategoryRepository([
    makeCategory({ id: "default-expense-makanan", name: "Makanan", type: "expense" }),
  ]);
  const transactions = new InMemoryTransactionRepository(categories);
  const progress: string[] = [];
  const service = new EmailParsingService({
    emails: {
      fetchEmail: async (_userId, gmailMessageId) => ({
        gmailMessageId,
        from: "notifikasi@bank.example",
        date: "2026-10-14T05:00:00.000Z",
        snippet: SNIPPET,
      }),
    },
    strategies: new ExtractionStrategyResolver({ extract: async () => extracted }),
    transactions,
    categories,
    syncProgress: { incrementTransactionsCreated: async (id) => void progress.push(id) },
    confidenceThreshold: 0.85,
  });
  return { service, transactions, categories, progress };
}

const base: ExtractedTransaction = {
  merchant: "Bakmi GM Resto",
  amount: 96000,
  type: "expense",
  date: "2026-10-14T05:00:00.000Z",
  confidence: 0.9,
};

describe("EmailParsingService", () => {
  let job: { userId: string; gmailMessageId: string; syncJobId: string };
  beforeEach(() => {
    job = { userId: "user-1", gmailMessageId: "m1", syncJobId: "job-1" };
  });

  it("files confident extractions as confirmed without keeping the email snippet", async () => {
    const { service, transactions, progress } = makeService(base);
    await service.parseEmail(job);

    expect(transactions.rows[0]).toMatchObject({ status: "confirmed", rawSnippet: null });
    expect(progress).toEqual(["job-1"]);
  });

  it("keeps the snippet only for pending_review entries the user must check", async () => {
    const { service, transactions } = makeService({ ...base, confidence: 0.6 });
    await service.parseEmail(job);

    expect(transactions.rows[0]).toMatchObject({ status: "pending_review", rawSnippet: SNIPPET });
  });

  it("reuses the global default category instead of creating a per-user copy", async () => {
    const { service, transactions, categories } = makeService(base);
    await service.parseEmail(job);

    expect(transactions.rows[0]?.categoryId).toBe("default-expense-makanan");
    expect(categories.rows).toHaveLength(1);
  });

  it("skips messages that already have a transaction", async () => {
    const { service, transactions } = makeService(base);
    await service.parseEmail(job);
    await service.parseEmail(job);

    expect(transactions.rows).toHaveLength(1);
  });
});

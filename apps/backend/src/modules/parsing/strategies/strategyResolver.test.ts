import { describe, expect, it } from "vitest";
import type { ExtractedTransaction, TransactionExtractionStrategy } from "./extraction.strategy.js";
import { ExtractionStrategyResolver } from "./strategyResolver.js";

function stubStrategy(): TransactionExtractionStrategy {
  const result: ExtractedTransaction = {
    merchant: "",
    amount: 0,
    type: "expense",
    date: "",
    confidence: 0,
  };
  return { extract: async () => result };
}

describe("ExtractionStrategyResolver", () => {
  const defaultStrategy = stubStrategy();
  const bcaStrategy = stubStrategy();
  const resolver = new ExtractionStrategyResolver(defaultStrategy, new Map([["bca", bcaStrategy]]));

  it("resolves a provider-specific strategy from the sender domain", () => {
    expect(resolver.resolveForSender("BCA <notifikasi@klikbca.com>")).toBe(bcaStrategy);
  });

  it("falls back to the default strategy for allowlisted providers without one", () => {
    expect(resolver.resolveForSender("noreply@gopay.co.id")).toBe(defaultStrategy);
  });

  it("falls back to the default strategy for unknown senders", () => {
    expect(resolver.resolveForSender("someone@gmail.com")).toBe(defaultStrategy);
  });
});

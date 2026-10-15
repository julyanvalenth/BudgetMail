import { describe, expect, it } from "vitest";
import { validateExtraction } from "./extraction.strategy.js";

describe("validateExtraction", () => {
  it("accepts a well-formed extraction result", () => {
    const result = validateExtraction({
      merchant: "Indomaret",
      amount: 45000,
      type: "expense",
      date: "2026-07-01T10:00:00.000Z",
      confidence: 0.92,
    });
    expect(result.merchant).toBe("Indomaret");
    expect(result.amount).toBe(45000);
  });

  it("accepts the non-transaction sentinel (empty merchant, zero amount/confidence)", () => {
    const result = validateExtraction({
      merchant: "",
      amount: 0,
      type: "expense",
      date: "",
      confidence: 0,
    });
    expect(result.merchant).toBe("");
    expect(result.confidence).toBe(0);
  });

  it("rejects a negative amount", () => {
    expect(() =>
      validateExtraction({ merchant: "x", amount: -1, type: "expense", date: "", confidence: 0.5 }),
    ).toThrow();
  });

  it("rejects an invalid type", () => {
    expect(() =>
      validateExtraction({
        merchant: "x",
        amount: 1000,
        type: "transfer",
        date: "",
        confidence: 0.5,
      }),
    ).toThrow();
  });

  it("rejects confidence outside 0..1", () => {
    expect(() =>
      validateExtraction({
        merchant: "x",
        amount: 1000,
        type: "expense",
        date: "",
        confidence: 1.5,
      }),
    ).toThrow();
  });

  it("rejects an unparseable date string", () => {
    expect(() =>
      validateExtraction({
        merchant: "x",
        amount: 1000,
        type: "expense",
        date: "not-a-date",
        confidence: 0.5,
      }),
    ).toThrow();
  });

  it("rejects a non-object payload", () => {
    expect(() => validateExtraction("not json")).toThrow();
    expect(() => validateExtraction(null)).toThrow();
  });
});

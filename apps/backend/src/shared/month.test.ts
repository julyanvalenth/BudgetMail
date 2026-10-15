import { describe, expect, it } from "vitest";
import { currentMonth, isValidMonth, monthOf, monthRange } from "./month.js";

describe("month helpers", () => {
  it("validates YYYY-MM strings", () => {
    expect(isValidMonth("2026-10")).toBe(true);
    expect(isValidMonth("2026-13")).toBe(false);
    expect(isValidMonth("2026-1")).toBe(false);
    expect(isValidMonth("26-10")).toBe(false);
  });

  it("computes a WIB month range as UTC instants", () => {
    const { from, to } = monthRange("2026-10");
    expect(from.toISOString()).toBe("2026-09-30T17:00:00.000Z");
    expect(to.toISOString()).toBe("2026-10-31T17:00:00.000Z");
  });

  it("rolls December over into the next year", () => {
    expect(monthRange("2026-12").to.toISOString()).toBe("2026-12-31T17:00:00.000Z");
  });

  it("assigns early-morning WIB transactions to the local month", () => {
    // 2026-11-01 01:00 WIB is still 2026-10-31 in UTC
    expect(monthOf(new Date("2026-10-31T18:00:00.000Z"))).toBe("2026-11");
    expect(currentMonth(new Date("2026-10-14T00:00:00.000Z"))).toBe("2026-10");
  });

  it("rejects malformed months", () => {
    expect(() => monthRange("2026-00")).toThrow();
  });
});

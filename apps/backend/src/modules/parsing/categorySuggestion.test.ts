import { describe, expect, it } from "vitest";
import { suggestCategoryName } from "./categorySuggestion.js";

describe("suggestCategoryName", () => {
  it("maps known grocery merchants to Belanja", () => {
    expect(suggestCategoryName("INDOMARET COKROAMINOTO")).toBe("Belanja");
    expect(suggestCategoryName("Alfamart")).toBe("Belanja");
  });

  it("maps ride-hailing/fuel merchants to Transport", () => {
    expect(suggestCategoryName("GOJEK *TRIP")).toBe("Transport");
    expect(suggestCategoryName("Grab Indonesia")).toBe("Transport");
  });

  it("maps food delivery/restaurants to Makanan", () => {
    expect(suggestCategoryName("GOFOOD *WARTEG")).toBe("Makanan");
  });

  it("maps utility billers to Tagihan", () => {
    expect(suggestCategoryName("PLN Mobile")).toBe("Tagihan");
  });

  it("falls back to Lainnya for unrecognized merchants", () => {
    expect(suggestCategoryName("Some Random Merchant Ltd")).toBe("Lainnya");
  });

  it("is case-insensitive", () => {
    expect(suggestCategoryName("indomaret")).toBe("Belanja");
    expect(suggestCategoryName("INDOMARET")).toBe("Belanja");
  });
});

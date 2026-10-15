import { describe, expect, it } from "vitest";
import { RuleBasedExtractionStrategy, parseIdrAmount } from "./ruleBasedExtraction.strategy.js";

const strategy = new RuleBasedExtractionStrategy();

const baseEmail = {
  from: "KlikBCA <notifikasi@klikbca.com>",
  date: "Tue, 07 Jul 2026 10:00:00 +0700",
};

describe("parseIdrAmount", () => {
  it("parses Indonesian grouping (dots thousands, comma decimals)", () => {
    expect(parseIdrAmount("2.500.000,00")).toBe(2500000);
    expect(parseIdrAmount("50.000")).toBe(50000);
  });

  it("parses English grouping (commas thousands, dot decimals)", () => {
    expect(parseIdrAmount("1,250,000")).toBe(1250000);
    expect(parseIdrAmount("1,250,000.50")).toBe(1250000.5);
  });

  it("parses plain digit runs", () => {
    expect(parseIdrAmount("75000")).toBe(75000);
  });

  it("rejects shapes that are not amounts", () => {
    expect(parseIdrAmount("12.34.5")).toBeUndefined();
    expect(parseIdrAmount("")).toBeUndefined();
  });
});

describe("RuleBasedExtractionStrategy", () => {
  it("extracts a payment with merchant and type keyword at auto-confirm confidence", async () => {
    const result = await strategy.extract({
      ...baseEmail,
      snippet: "Anda telah melakukan pembayaran sebesar Rp 150.000 di INDOMARET pada 07/07/2026.",
    });
    expect(result).toMatchObject({ merchant: "INDOMARET", amount: 150000, type: "expense" });
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    expect(result.date).toBe("2026-07-07T03:00:00.000Z");
  });

  it("extracts an incoming transfer with the sender as merchant", async () => {
    const result = await strategy.extract({
      ...baseEmail,
      snippet: "Anda menerima transfer dana masuk sebesar Rp2.500.000,00 dari BUDI SANTOSO.",
    });
    expect(result).toMatchObject({
      merchant: "BUDI SANTOSO",
      amount: 2500000,
      type: "income",
    });
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("extracts a QRIS payment without a space after Rp", async () => {
    const result = await strategy.extract({
      from: "GoPay <noreply@gopay.co.id>",
      date: baseEmail.date,
      snippet: "Pembayaran QRIS ke KOPI KENANGAN sebesar Rp28.000 berhasil.",
    });
    expect(result).toMatchObject({ merchant: "KOPI KENANGAN", amount: 28000, type: "expense" });
  });

  it("does not swallow a trailing Rp token into the merchant capture", async () => {
    const result = await strategy.extract({
      ...baseEmail,
      snippet: "Transfer berhasil ke BUDI SANTOSO Rp1.000.000",
    });
    expect(result.merchant).toBe("BUDI SANTOSO");
    expect(result.amount).toBe(1000000);
  });

  it("falls back to the provider name and pending-review confidence without a merchant pattern", async () => {
    const result = await strategy.extract({
      from: "GoPay <noreply@gopay.co.id>",
      date: baseEmail.date,
      snippet: "Saldo GoPay berkurang Rp 75.000",
    });
    expect(result.merchant).toBe("GoPay");
    expect(result.amount).toBe(75000);
    expect(result.confidence).toBeLessThan(0.85);
  });

  it("returns the non-transaction sentinel for OTP emails", async () => {
    const result = await strategy.extract({
      ...baseEmail,
      snippet: "Kode verifikasi Anda adalah 123456. Jangan berikan kepada siapapun.",
    });
    expect(result).toMatchObject({ merchant: "", amount: 0, confidence: 0 });
  });

  it("returns the sentinel for marketing emails even when they mention an amount", async () => {
    const result = await strategy.extract({
      ...baseEmail,
      snippet: "Promo spesial! Diskon hingga Rp 100.000 untuk transaksi pertama Anda.",
    });
    expect(result).toMatchObject({ merchant: "", amount: 0, confidence: 0 });
  });

  it("returns the sentinel for failed transactions even with a full merchant/amount match", async () => {
    const result = await strategy.extract({
      ...baseEmail,
      snippet:
        "Transaksi Anda GAGAL. Pembayaran sebesar Rp 500.000 di TOKO ELEKTRONIK JAYA tidak dapat diproses. Saldo tidak berkurang.",
    });
    expect(result).toMatchObject({ merchant: "", amount: 0, confidence: 0 });
  });

  it("returns the sentinel for in-flight (pending) transactions", async () => {
    const result = await strategy.extract({
      ...baseEmail,
      snippet:
        "Transaksi Anda sedang diproses. Pembayaran sebesar Rp 300.000 di TOKO BANGUNAN SUMBER sedang menunggu konfirmasi.",
    });
    expect(result).toMatchObject({ merchant: "", amount: 0, confidence: 0 });
  });

  it("returns the sentinel for bill-due reminders", async () => {
    const result = await strategy.extract({
      ...baseEmail,
      snippet:
        "Tagihan kartu kredit Anda sebesar Rp 1.200.000 akan jatuh tempo pada 15/07/2026. Segera lakukan pembayaran.",
    });
    expect(result).toMatchObject({ merchant: "", amount: 0, confidence: 0 });
  });

  it("scales informal amount shorthand (jt/juta/rb/ribu)", async () => {
    const cases: Array<[string, number]> = [
      ["Pembayaran sebesar Rp2jt di TOKO MAKMUR berhasil.", 2_000_000],
      ["Pembayaran sebesar Rp1,5jt di TOKO MAKMUR berhasil.", 1_500_000],
      ["Pembayaran sebesar Rp 2 juta di TOKO MAKMUR berhasil.", 2_000_000],
      ["Pembayaran sebesar Rp 5 ribu di TOKO MAKMUR berhasil.", 5_000],
    ];
    for (const [snippet, expected] of cases) {
      const result = await strategy.extract({ ...baseEmail, snippet });
      expect(result.amount).toBe(expected);
    }
  });

  it("treats generic 'terjadi transaksi' phrasing as a type-keyword match", async () => {
    const result = await strategy.extract({
      ...baseEmail,
      snippet: "Terjadi transaksi sebesar Rp 50.000 di ALFAMIDI pada 07/07/2026.",
    });
    expect(result).toMatchObject({ merchant: "ALFAMIDI", amount: 50000, type: "expense" });
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("returns the sentinel when no amount is present", async () => {
    const result = await strategy.extract({
      ...baseEmail,
      snippet: "Saldo rekening Anda telah diperbarui.",
    });
    expect(result).toMatchObject({ merchant: "", amount: 0, confidence: 0 });
  });

  it("decodes HTML entities in the snippet before matching", async () => {
    const result = await strategy.extract({
      ...baseEmail,
      snippet: "Pembayaran di ALFAMART&nbsp;JAKARTA sebesar Rp 42.000 berhasil.",
    });
    expect(result.merchant).toBe("ALFAMART JAKARTA");
    expect(result.amount).toBe(42000);
  });

  it("keeps an empty date when the header date is unparseable", async () => {
    const result = await strategy.extract({
      ...baseEmail,
      date: "not-a-date",
      snippet: "Pembayaran sebesar Rp 10.000 di WARUNG MAKAN.",
    });
    expect(result.date).toBe("");
    expect(result.amount).toBe(10000);
  });
});

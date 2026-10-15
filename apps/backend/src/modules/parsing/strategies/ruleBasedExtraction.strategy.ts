import { matchAllowlistedSender } from "../senderAllowlist.js";
import type {
  EmailForExtraction,
  ExtractedTransaction,
  TransactionExtractionStrategy,
} from "./extraction.strategy.js";

// Rule-based (regex/heuristic) extraction for Indonesian bank/e-wallet notification
// snippets. Default strategy when ANTHROPIC_API_KEY is not set, so the pipeline runs
// without any LLM dependency. It only sees the short Gmail snippet (not the full
// body - see gmailApi.service.ts metadata-only fetch), so recall is inherently
// limited; anything it is unsure about gets a confidence below the 0.85 threshold
// and lands in pending_review instead of being silently confirmed.

const NOT_A_TRANSACTION: ExtractedTransaction = {
  merchant: "",
  amount: 0,
  type: "expense",
  date: "",
  confidence: 0,
};

// Emails that mention money but are not transactions (OTP, statements, marketing,
// bill-due reminders).
const NON_TRANSACTION_KEYWORDS = [
  "otp",
  "kode verifikasi",
  "kode rahasia",
  "verification code",
  "jangan berikan",
  "jangan bagikan",
  "e-statement",
  "estatement",
  "rekening koran",
  "promo",
  "diskon",
  "voucher",
  "penawaran",
  "unsubscribe",
  "jatuh tempo",
];

// Notifications about money that did NOT (yet) move: failed, cancelled, or still
// in-flight transactions. Without this guard a well-formed failed-payment email
// matches the fullMatch tier and gets silently auto-confirmed.
const FAILED_OR_PENDING_KEYWORDS = [
  "gagal",
  "tidak berhasil",
  "belum berhasil",
  "ditolak",
  "dibatalkan",
  "tidak dapat diproses",
  "sedang diproses",
  "menunggu konfirmasi",
  "menunggu pembayaran",
  "pending",
];

const INCOME_KEYWORDS = [
  "menerima",
  "diterima",
  "dana masuk",
  "uang masuk",
  "transfer masuk",
  "dikredit",
  "refund",
  "pengembalian dana",
  "cashback",
];

const EXPENSE_KEYWORDS = [
  "pembayaran",
  "dibayar",
  "membayar",
  "pembelian",
  "belanja",
  "transfer berhasil",
  "transfer ke",
  "berhasil dikirim",
  "kirim uang",
  "top up",
  "topup",
  "isi ulang",
  "tarik tunai",
  "penarikan",
  "didebet",
  "debit",
  "transaksi berhasil",
  "terjadi transaksi",
  "transaksi sebesar",
  "transaksi di",
  "qris",
];

// "Rp 1.234.567,00" / "Rp1.234.567" / "IDR 1,234,567" / "Rp. 50000", with an
// optional informal multiplier suffix: "Rp2jt", "Rp1,5jt", "Rp 5 ribu".
const AMOUNT_PATTERN =
  /(?:rp\.?|idr)\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+)\s*(jt|juta|rb|ribu)?\b/i;

const AMOUNT_MULTIPLIERS: Record<string, number> = {
  jt: 1_000_000,
  juta: 1_000_000,
  rb: 1_000,
  ribu: 1_000,
};

// Merchant/counterparty capture: a run of Capitalized/ALL-CAPS/digit-led words after a
// marker ("di Indomaret", "ke BUDI SANTOSO", "dari ANDI"). Lowercase filler words
// ("pada", "sebesar", "berhasil") end the run naturally; "." is excluded from tokens
// so a sentence boundary also ends it.
const CAPITALIZED_RUN = String.raw`([A-Z0-9][\w&'/-]*(?:\s+[A-Z0-9][\w&'/-]*)*)`;
const MERCHANT_LABEL_PATTERN = /(?:merchant|penjual|toko)\s*:\s*([^,;.]{2,60})/i;
const AT_PATTERN = new RegExp(String.raw`\bdi\s+${CAPITALIZED_RUN}`);
const TO_PATTERN = new RegExp(String.raw`\bke(?:pada)?\s+${CAPITALIZED_RUN}`);
const FROM_PATTERN = new RegExp(String.raw`\bdari\s+${CAPITALIZED_RUN}`);

// Confidence tiers: only a full match (amount + type keyword + explicit merchant)
// clears the 0.85 auto-confirm threshold; every partial match goes to pending_review.
const CONFIDENCE = {
  fullMatch: 0.9,
  merchantFallback: 0.7,
  noTypeKeyword: 0.6,
  amountOnly: 0.4,
} as const;

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/gi, "&");
}

// Normalizes both Indonesian ("1.234.567,89") and English ("1,234,567.89") digit
// grouping. Returns undefined when the shape is not a recognizable amount.
export function parseIdrAmount(raw: string): number | undefined {
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(raw)) {
    return Number(raw.replace(/\./g, "").replace(",", "."));
  }
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(raw)) {
    return Number(raw.replace(/,/g, ""));
  }
  if (/^\d+,\d{1,2}$/.test(raw)) {
    return Number(raw.replace(",", "."));
  }
  if (/^\d+(?:\.\d{1,2})?$/.test(raw)) {
    return Number(raw);
  }
  return undefined;
}

function containsAny(haystack: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => haystack.includes(keyword));
}

function cleanMerchantCapture(capture: string): string {
  const tokens = capture.trim().split(/\s+/);
  // The capitalized-run capture can swallow a trailing "Rp50.000" token; drop it.
  let last = tokens.at(-1);
  while (last !== undefined && /^(?:rp\.?|idr)[\d.,]*$/i.test(last)) {
    tokens.pop();
    last = tokens.at(-1);
  }
  return tokens
    .join(" ")
    .replace(/[.,;:]+$/, "")
    .slice(0, 60)
    .trim();
}

function findMerchant(snippet: string, type: "income" | "expense"): string | undefined {
  // For income the counterparty usually follows "dari"; for expenses "di"/"ke".
  const patterns =
    type === "income"
      ? [MERCHANT_LABEL_PATTERN, FROM_PATTERN, AT_PATTERN, TO_PATTERN]
      : [MERCHANT_LABEL_PATTERN, AT_PATTERN, TO_PATTERN, FROM_PATTERN];
  for (const pattern of patterns) {
    const capture = pattern.exec(snippet)?.[1];
    if (capture !== undefined) {
      const cleaned = cleanMerchantCapture(capture);
      if (cleaned.length >= 2) {
        return cleaned;
      }
    }
  }
  return undefined;
}

export class RuleBasedExtractionStrategy implements TransactionExtractionStrategy {
  extract(email: EmailForExtraction): Promise<ExtractedTransaction> {
    return Promise.resolve(this.extractSync(email));
  }

  private extractSync(email: EmailForExtraction): ExtractedTransaction {
    const snippet = decodeHtmlEntities(email.snippet).replace(/\s+/g, " ").trim();
    const lowered = snippet.toLowerCase();

    if (
      containsAny(lowered, NON_TRANSACTION_KEYWORDS) ||
      containsAny(lowered, FAILED_OR_PENDING_KEYWORDS)
    ) {
      return NOT_A_TRANSACTION;
    }

    const amountMatch = AMOUNT_PATTERN.exec(snippet);
    const rawAmount = amountMatch?.[1];
    let amount = rawAmount === undefined ? undefined : parseIdrAmount(rawAmount);
    const multiplierSuffix = amountMatch?.[2]?.toLowerCase();
    if (amount !== undefined && multiplierSuffix !== undefined) {
      amount *= AMOUNT_MULTIPLIERS[multiplierSuffix] ?? 1;
    }
    if (amount === undefined || amount <= 0) {
      return NOT_A_TRANSACTION;
    }

    // Income keywords first: phrases like "menerima transfer" also contain expense
    // words, and false "income" is rarer than false "expense" in these notifications.
    const isIncome = containsAny(lowered, INCOME_KEYWORDS);
    const typeKeywordMatched = isIncome || containsAny(lowered, EXPENSE_KEYWORDS);
    const type: "income" | "expense" = isIncome ? "income" : "expense";

    const explicitMerchant = findMerchant(snippet, type);
    // Fall back to the provider name (e.g. "BCA") so a recognized amount is never
    // dropped by parseEmail's empty-merchant guard - it lands in pending_review.
    const merchant = explicitMerchant ?? matchAllowlistedSender(email.from)?.name ?? "";
    if (merchant === "") {
      return NOT_A_TRANSACTION;
    }

    let confidence: number;
    if (typeKeywordMatched && explicitMerchant) {
      confidence = CONFIDENCE.fullMatch;
    } else if (typeKeywordMatched) {
      confidence = CONFIDENCE.merchantFallback;
    } else if (explicitMerchant) {
      confidence = CONFIDENCE.noTypeKeyword;
    } else {
      confidence = CONFIDENCE.amountOnly;
    }

    const headerDateMs = Date.parse(email.date);
    const date = Number.isNaN(headerDateMs) ? "" : new Date(headerDateMs).toISOString();

    return { merchant, amount, type, date, confidence };
  }
}

export interface ExtractedTransaction {
  merchant: string;
  amount: number;
  type: "income" | "expense";
  date: string; // ISO 8601, or "" when not a transaction
  confidence: number; // 0..1
}

// Minimal email shape a strategy needs. GmailApiService's FetchedEmail satisfies
// this structurally - the parsing module owns the contract (dependency inversion)
// so it never has to import from the gmail-sync module.
export interface EmailForExtraction {
  from: string;
  date: string;
  snippet: string;
}

// Strategy pattern seam: one implementation per extraction approach. Today every
// provider funnels through the generic ClaudeExtractionStrategy; register a
// provider-specific strategy (e.g. tuned prompt per bank) in the resolver when
// parsing accuracy for that provider needs it.
export interface TransactionExtractionStrategy {
  extract(email: EmailForExtraction): Promise<ExtractedTransaction>;
}

export function validateExtraction(raw: unknown): ExtractedTransaction {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Extraction result is not an object");
  }
  const candidate = raw as Record<string, unknown>;
  const { merchant, amount, type, date, confidence } = candidate;

  if (typeof merchant !== "string") {
    throw new Error("merchant must be a string");
  }
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
    throw new Error("amount must be a non-negative number");
  }
  if (type !== "income" && type !== "expense") {
    throw new Error('type must be "income" or "expense"');
  }
  if (typeof date !== "string") {
    throw new Error("date must be a string");
  }
  if (date !== "" && Number.isNaN(Date.parse(date))) {
    throw new Error("date is not a valid date string");
  }
  if (typeof confidence !== "number" || confidence < 0 || confidence > 1) {
    throw new Error("confidence must be a number between 0 and 1");
  }

  return { merchant, amount, type, date, confidence };
}

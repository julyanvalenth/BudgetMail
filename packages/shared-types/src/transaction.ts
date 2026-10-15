export type TransactionSource = "gmail" | "manual";
export type TransactionType = "income" | "expense";
export type TransactionStatus = "pending_review" | "confirmed" | "ignored";

export interface Transaction {
  id: string;
  userId: string;
  source: TransactionSource;
  gmailMessageId: string | null;
  merchant: string;
  amount: number;
  type: TransactionType;
  categoryId: string | null;
  transactionDate: string; // ISO 8601
  confidenceScore: number | null; // 0..1, null for manual entries
  status: TransactionStatus;
  rawSnippet: string | null;
}

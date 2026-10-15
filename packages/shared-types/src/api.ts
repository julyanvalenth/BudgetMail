// API types shared by backend and mobile. Amounts are IDR numbers, dates are
// ISO 8601 strings, months are "YYYY-MM".
import type { CategoryType } from "./category.js";
import type { TransactionSource, TransactionStatus, TransactionType } from "./transaction.js";

export interface CategoryDto {
  id: string;
  name: string;
  icon: string;
  type: CategoryType;
  isDefault: boolean;
}

export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  icon?: string;
}

export interface TransactionDto {
  id: string;
  source: TransactionSource;
  merchant: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  transactionDate: string;
  confidenceScore: number | null;
  category: CategoryDto | null;
  createdAt: string;
}

// The detail view adds the Gmail snippet so a pending entry can be checked against its email.
export interface TransactionDetailDto extends TransactionDto {
  rawSnippet: string | null;
}

export interface TransactionListQuery {
  month?: string;
  category?: string;
  status?: TransactionStatus;
  type?: TransactionType;
  cursor?: string;
  limit?: number;
}

export interface TransactionListResponse {
  items: TransactionDto[];
  nextCursor: string | null;
}

export interface CreateTransactionInput {
  merchant: string;
  amount: number;
  type: TransactionType;
  categoryId: string | null;
  transactionDate: string;
}

export interface UpdateTransactionInput {
  merchant?: string;
  amount?: number;
  type?: TransactionType;
  categoryId?: string | null;
  transactionDate?: string;
  status?: TransactionStatus;
}

export type BudgetState = "ok" | "warning" | "over";

export interface BudgetProgressDto {
  id: string;
  month: string;
  category: CategoryDto;
  limit: number;
  spent: number;
  remaining: number;
  // spent / limit, can go above 1
  ratio: number;
  state: BudgetState;
}

export interface UpsertBudgetInput {
  categoryId: string;
  month: string;
  amountLimit: number;
}

export interface CopyBudgetsInput {
  fromMonth: string;
  toMonth: string;
}

export interface CategoryBreakdownItem {
  category: CategoryDto | null;
  total: number;
  count: number;
  // fraction of the month's total expense
  share: number;
}

export interface DashboardSummaryDto {
  month: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  expenseByCategory: CategoryBreakdownItem[];
  pendingReviewCount: number;
  budgets: BudgetProgressDto[];
}

export type GmailSyncStatus = "connected" | "not_connected" | "token_expired";

export interface GmailStatusDto {
  status: GmailSyncStatus;
  lastSyncedAt?: string | null;
  // Latest sync run, used to show progress and announce new transactions
  lastSync?: {
    id: string;
    status: "running" | "completed" | "failed";
    startedAt: string;
    finishedAt: string | null;
    transactionsCreated: number;
  } | null;
}

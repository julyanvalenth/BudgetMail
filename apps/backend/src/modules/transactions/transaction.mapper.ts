import type {
  TransactionDetailDto,
  TransactionDto,
  TransactionSource,
  TransactionStatus,
  TransactionType,
} from "@budgetmail/shared-types";
import { toCategoryDto } from "../categories/index.js";
import type { TransactionWithCategory } from "./transaction.repository.js";

export function toTransactionDto(transaction: TransactionWithCategory): TransactionDto {
  return {
    id: transaction.id,
    source: transaction.source as TransactionSource,
    merchant: transaction.merchant,
    amount: transaction.amount.toNumber(),
    type: transaction.type as TransactionType,
    status: transaction.status as TransactionStatus,
    transactionDate: transaction.transactionDate.toISOString(),
    confidenceScore: transaction.confidenceScore,
    category: transaction.category ? toCategoryDto(transaction.category) : null,
    createdAt: transaction.createdAt.toISOString(),
  };
}

export function toTransactionDetailDto(transaction: TransactionWithCategory): TransactionDetailDto {
  return { ...toTransactionDto(transaction), rawSnippet: transaction.rawSnippet };
}

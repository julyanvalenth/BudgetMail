import type {
  CreateTransactionInput,
  TransactionDetailDto,
  TransactionDto,
  TransactionListQuery,
  TransactionListResponse,
  TransactionStatus,
  TransactionType,
  UpdateTransactionInput,
} from "@budgetmail/shared-types";
import { BadRequestError, NotFoundError } from "../../shared/errors.js";
import { currentMonth, monthRange } from "../../shared/month.js";
import type { CategoryRepository } from "../categories/index.js";
import { toTransactionDetailDto, toTransactionDto } from "./transaction.mapper.js";
import type { TransactionPatch, TransactionRepository } from "./transaction.repository.js";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
// Ignored rows stay as dedupe tombstones and are hidden unless asked for.
const VISIBLE_STATUSES: TransactionStatus[] = ["pending_review", "confirmed"];

export interface TransactionServiceDeps {
  transactions: TransactionRepository;
  categories: CategoryRepository;
}

export class TransactionService {
  constructor(private readonly deps: TransactionServiceDeps) {}

  async list(userId: string, query: TransactionListQuery): Promise<TransactionListResponse> {
    const { from, to } = monthRange(query.month ?? currentMonth());
    const limit = Math.min(query.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    // One extra row tells us whether there's another page.
    const rows = await this.deps.transactions.list(
      userId,
      {
        from,
        to,
        statuses: query.status ? [query.status] : VISIBLE_STATUSES,
        categoryId: query.category,
        type: query.type,
      },
      { cursor: query.cursor, limit: limit + 1 },
    );
    const page = rows.slice(0, limit);
    return {
      items: page.map(toTransactionDto),
      nextCursor: rows.length > limit ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  async get(userId: string, id: string): Promise<TransactionDetailDto> {
    return toTransactionDetailDto(await this.findOwnedOrThrow(userId, id));
  }

  async create(userId: string, input: CreateTransactionInput): Promise<TransactionDto> {
    const categoryId = await this.resolveCategoryId(userId, input.categoryId, input.type);
    const created = await this.deps.transactions.createManual({
      userId,
      merchant: normalizeMerchant(input.merchant),
      amount: input.amount,
      type: input.type,
      categoryId,
      transactionDate: parseDate(input.transactionDate),
    });
    return toTransactionDto(created);
  }

  async update(
    userId: string,
    id: string,
    input: UpdateTransactionInput,
  ): Promise<TransactionDetailDto> {
    const existing = await this.findOwnedOrThrow(userId, id);
    const nextType = input.type ?? (existing.type as TransactionType);

    const patch: TransactionPatch = {};
    if (input.merchant !== undefined) patch.merchant = normalizeMerchant(input.merchant);
    if (input.amount !== undefined) patch.amount = input.amount;
    if (input.type !== undefined) patch.type = input.type;
    if (input.status !== undefined) patch.status = input.status;
    // The snippet is only kept for review, so drop it once the entry is confirmed or ignored.
    if (input.status === "confirmed" || input.status === "ignored") patch.rawSnippet = null;
    if (input.transactionDate !== undefined) {
      patch.transactionDate = parseDate(input.transactionDate);
    }

    if (input.categoryId !== undefined) {
      patch.categoryId = await this.resolveCategoryId(userId, input.categoryId, nextType);
    } else if (existing.category && existing.category.type !== nextType) {
      // Don't leave an income filed under an expense category after the type flips.
      patch.categoryId = null;
    }

    const updated = await this.deps.transactions.update(existing.id, patch);
    return toTransactionDetailDto(updated);
  }

  // Gmail rows are only marked ignored. Deleting them would let a later backfill
  // (after reconnecting Gmail) import the same email again.
  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.findOwnedOrThrow(userId, id);
    if (existing.source === "gmail") {
      await this.deps.transactions.update(existing.id, { status: "ignored", rawSnippet: null });
      return;
    }
    await this.deps.transactions.delete(existing.id);
  }

  private async findOwnedOrThrow(userId: string, id: string) {
    const transaction = await this.deps.transactions.findOwned(userId, id);
    if (!transaction) {
      throw new NotFoundError("Transaksi tidak ditemukan");
    }
    return transaction;
  }

  private async resolveCategoryId(
    userId: string,
    categoryId: string | null,
    type: TransactionType,
  ): Promise<string | null> {
    if (categoryId === null) {
      return null;
    }
    const category = await this.deps.categories.findAccessible(userId, categoryId);
    if (!category) {
      throw new BadRequestError("Kategori tidak ditemukan");
    }
    if (category.type !== type) {
      throw new BadRequestError("Kategori tidak sesuai dengan tipe transaksi");
    }
    return category.id;
  }
}

function normalizeMerchant(merchant: string): string {
  const normalized = merchant.trim().replace(/\s+/g, " ");
  if (!normalized) {
    throw new BadRequestError("Nama merchant wajib diisi");
  }
  return normalized;
}

function parseDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError("Tanggal transaksi tidak valid");
  }
  return date;
}

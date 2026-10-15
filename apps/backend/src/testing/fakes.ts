// In-memory repositories for tests. They implement the real interfaces, so an
// interface change breaks here too.
import { Prisma, type Category } from "@prisma/client";
import type { CategoryType } from "@budgetmail/shared-types";
import type { BudgetRepository, BudgetWithCategory } from "../modules/budgets/index.js";
import type { CategoryRepository, NewCategory } from "../modules/categories/index.js";
import type {
  CategoryTotal,
  NewGmailTransaction,
  NewManualTransaction,
  TransactionListFilter,
  TransactionPatch,
  TransactionRepository,
  TransactionWithCategory,
} from "../modules/transactions/index.js";

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${++idCounter}`;

export function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: nextId("cat"),
    userId: null,
    name: "Makanan",
    icon: "utensils",
    type: "expense",
    ...overrides,
  };
}

export class InMemoryCategoryRepository implements CategoryRepository {
  constructor(public rows: Category[] = []) {}

  async listForUser(userId: string) {
    return this.rows.filter((row) => row.userId === null || row.userId === userId);
  }
  async findAccessible(userId: string, id: string) {
    return (await this.listForUser(userId)).find((row) => row.id === id) ?? null;
  }
  async findAccessibleByName(userId: string, name: string, type: CategoryType) {
    return (
      (await this.listForUser(userId)).find(
        (row) => row.type === type && row.name.toLowerCase() === name.toLowerCase(),
      ) ?? null
    );
  }
  async create(userId: string, data: NewCategory) {
    const row = makeCategory({ ...data, userId });
    this.rows.push(row);
    return row;
  }
  async findOrCreateByName(userId: string, name: string, type: CategoryType) {
    return (
      this.rows.find((row) => row.userId === null && row.name === name && row.type === type) ??
      this.rows.find((row) => row.userId === userId && row.name === name && row.type === type) ??
      this.create(userId, { name, type, icon: "tag" })
    );
  }
}

export class InMemoryTransactionRepository implements TransactionRepository {
  rows: TransactionWithCategory[] = [];

  constructor(private readonly categories: InMemoryCategoryRepository) {}

  private categoryFor(categoryId: string | null) {
    return this.categories.rows.find((row) => row.id === categoryId) ?? null;
  }

  seed(
    data: Omit<Partial<TransactionWithCategory>, "amount"> & { userId: string; amount: number },
  ) {
    const { amount, ...rest } = data;
    const row: TransactionWithCategory = {
      id: nextId("tx"),
      source: "manual",
      gmailMessageId: null,
      merchant: "Merchant",
      type: "expense",
      categoryId: null,
      transactionDate: new Date("2026-10-10T05:00:00.000Z"),
      confidenceScore: null,
      status: "confirmed",
      rawSnippet: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: null,
      ...rest,
      amount: new Prisma.Decimal(amount),
    };
    row.category = this.categoryFor(row.categoryId);
    this.rows.push(row);
    return row;
  }

  async findByGmailMessageId(gmailMessageId: string) {
    return this.rows.find((row) => row.gmailMessageId === gmailMessageId) ?? null;
  }
  async existingGmailMessageIds(ids: string[]) {
    return new Set(
      this.rows
        .map((row) => row.gmailMessageId)
        .filter((id): id is string => !!id && ids.includes(id)),
    );
  }
  async createFromGmail(data: NewGmailTransaction) {
    return this.seed({ ...data, source: "gmail" });
  }
  async createManual(data: NewManualTransaction) {
    return this.seed({ ...data, source: "manual", status: "confirmed" });
  }
  async list(
    userId: string,
    filter: TransactionListFilter,
    page: { cursor?: string; limit: number },
  ) {
    const matching = this.rows
      .filter(
        (row) =>
          row.userId === userId &&
          row.transactionDate >= filter.from &&
          row.transactionDate < filter.to &&
          filter.statuses.includes(row.status as never) &&
          (!filter.categoryId || row.categoryId === filter.categoryId) &&
          (!filter.type || row.type === filter.type),
      )
      .sort(
        (a, b) =>
          b.transactionDate.getTime() - a.transactionDate.getTime() || b.id.localeCompare(a.id),
      );
    const start = page.cursor ? matching.findIndex((row) => row.id === page.cursor) + 1 : 0;
    return matching.slice(start, start + page.limit);
  }
  async findOwned(userId: string, id: string) {
    return this.rows.find((row) => row.id === id && row.userId === userId) ?? null;
  }
  async update(id: string, patch: TransactionPatch) {
    const row = this.rows.find((candidate) => candidate.id === id)!;
    const { amount, ...rest } = patch;
    Object.assign(row, rest);
    if (amount !== undefined) row.amount = new Prisma.Decimal(amount);
    row.category = this.categoryFor(row.categoryId);
    return row;
  }
  async delete(id: string) {
    this.rows = this.rows.filter((row) => row.id !== id);
  }
  async totalsByCategory(userId: string, from: Date, to: Date) {
    const groups = new Map<string, CategoryTotal>();
    for (const row of this.rows) {
      if (row.userId !== userId || row.status !== "confirmed") continue;
      if (row.transactionDate < from || row.transactionDate >= to) continue;
      const key = `${row.categoryId}|${row.type}`;
      const group = groups.get(key) ?? {
        categoryId: row.categoryId,
        type: row.type as CategoryTotal["type"],
        total: 0,
        count: 0,
      };
      group.total += row.amount.toNumber();
      group.count += 1;
      groups.set(key, group);
    }
    return [...groups.values()];
  }
  async countByStatus(userId: string, from: Date, to: Date, status: string) {
    return this.rows.filter(
      (row) =>
        row.userId === userId &&
        row.status === status &&
        row.transactionDate >= from &&
        row.transactionDate < to,
    ).length;
  }
}

export class InMemoryBudgetRepository implements BudgetRepository {
  rows: BudgetWithCategory[] = [];

  constructor(private readonly categories: InMemoryCategoryRepository) {}

  async listForMonth(userId: string, month: string) {
    return this.rows.filter((row) => row.userId === userId && row.month === month);
  }
  async findOwned(userId: string, id: string) {
    return this.rows.find((row) => row.id === id && row.userId === userId) ?? null;
  }
  async upsert(userId: string, categoryId: string, month: string, amountLimit: number) {
    const existing = this.rows.find(
      (row) => row.userId === userId && row.categoryId === categoryId && row.month === month,
    );
    if (existing) {
      existing.amountLimit = new Prisma.Decimal(amountLimit);
      return existing;
    }
    const row: BudgetWithCategory = {
      id: nextId("budget"),
      userId,
      categoryId,
      month,
      amountLimit: new Prisma.Decimal(amountLimit),
      createdAt: new Date(),
      updatedAt: new Date(),
      category: this.categories.rows.find((category) => category.id === categoryId)!,
    };
    this.rows.push(row);
    return row;
  }
  async delete(id: string) {
    this.rows = this.rows.filter((row) => row.id !== id);
  }
  async copyMonth(userId: string, fromMonth: string, toMonth: string) {
    let created = 0;
    for (const source of await this.listForMonth(userId, fromMonth)) {
      const exists = this.rows.some(
        (row) =>
          row.userId === userId && row.categoryId === source.categoryId && row.month === toMonth,
      );
      if (!exists) {
        await this.upsert(userId, source.categoryId, toMonth, source.amountLimit.toNumber());
        created += 1;
      }
    }
    return created;
  }
}

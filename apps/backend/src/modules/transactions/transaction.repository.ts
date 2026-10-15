import type { Category, Prisma, PrismaClient, Transaction } from "@prisma/client";
import type { TransactionStatus, TransactionType } from "@budgetmail/shared-types";

export interface NewGmailTransaction {
  userId: string;
  gmailMessageId: string;
  merchant: string;
  amount: number;
  type: "income" | "expense";
  categoryId: string;
  transactionDate: Date;
  confidenceScore: number;
  status: "confirmed" | "pending_review";
  rawSnippet: string | null;
}

export interface NewManualTransaction {
  userId: string;
  merchant: string;
  amount: number;
  type: TransactionType;
  categoryId: string | null;
  transactionDate: Date;
}

export interface TransactionPatch {
  merchant?: string;
  amount?: number;
  type?: TransactionType;
  categoryId?: string | null;
  transactionDate?: Date;
  status?: TransactionStatus;
  rawSnippet?: string | null;
}

export interface TransactionListFilter {
  from: Date;
  to: Date;
  statuses: TransactionStatus[];
  categoryId?: string;
  type?: TransactionType;
}

export interface CategoryTotal {
  categoryId: string | null;
  type: TransactionType;
  total: number;
  count: number;
}

export type TransactionWithCategory = Transaction & { category: Category | null };

export interface TransactionRepository {
  findByGmailMessageId(gmailMessageId: string): Promise<Transaction | null>;
  existingGmailMessageIds(gmailMessageIds: string[]): Promise<Set<string>>;
  // Returns null when another job already inserted the same gmail_message_id
  // (unique-constraint race between concurrent parsing jobs).
  createFromGmail(data: NewGmailTransaction): Promise<Transaction | null>;
  createManual(data: NewManualTransaction): Promise<TransactionWithCategory>;
  // Newest first. cursor is the id of the last row of the previous page.
  list(
    userId: string,
    filter: TransactionListFilter,
    page: { cursor?: string; limit: number },
  ): Promise<TransactionWithCategory[]>;
  findOwned(userId: string, id: string): Promise<TransactionWithCategory | null>;
  update(id: string, patch: TransactionPatch): Promise<TransactionWithCategory>;
  delete(id: string): Promise<void>;
  // Confirmed transactions only, summed per category and type, in [from, to).
  totalsByCategory(userId: string, from: Date, to: Date): Promise<CategoryTotal[]>;
  countByStatus(userId: string, from: Date, to: Date, status: TransactionStatus): Promise<number>;
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}

const withCategory = { category: true } as const;

export class PrismaTransactionRepository implements TransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByGmailMessageId(gmailMessageId: string): Promise<Transaction | null> {
    return this.prisma.transaction.findUnique({ where: { gmailMessageId } });
  }

  async existingGmailMessageIds(gmailMessageIds: string[]): Promise<Set<string>> {
    const existing = await this.prisma.transaction.findMany({
      where: { gmailMessageId: { in: gmailMessageIds } },
      select: { gmailMessageId: true },
    });
    return new Set(
      existing
        .map((transaction) => transaction.gmailMessageId)
        .filter((id): id is string => id !== null),
    );
  }

  async createFromGmail(data: NewGmailTransaction): Promise<Transaction | null> {
    try {
      return await this.prisma.transaction.create({ data: { ...data, source: "gmail" } });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        return null;
      }
      throw err;
    }
  }

  createManual(data: NewManualTransaction): Promise<TransactionWithCategory> {
    return this.prisma.transaction.create({
      data: { ...data, source: "manual", status: "confirmed", confidenceScore: null },
      include: withCategory,
    });
  }

  list(
    userId: string,
    filter: TransactionListFilter,
    page: { cursor?: string; limit: number },
  ): Promise<TransactionWithCategory[]> {
    const where: Prisma.TransactionWhereInput = {
      userId,
      transactionDate: { gte: filter.from, lt: filter.to },
      status: { in: filter.statuses },
      ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
      ...(filter.type ? { type: filter.type } : {}),
    };
    return this.prisma.transaction.findMany({
      where,
      include: withCategory,
      orderBy: [{ transactionDate: "desc" }, { id: "desc" }],
      take: page.limit,
      ...(page.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
    });
  }

  findOwned(userId: string, id: string): Promise<TransactionWithCategory | null> {
    return this.prisma.transaction.findFirst({ where: { id, userId }, include: withCategory });
  }

  update(id: string, patch: TransactionPatch): Promise<TransactionWithCategory> {
    return this.prisma.transaction.update({ where: { id }, data: patch, include: withCategory });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.transaction.delete({ where: { id } });
  }

  async totalsByCategory(userId: string, from: Date, to: Date): Promise<CategoryTotal[]> {
    const groups = await this.prisma.transaction.groupBy({
      by: ["categoryId", "type"],
      where: { userId, status: "confirmed", transactionDate: { gte: from, lt: to } },
      _sum: { amount: true },
      _count: { _all: true },
    });
    return groups.map((group) => ({
      categoryId: group.categoryId,
      type: group.type as TransactionType,
      total: group._sum.amount?.toNumber() ?? 0,
      count: group._count._all,
    }));
  }

  countByStatus(userId: string, from: Date, to: Date, status: TransactionStatus): Promise<number> {
    return this.prisma.transaction.count({
      where: { userId, status, transactionDate: { gte: from, lt: to } },
    });
  }
}

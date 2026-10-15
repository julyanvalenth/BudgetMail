import type { Budget, Category, PrismaClient } from "@prisma/client";

export type BudgetWithCategory = Budget & { category: Category };

export interface BudgetRepository {
  listForMonth(userId: string, month: string): Promise<BudgetWithCategory[]>;
  findOwned(userId: string, id: string): Promise<BudgetWithCategory | null>;
  // Overwrites the limit if the category already has a budget that month.
  upsert(
    userId: string,
    categoryId: string,
    month: string,
    amountLimit: number,
  ): Promise<BudgetWithCategory>;
  delete(id: string): Promise<void>;
  // Skips categories that already have a budget in toMonth. Returns how many it created.
  copyMonth(userId: string, fromMonth: string, toMonth: string): Promise<number>;
}

const withCategory = { category: true } as const;

export class PrismaBudgetRepository implements BudgetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listForMonth(userId: string, month: string): Promise<BudgetWithCategory[]> {
    return this.prisma.budget.findMany({
      where: { userId, month },
      include: withCategory,
      orderBy: { category: { name: "asc" } },
    });
  }

  findOwned(userId: string, id: string): Promise<BudgetWithCategory | null> {
    return this.prisma.budget.findFirst({ where: { id, userId }, include: withCategory });
  }

  upsert(
    userId: string,
    categoryId: string,
    month: string,
    amountLimit: number,
  ): Promise<BudgetWithCategory> {
    return this.prisma.budget.upsert({
      where: { userId_categoryId_month: { userId, categoryId, month } },
      update: { amountLimit },
      create: { userId, categoryId, month, amountLimit },
      include: withCategory,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.budget.delete({ where: { id } });
  }

  async copyMonth(userId: string, fromMonth: string, toMonth: string): Promise<number> {
    const source = await this.prisma.budget.findMany({ where: { userId, month: fromMonth } });
    const { count } = await this.prisma.budget.createMany({
      data: source.map((budget) => ({
        userId,
        categoryId: budget.categoryId,
        month: toMonth,
        amountLimit: budget.amountLimit,
      })),
      skipDuplicates: true,
    });
    return count;
  }
}

import type {
  BudgetProgressDto,
  CopyBudgetsInput,
  UpsertBudgetInput,
} from "@budgetmail/shared-types";
import { BadRequestError, NotFoundError } from "../../shared/errors.js";
import { monthRange } from "../../shared/month.js";
import type { CategoryRepository } from "../categories/index.js";
import type { CategoryTotal, TransactionRepository } from "../transactions/index.js";
import type { BudgetRepository } from "./budget.repository.js";
import { computeBudgetProgress } from "./budgetProgress.js";

export interface BudgetServiceDeps {
  budgets: BudgetRepository;
  categories: CategoryRepository;
  transactions: TransactionRepository;
}

export class BudgetService {
  constructor(private readonly deps: BudgetServiceDeps) {}

  async listProgress(userId: string, month: string): Promise<BudgetProgressDto[]> {
    const { from, to } = monthRange(month);
    const [budgets, totals] = await Promise.all([
      this.deps.budgets.listForMonth(userId, month),
      this.deps.transactions.totalsByCategory(userId, from, to),
    ]);
    return computeBudgetProgress(budgets, expenseTotalsByCategory(totals));
  }

  async upsert(userId: string, input: UpsertBudgetInput): Promise<BudgetProgressDto> {
    const category = await this.deps.categories.findAccessible(userId, input.categoryId);
    if (!category) {
      throw new BadRequestError("Kategori tidak ditemukan");
    }
    if (category.type !== "expense") {
      throw new BadRequestError("Budget hanya bisa diset untuk kategori pengeluaran");
    }
    const budget = await this.deps.budgets.upsert(
      userId,
      category.id,
      input.month,
      input.amountLimit,
    );
    const progress = await this.listProgress(userId, input.month);
    return progress.find((item) => item.id === budget.id)!;
  }

  async remove(userId: string, id: string): Promise<void> {
    const budget = await this.deps.budgets.findOwned(userId, id);
    if (!budget) {
      throw new NotFoundError("Budget tidak ditemukan");
    }
    await this.deps.budgets.delete(budget.id);
  }

  async copy(userId: string, input: CopyBudgetsInput): Promise<{ created: number }> {
    if (input.fromMonth === input.toMonth) {
      throw new BadRequestError("Bulan asal dan tujuan tidak boleh sama");
    }
    const created = await this.deps.budgets.copyMonth(userId, input.fromMonth, input.toMonth);
    return { created };
  }
}

export function expenseTotalsByCategory(totals: CategoryTotal[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const total of totals) {
    if (total.type === "expense" && total.categoryId) {
      map.set(total.categoryId, (map.get(total.categoryId) ?? 0) + total.total);
    }
  }
  return map;
}

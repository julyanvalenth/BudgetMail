import type { CategoryBreakdownItem, DashboardSummaryDto } from "@budgetmail/shared-types";
import { monthRange } from "../../shared/month.js";
import {
  computeBudgetProgress,
  expenseTotalsByCategory,
  type BudgetRepository,
} from "../budgets/index.js";
import { toCategoryDto, type CategoryRepository } from "../categories/index.js";
import type { TransactionRepository } from "../transactions/index.js";

export interface DashboardServiceDeps {
  transactions: TransactionRepository;
  categories: CategoryRepository;
  budgets: BudgetRepository;
}

export class DashboardService {
  constructor(private readonly deps: DashboardServiceDeps) {}

  // Only confirmed transactions count. Pending ones come back as a count to review.
  async summary(userId: string, month: string): Promise<DashboardSummaryDto> {
    const { transactions, categories, budgets } = this.deps;
    const { from, to } = monthRange(month);

    const [totals, userCategories, monthBudgets, pendingReviewCount] = await Promise.all([
      transactions.totalsByCategory(userId, from, to),
      categories.listForUser(userId),
      budgets.listForMonth(userId, month),
      transactions.countByStatus(userId, from, to, "pending_review"),
    ]);

    const categoryById = new Map(userCategories.map((category) => [category.id, category]));
    let totalIncome = 0;
    let totalExpense = 0;
    const expenseGroups = new Map<string | null, { total: number; count: number }>();

    for (const row of totals) {
      if (row.type === "income") {
        totalIncome += row.total;
        continue;
      }
      totalExpense += row.total;
      // Shouldn't happen, but a category the user can't see counts as uncategorized.
      const key = row.categoryId && categoryById.has(row.categoryId) ? row.categoryId : null;
      const group = expenseGroups.get(key) ?? { total: 0, count: 0 };
      group.total += row.total;
      group.count += row.count;
      expenseGroups.set(key, group);
    }

    const expenseByCategory: CategoryBreakdownItem[] = [...expenseGroups.entries()]
      .map(([categoryId, group]) => {
        const category = categoryId ? categoryById.get(categoryId) : undefined;
        return {
          category: category ? toCategoryDto(category) : null,
          total: group.total,
          count: group.count,
          share: totalExpense > 0 ? group.total / totalExpense : 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    return {
      month,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      expenseByCategory,
      pendingReviewCount,
      budgets: computeBudgetProgress(monthBudgets, expenseTotalsByCategory(totals)),
    };
  }
}

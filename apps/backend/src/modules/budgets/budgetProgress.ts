import type { BudgetProgressDto, BudgetState } from "@budgetmail/shared-types";
import { toCategoryDto } from "../categories/index.js";
import type { BudgetWithCategory } from "./budget.repository.js";

export const BUDGET_WARNING_RATIO = 0.8;

export function budgetState(ratio: number): BudgetState {
  if (ratio > 1) return "over";
  if (ratio >= BUDGET_WARNING_RATIO) return "warning";
  return "ok";
}

// spentByCategory maps a category id to its confirmed expense total.
export function computeBudgetProgress(
  budgets: BudgetWithCategory[],
  spentByCategory: Map<string, number>,
): BudgetProgressDto[] {
  return budgets.map((budget) => {
    const limit = budget.amountLimit.toNumber();
    const spent = spentByCategory.get(budget.categoryId) ?? 0;
    const ratio = limit > 0 ? spent / limit : 0;
    return {
      id: budget.id,
      month: budget.month,
      category: toCategoryDto(budget.category),
      limit,
      spent,
      remaining: limit - spent,
      ratio,
      state: budgetState(ratio),
    };
  });
}

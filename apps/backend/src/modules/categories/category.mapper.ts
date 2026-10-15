import type { Category } from "@prisma/client";
import type { CategoryDto, CategoryType } from "@budgetmail/shared-types";

export function toCategoryDto(category: Category): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    icon: category.icon,
    type: category.type as CategoryType,
    isDefault: category.userId === null,
  };
}

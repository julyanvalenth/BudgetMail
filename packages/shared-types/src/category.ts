export type CategoryType = "income" | "expense";

export interface Category {
  id: string;
  userId: string | null; // null = default/global category
  name: string;
  icon: string;
  type: CategoryType;
}

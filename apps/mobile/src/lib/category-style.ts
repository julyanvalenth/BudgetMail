import {
  ArrowDownLeft,
  Banknote,
  Briefcase,
  Car,
  CircleEllipsis,
  Clapperboard,
  Coffee,
  CreditCard,
  Fuel,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  Landmark,
  Plane,
  Receipt,
  Shirt,
  ShoppingBag,
  Smartphone,
  Tag,
  Utensils,
  Wallet,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import type { CategoryDto } from "@budgetmail/shared-types";

import { categoryNeutral, categoryPalette } from "@/theme/tokens";

// The backend stores lucide icon names. Unknown ones fall back to a tag.
const ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  "shopping-bag": ShoppingBag,
  receipt: Receipt,
  clapperboard: Clapperboard,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  "circle-ellipsis": CircleEllipsis,
  wallet: Wallet,
  "arrow-down-left": ArrowDownLeft,
  tag: Tag,
  coffee: Coffee,
  gift: Gift,
  plane: Plane,
  smartphone: Smartphone,
  shirt: Shirt,
  fuel: Fuel,
  wifi: Wifi,
  zap: Zap,
  briefcase: Briefcase,
  landmark: Landmark,
  "hand-coins": HandCoins,
  banknote: Banknote,
  "credit-card": CreditCard,
};

// Icons offered when creating a custom category
export const CUSTOM_CATEGORY_ICONS = [
  "tag",
  "coffee",
  "gift",
  "plane",
  "smartphone",
  "shirt",
  "fuel",
  "wifi",
  "zap",
  "briefcase",
  "landmark",
  "hand-coins",
  "banknote",
  "credit-card",
] as const;

export function categoryIcon(icon: string | undefined): LucideIcon {
  return (icon && ICONS[icon]) || Tag;
}

// Defaults get fixed colors and custom categories hash onto the palette, so a
// category keeps its color. It never depends on rank in a chart.
const DEFAULT_SLOTS: Record<string, number> = {
  "default-expense-transport": 0,
  "default-expense-makanan": 1,
  "default-expense-kesehatan": 2,
  "default-expense-tagihan": 3,
  "default-expense-belanja": 4,
  "default-expense-hiburan": 5,
  "default-expense-pendidikan": 0,
  "default-income-gaji": 2,
  "default-income-transfer": 0,
};

export function categoryColor(
  category: Pick<CategoryDto, "id" | "name"> | null | undefined,
): string {
  if (!category || category.name === "Lainnya") return categoryNeutral;
  const slot = DEFAULT_SLOTS[category.id] ?? hash(category.id) % categoryPalette.length;
  return categoryPalette[slot] ?? categoryNeutral;
}

function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index++) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
}

export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

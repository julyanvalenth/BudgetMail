import type { TransactionType } from "@budgetmail/shared-types";

import { AppText, type AppTextProps } from "@/components/ui/app-text";
import { formatRupiah } from "@/lib/format";

export interface AmountProps extends Omit<AppTextProps, "children" | "tone"> {
  value: number;
  // With a type, the amount gets a +/− sign and the income/expense color. The sign
  // keeps the direction readable without color.
  type?: TransactionType;
  tone?: AppTextProps["tone"];
}

export function Amount({ value, type, variant = "amountList", tone, ...rest }: AmountProps) {
  const sign = type === "income" ? "+" : type === "expense" ? "−" : "";
  const resolvedTone =
    tone ?? (type === "income" ? "income" : type === "expense" ? "expense" : "primary");
  const text = `${sign}${formatRupiah(type ? Math.abs(value) : value)}`;
  const spoken = `${type === "income" ? "pemasukan " : type === "expense" ? "pengeluaran " : ""}${formatRupiah(value)}`;
  return (
    <AppText variant={variant} tone={resolvedTone} accessibilityLabel={spoken} {...rest}>
      {text}
    </AppText>
  );
}

import { Text, type TextProps } from "react-native";

import { colors, typography, type TypographyVariant } from "@/theme/tokens";

export type TextTone =
  | "primary"
  | "muted"
  | "brand"
  | "violet"
  | "income"
  | "expense"
  | "warning"
  | "danger"
  | "onBrand";

const TONES: Record<TextTone, string> = {
  primary: colors.textPrimary,
  muted: colors.textMuted,
  brand: colors.brandTeal,
  violet: colors.brandViolet,
  income: colors.signalIncome,
  expense: colors.signalExpense,
  warning: colors.signalWarning,
  danger: colors.signalDanger,
  onBrand: colors.textOnBrand,
};

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
  align?: "left" | "center" | "right";
}

// Use this instead of Text so every string sits on the type scale.
export function AppText({
  variant = "body",
  tone = "primary",
  align,
  style,
  ...rest
}: AppTextProps) {
  return (
    <Text
      // Larger system text is allowed, but capped so amounts don't break layouts
      maxFontSizeMultiplier={1.6}
      style={[typography[variant], { color: TONES[tone] }, align && { textAlign: align }, style]}
      {...rest}
    />
  );
}

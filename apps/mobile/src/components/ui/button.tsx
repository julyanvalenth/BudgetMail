import type { LucideIcon } from "lucide-react-native";
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { PressableScale } from "@/components/ui/pressable-scale";
import { colors, iconSize, iconStroke, layout, radius, spacing } from "@/theme/tokens";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  // Full pill, for CTAs like "Set Budget"
  pill?: boolean;
  size?: "md" | "sm";
  fullWidth?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

const VARIANTS: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.brandTeal, fg: colors.textOnBrand, border: colors.brandTeal },
  secondary: { bg: colors.bgSurface, fg: colors.textPrimary, border: colors.borderStrong },
  ghost: { bg: colors.transparent, fg: colors.brandTeal, border: colors.transparent },
  danger: { bg: colors.tintDanger, fg: colors.signalDanger, border: colors.transparent },
};

export function Button({
  label,
  onPress,
  variant = "primary",
  icon: Icon,
  loading = false,
  disabled = false,
  pill = false,
  size = "md",
  fullWidth = false,
  accessibilityHint,
  style,
}: ButtonProps) {
  const palette = VARIANTS[variant];
  const isDisabled = disabled || loading;

  return (
    <PressableScale
      haptic={variant === "primary"}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.base,
        size === "sm" && styles.small,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderRadius: pill ? radius.pill : radius.button,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {/* The spinner overlays the label so the button keeps its size */}
      <View style={[styles.content, loading && styles.hidden]}>
        {Icon && <Icon size={iconSize.md} color={palette.fg} strokeWidth={iconStroke} />}
        <AppText
          variant={size === "sm" ? "bodySmallStrong" : "bodyStrong"}
          style={{ color: palette.fg }}
        >
          {label}
        </AppText>
      </View>
      {loading && <ActivityIndicator style={StyleSheet.absoluteFill} color={palette.fg} />}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.touchTarget + spacing.one,
    paddingHorizontal: spacing.five,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: layout.hairline,
  },
  small: {
    minHeight: layout.touchTarget,
    paddingHorizontal: spacing.four,
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.two,
  },
  hidden: {
    opacity: 0,
  },
});

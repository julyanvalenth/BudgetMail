import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { PressableScale } from "@/components/ui/pressable-scale";
import { colors, iconSize, iconStroke, layout, radius } from "@/theme/tokens";

export interface IconButtonProps {
  icon: LucideIcon;
  // Required: there's no visible text for screen readers to fall back on
  label: string;
  onPress?: () => void;
  variant?: "surface" | "plain" | "brand";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon: Icon,
  label,
  onPress,
  variant = "surface",
  disabled,
  style,
}: IconButtonProps) {
  const fg = variant === "brand" ? colors.textOnBrand : colors.textPrimary;
  return (
    <PressableScale
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={[styles.base, styles[variant], style]}
    >
      <Icon size={iconSize.md} color={fg} strokeWidth={iconStroke} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  surface: {
    backgroundColor: colors.bgSurface,
    borderWidth: layout.hairline,
    borderColor: colors.borderHairline,
  },
  plain: {
    backgroundColor: colors.transparent,
  },
  brand: {
    backgroundColor: colors.brandTeal,
  },
});

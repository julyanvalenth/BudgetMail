import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { AppText, type TextTone } from "@/components/ui/app-text";
import { colors, iconSize, iconStroke, radius, spacing } from "@/theme/tokens";

type BadgeTone = "warning" | "brand" | "danger" | "neutral";

const TONES: Record<BadgeTone, { bg: string; fg: string; text: TextTone }> = {
  warning: { bg: colors.tintWarning, fg: colors.signalWarning, text: "warning" },
  brand: { bg: colors.tintBrand, fg: colors.brandTeal, text: "brand" },
  danger: { bg: colors.tintDanger, fg: colors.signalDanger, text: "danger" },
  neutral: { bg: colors.bgRaised, fg: colors.textMuted, text: "muted" },
};

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: LucideIcon;
}

export function Badge({ label, tone = "neutral", icon: Icon }: BadgeProps) {
  const palette = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      {Icon && <Icon size={iconSize.xs} color={palette.fg} strokeWidth={iconStroke + 0.25} />}
      <AppText variant="caption" tone={palette.text}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.one,
    paddingHorizontal: spacing.two,
    paddingVertical: spacing.half,
    borderRadius: radius.pill,
  },
});

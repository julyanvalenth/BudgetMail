import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { colors, iconSize, iconStroke, layout, radius, spacing } from "@/theme/tokens";

type NoticeTone = "brand" | "warning" | "danger";

const TONES: Record<NoticeTone, { bg: string; fg: string; border: string }> = {
  brand: { bg: colors.tintBrand, fg: colors.brandTeal, border: colors.borderHairline },
  warning: { bg: colors.tintWarning, fg: colors.signalWarning, border: colors.borderHairline },
  danger: { bg: colors.tintDanger, fg: colors.signalDanger, border: colors.borderHairline },
};

export interface NoticeProps {
  icon: LucideIcon;
  title: string;
  body?: string;
  tone?: NoticeTone;
  actionLabel?: string;
  onAction?: () => void;
  actionLoading?: boolean;
}

export function Notice({
  icon: Icon,
  title,
  body,
  tone = "brand",
  actionLabel,
  onAction,
  actionLoading,
}: NoticeProps) {
  const palette = TONES[tone];
  return (
    <View
      accessibilityRole="summary"
      style={[styles.container, { backgroundColor: palette.bg, borderColor: palette.border }]}
    >
      <View style={styles.row}>
        <Icon size={iconSize.md} color={palette.fg} strokeWidth={iconStroke} />
        <View style={styles.text}>
          <AppText variant="bodySmallStrong">{title}</AppText>
          {body && (
            <AppText variant="bodySmall" tone="muted">
              {body}
            </AppText>
          )}
        </View>
      </View>
      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          loading={actionLoading}
          variant={tone === "brand" ? "primary" : "secondary"}
          size="sm"
          style={styles.action}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.card,
    borderWidth: layout.hairline,
    padding: spacing.four,
    gap: spacing.three,
  },
  row: {
    flexDirection: "row",
    gap: spacing.three,
    alignItems: "flex-start",
  },
  text: {
    flex: 1,
    gap: spacing.half,
  },
  action: {
    alignSelf: "flex-start",
    marginLeft: iconSize.md + spacing.three,
  },
});

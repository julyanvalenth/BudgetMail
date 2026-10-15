import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { colors, iconSize, iconStroke, layout, radius, spacing } from "@/theme/tokens";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
  tone?: "brand" | "danger";
}

export function EmptyState({ icon: Icon, title, body, action, tone = "brand" }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.ring, tone === "danger" && styles.ringDanger]}>
        <Icon
          size={iconSize.lg}
          color={tone === "danger" ? colors.signalDanger : colors.brandTeal}
          strokeWidth={iconStroke}
        />
      </View>
      <View style={styles.text}>
        <AppText variant="h2" align="center">
          {title}
        </AppText>
        <AppText variant="bodySmall" tone="muted" align="center" style={styles.body}>
          {body}
        </AppText>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: spacing.ten,
    paddingHorizontal: spacing.six,
    gap: spacing.five,
  },
  ring: {
    width: layout.touchTarget + spacing.four,
    height: layout.touchTarget + spacing.four,
    borderRadius: radius.pill,
    backgroundColor: colors.tintBrand,
    borderWidth: layout.hairline,
    borderColor: colors.borderHairline,
    alignItems: "center",
    justifyContent: "center",
  },
  ringDanger: {
    backgroundColor: colors.tintDanger,
  },
  text: {
    gap: spacing.two,
    alignItems: "center",
  },
  body: {
    maxWidth: 300,
  },
});

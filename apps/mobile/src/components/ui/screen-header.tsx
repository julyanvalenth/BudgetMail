import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { spacing } from "@/theme/tokens";

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function ScreenHeader({ title, subtitle, right }: ScreenHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        {subtitle && (
          <AppText variant="bodySmall" tone="muted">
            {subtitle}
          </AppText>
        )}
        <AppText variant="h1" accessibilityRole="header">
          {title}
        </AppText>
      </View>
      {right && <View style={styles.right}>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.three,
  },
  text: {
    flex: 1,
    gap: spacing.half,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.two,
  },
});

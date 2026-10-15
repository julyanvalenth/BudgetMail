import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { PressableScale } from "@/components/ui/pressable-scale";
import { layout, spacing } from "@/theme/tokens";

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <AppText variant="h2" accessibilityRole="header">
        {title}
      </AppText>
      {actionLabel && onAction && (
        <PressableScale onPress={onAction} accessibilityLabel={actionLabel} style={styles.action}>
          <AppText variant="bodySmallStrong" tone="brand">
            {actionLabel}
          </AppText>
        </PressableScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: layout.touchTarget,
  },
  action: {
    minHeight: layout.touchTarget,
    justifyContent: "center",
    paddingLeft: spacing.three,
  },
});

import { StyleSheet } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { PressableScale } from "@/components/ui/pressable-scale";
import { colors, layout, radius, spacing } from "@/theme/tokens";

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  count?: number;
}

// The selected state uses fill, border and weight, not just color.
export function Chip({ label, selected, onPress, count }: ChipProps) {
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={count ? `${label}, ${count}` : label}
      onPress={onPress}
      scaleTo={0.96}
      style={[styles.chip, selected ? styles.selected : styles.idle]}
    >
      <AppText
        variant={selected ? "bodySmallStrong" : "bodySmall"}
        tone={selected ? "primary" : "muted"}
      >
        {label}
      </AppText>
      {count !== undefined && count > 0 && (
        <AppText variant="caption" tone={selected ? "brand" : "muted"} style={styles.count}>
          {count}
        </AppText>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: layout.touchTarget,
    paddingHorizontal: spacing.four,
    borderRadius: radius.pill,
    borderWidth: layout.hairline,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.two,
  },
  idle: {
    backgroundColor: colors.transparent,
    borderColor: colors.borderStrong,
  },
  selected: {
    backgroundColor: colors.tintBrand,
    borderColor: colors.brandTeal,
  },
  count: {
    fontVariant: ["tabular-nums"],
  },
});

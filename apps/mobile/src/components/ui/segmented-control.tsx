import { StyleSheet, View } from "react-native";

import { AppText, type TextTone } from "@/components/ui/app-text";
import { PressableScale } from "@/components/ui/pressable-scale";
import { colors, layout, radius, spacing } from "@/theme/tokens";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  tone?: TextTone;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={styles.track}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <PressableScale
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            haptic
            scaleTo={0.98}
            style={[styles.segment, selected && styles.selected]}
          >
            <AppText
              variant={selected ? "bodySmallStrong" : "bodySmall"}
              tone={selected ? (option.tone ?? "primary") : "muted"}
            >
              {option.label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: colors.bgRaised,
    borderRadius: radius.pill,
    padding: spacing.one,
    gap: spacing.one,
  },
  segment: {
    flex: 1,
    minHeight: layout.touchTarget,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  selected: {
    backgroundColor: colors.bgSurface,
    borderWidth: layout.hairline,
    borderColor: colors.borderStrong,
  },
});

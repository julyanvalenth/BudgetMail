import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors, layout, motion, radius } from "@/theme/tokens";

export interface ProgressBarProps {
  // spent / limit, can go above 1
  ratio: number;
  accessibilityLabel: string;
  height?: number;
}

// The color moves gradually from teal to warning to danger as usage grows, and the
// fill animates in unless reduce motion is on.
export function ProgressBar({
  ratio,
  accessibilityLabel,
  height = layout.progressHeight,
}: ProgressBarProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? ratio : 0);

  useEffect(() => {
    progress.value = reduceMotion
      ? ratio
      : withTiming(ratio, { duration: motion.slow * 2, easing: Easing.out(Easing.quad) });
  }, [ratio, reduceMotion, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.min(progress.value, 1) * 100}%`,
    backgroundColor: interpolateColor(
      progress.value,
      [0, 0.7, 0.8, 1, 1.01],
      [
        colors.brandTeal,
        colors.brandTeal,
        colors.signalWarning,
        colors.signalWarning,
        colors.signalDanger,
      ],
    ),
  }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(ratio, 1) * 100) }}
      style={[styles.track, { height }]}
    >
      <Animated.View style={[styles.fill, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.bgRaised,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radius.pill,
  },
});

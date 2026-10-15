import { useEffect } from "react";
import {
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { colors, layout, motion, radius, spacing } from "@/theme/tokens";

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  rounded?: number;
  style?: StyleProp<ViewStyle>;
}

// Pulses slowly; static with reduce motion on.
export function Skeleton({
  width = "100%",
  height = spacing.four,
  rounded = radius.sm,
  style,
}: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withRepeat(
      withTiming(1, { duration: motion.shimmer, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [reduceMotion, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: 0.5 + pulse.value * 0.5 }));

  return (
    <Animated.View
      style={[styles.block, { width, height, borderRadius: rounded }, animatedStyle, style]}
    />
  );
}

export function TransactionRowSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton width={layout.categoryIcon} height={layout.categoryIcon} rounded={radius.pill} />
      <View style={styles.rowText}>
        <Skeleton width="60%" height={spacing.four} />
        <Skeleton width="35%" height={spacing.three} />
      </View>
      <Skeleton width={72} height={spacing.four} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.bgRaised,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.three,
    paddingVertical: spacing.three,
  },
  rowText: {
    flex: 1,
    gap: spacing.two,
  },
});

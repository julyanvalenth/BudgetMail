import { LinearGradient } from "expo-linear-gradient";
import { Mail } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { BrandMark } from "@/components/brand/brand-mark";
import {
  colors,
  gradients,
  iconSize,
  iconStroke,
  layout,
  motion,
  radius,
  spacing,
} from "@/theme/tokens";

export interface InflowLineProps {
  size?: "md" | "lg";
  // false plays the light once instead of looping
  loop?: boolean;
}

// The Inflow line from Design.md §4: a light travels from the Gmail node into the
// app mark. With reduce motion on, the whole line is lit and nothing moves.
export function InflowLine({ size = "lg", loop = true }: InflowLineProps) {
  const reduceMotion = useReducedMotion();
  const [trackWidth, setTrackWidth] = useState(0);
  const travel = useSharedValue(0);
  const node = size === "lg" ? layout.touchTarget + spacing.four : layout.touchTarget;

  useEffect(() => {
    if (reduceMotion || trackWidth === 0) return;
    const run = withTiming(1, { duration: motion.inflow * 4, easing: Easing.inOut(Easing.cubic) });
    travel.value = 0;
    travel.value = loop ? withRepeat(withDelay(motion.slow, run), -1, false) : run;
  }, [reduceMotion, trackWidth, loop, travel]);

  const segmentWidth = trackWidth * 0.45;
  const segmentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -segmentWidth + travel.value * (trackWidth + segmentWidth) }],
  }));

  return (
    <View
      accessible
      accessibilityLabel="Email notifikasi transaksi dari Gmail mengalir otomatis ke BudgetMail"
      style={styles.row}
    >
      <View style={[styles.gmailNode, { width: node, height: node }]}>
        <Mail
          size={size === "lg" ? iconSize.lg : iconSize.md}
          color={colors.textPrimary}
          strokeWidth={iconStroke}
        />
      </View>

      <View
        style={styles.track}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      >
        <View style={styles.trackBase} />
        {reduceMotion ? (
          <LinearGradient
            colors={gradients.inflow}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <Animated.View style={[styles.segment, { width: segmentWidth }, segmentStyle]}>
            <LinearGradient
              colors={[colors.transparent, gradients.inflow[0], gradients.inflow[1]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}
      </View>

      <BrandMark size={node} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.three,
  },
  gmailNode: {
    borderRadius: radius.pill,
    backgroundColor: colors.bgSurface,
    borderWidth: layout.hairline,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  track: {
    flex: 1,
    height: layout.lineWeight,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  trackBase: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.borderStrong,
  },
  segment: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
  },
});

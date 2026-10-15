import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { colors, gradients, layout, motion } from "@/theme/tokens";

export interface SyncPulseProps {
  active: boolean;
}

// Gradient sweep along the top edge while a sync or refetch runs. With reduce
// motion on it's a static gradient line.
export function SyncPulse({ active }: SyncPulseProps) {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (!active || reduceMotion) return;
    sweep.value = 0;
    sweep.value = withRepeat(
      withTiming(1, { duration: motion.shimmer, easing: Easing.inOut(Easing.cubic) }),
      -1,
      false,
    );
  }, [active, reduceMotion, sweep]);

  const segment = width * 0.4;
  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -segment + sweep.value * (width + segment) }],
  }));

  if (!active) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(motion.fast)}
      exiting={FadeOut.duration(motion.base)}
      accessibilityLabel="Sedang menyinkronkan"
      accessibilityRole="progressbar"
      style={styles.bar}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {reduceMotion ? (
        <LinearGradient
          colors={gradients.inflow}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <Animated.View style={[styles.segment, { width: segment }, sweepStyle]}>
          <LinearGradient
            colors={[
              colors.transparent,
              gradients.inflow[0],
              gradients.inflow[1],
              colors.transparent,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: layout.lineWeight,
    overflow: "hidden",
    backgroundColor: colors.borderHairline,
  },
  segment: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
  },
});

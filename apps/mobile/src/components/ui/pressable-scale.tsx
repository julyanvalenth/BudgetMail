import * as Haptics from "expo-haptics";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { motion, opacity } from "@/theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
  // Rows only dim; buttons also shrink a little.
  scaleTo?: number;
}

// Tap feedback through opacity and scale only, so layout never shifts. No scaling
// with reduce motion on.
export function PressableScale({
  style,
  haptic = false,
  scaleTo = 0.97,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...rest
}: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: disabled ? opacity.disabled : 1 - pressed.value * (1 - opacity.pressed),
    transform: [{ scale: reduceMotion ? 1 : 1 - pressed.value * (1 - scaleTo) }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPressIn={(event) => {
        pressed.value = withTiming(1, { duration: motion.fast });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressed.value = withTiming(0, { duration: motion.fast });
        onPressOut?.(event);
      }}
      onPress={(event) => {
        if (haptic) void Haptics.selectionAsync().catch(() => undefined);
        onPress?.(event);
      }}
      style={[style, animatedStyle]}
      {...rest}
    />
  );
}

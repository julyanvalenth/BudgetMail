import { useState, type ReactNode } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  withTiming,
} from "react-native-reanimated";

import { AppText } from "@/components/ui/app-text";
import { colors, fonts, layout, motion, radius, spacing, typography } from "@/theme/tokens";

export interface TextFieldProps extends Omit<TextInputProps, "style" | "placeholder"> {
  label: string;
  error?: string | null;
  trailing?: ReactNode;
}

const LABEL_REST = typography.body.fontSize;
const LABEL_FLOAT = typography.caption.fontSize;

// The label sits inside the empty field and moves up on focus or once there's a value.
export function TextField({
  label,
  error,
  trailing,
  value,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const reduceMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const floated = focused || (value !== undefined && value !== "");

  const progress = useDerivedValue(() =>
    reduceMotion ? (floated ? 1 : 0) : withTiming(floated ? 1 : 0, { duration: motion.fast }),
  );

  const labelStyle = useAnimatedStyle(() => ({
    top: spacing.four + (1 - progress.value) * spacing.two,
    fontSize: LABEL_REST - progress.value * (LABEL_REST - LABEL_FLOAT),
  }));

  return (
    <View style={styles.wrapper}>
      <View style={[styles.field, focused && styles.fieldFocused, !!error && styles.fieldError]}>
        <Animated.Text
          numberOfLines={1}
          style={[
            styles.label,
            { color: focused ? colors.brandTeal : colors.textMuted },
            labelStyle,
          ]}
        >
          {label}
        </Animated.Text>
        <TextInput
          accessibilityLabel={label}
          value={value}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.brandTeal}
          cursorColor={colors.brandTeal}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={styles.input}
          {...rest}
        />
        {trailing && <View style={styles.trailing}>{trailing}</View>}
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.one,
  },
  field: {
    minHeight: layout.touchTarget + spacing.five,
    backgroundColor: colors.bgRaised,
    borderRadius: radius.input,
    borderWidth: layout.hairline,
    borderColor: colors.borderHairline,
    paddingHorizontal: spacing.four,
    justifyContent: "flex-end",
  },
  fieldFocused: {
    borderColor: colors.brandTeal,
  },
  fieldError: {
    borderColor: colors.signalDanger,
  },
  label: {
    position: "absolute",
    left: spacing.four,
    right: spacing.four,
    fontFamily: fonts.bodyMedium,
  },
  input: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    paddingTop: spacing.six,
    paddingBottom: spacing.three,
    paddingRight: spacing.eight,
    // The border already shows focus, so drop the web outline
    outlineWidth: 0,
  },
  trailing: {
    position: "absolute",
    right: spacing.three,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
});

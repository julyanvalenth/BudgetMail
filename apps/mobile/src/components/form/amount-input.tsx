import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AppText, type TextTone } from "@/components/ui/app-text";
import { groupThousands, parseAmountInput } from "@/lib/format";
import { colors, spacing, typography } from "@/theme/tokens";

export interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  tone?: TextTone;
  error?: string | null;
  autoFocus?: boolean;
}

const TONE_COLORS: Partial<Record<TextTone, string>> = {
  income: colors.signalIncome,
  expense: colors.signalExpense,
  primary: colors.textPrimary,
};

// Room for the caret after the last digit
const CARET_ALLOWANCE = spacing.one;

// The input is sized to an invisible copy of its text, so "Rp" and the amount stay
// centered together. Its intrinsic width differs per platform.
export function AmountInput({
  value,
  onChange,
  label,
  tone = "primary",
  error,
  autoFocus,
}: AmountInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [textWidth, setTextWidth] = useState(0);
  const color = TONE_COLORS[tone] ?? colors.textPrimary;
  const display = value ? groupThousands(value) : "";

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      accessible={false}
      style={styles.container}
    >
      <AppText variant="caption" tone="muted" align="center">
        {label}
      </AppText>
      <View style={styles.row}>
        <AppText variant="h1" style={{ color }}>
          Rp
        </AppText>
        <Text
          aria-hidden
          style={[styles.input, styles.measure]}
          onLayout={(event) => setTextWidth(event.nativeEvent.layout.width)}
        >
          {display || "0"}
        </Text>
        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          value={display}
          onChangeText={(text) => onChange(parseAmountInput(text))}
          keyboardType="number-pad"
          inputMode="numeric"
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.brandTeal}
          cursorColor={colors.brandTeal}
          autoFocus={autoFocus}
          maxLength={17}
          style={[styles.input, { color, width: textWidth + CARET_ALLOWANCE }]}
        />
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" align="center" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.one,
    paddingVertical: spacing.four,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    gap: spacing.two,
  },
  input: {
    ...typography.amountInput,
    padding: 0,
    maxWidth: "85%",
    // No focus outline on web; the caret already shows focus
    outlineWidth: 0,
    outlineColor: colors.transparent,
  },
  measure: {
    position: "absolute",
    opacity: 0,
  },
});

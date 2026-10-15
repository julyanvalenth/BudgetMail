import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/icon-button";
import { formatMonth, shiftMonth } from "@/lib/format";
import { spacing } from "@/theme/tokens";

export interface MonthSelectorProps {
  month: string;
  onChange: (month: string) => void;
  // "YYYY-MM", so plain string comparison works
  maxMonth?: string;
}

export function MonthSelector({ month, onChange, maxMonth }: MonthSelectorProps) {
  const next = shiftMonth(month, 1);
  const canGoNext = !maxMonth || next <= maxMonth;
  return (
    <View style={styles.row}>
      <IconButton
        icon={ChevronLeft}
        label={`Bulan sebelumnya, ${formatMonth(shiftMonth(month, -1))}`}
        variant="plain"
        onPress={() => onChange(shiftMonth(month, -1))}
      />
      <AppText
        variant="bodyStrong"
        align="center"
        accessibilityRole="header"
        accessibilityLiveRegion="polite"
        style={styles.label}
      >
        {formatMonth(month)}
      </AppText>
      <IconButton
        icon={ChevronRight}
        label={`Bulan berikutnya, ${formatMonth(next)}`}
        variant="plain"
        disabled={!canGoNext}
        onPress={() => onChange(next)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.one,
  },
  label: {
    minWidth: 132,
  },
});

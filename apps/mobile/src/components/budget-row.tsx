import type { BudgetProgressDto } from "@budgetmail/shared-types";
import { CircleAlert, CircleCheck, TriangleAlert, type LucideIcon } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { AppText, type TextTone } from "@/components/ui/app-text";
import { CategoryIcon } from "@/components/ui/category-icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatPercent, formatRupiah } from "@/lib/format";
import { colors, iconSize, iconStroke, spacing } from "@/theme/tokens";

const STATE: Record<
  BudgetProgressDto["state"],
  { icon: LucideIcon; tone: TextTone; color: string }
> = {
  ok: { icon: CircleCheck, tone: "muted", color: colors.textMuted },
  warning: { icon: TriangleAlert, tone: "warning", color: colors.signalWarning },
  over: { icon: CircleAlert, tone: "danger", color: colors.signalDanger },
};

function stateLabel(budget: BudgetProgressDto): string {
  if (budget.state === "over") return `Lewat ${formatRupiah(-budget.remaining)}`;
  return `Sisa ${formatRupiah(budget.remaining)}`;
}

export interface BudgetRowProps {
  budget: BudgetProgressDto;
  onPress?: (budget: BudgetProgressDto) => void;
}

// The state is shown by icon and text as well as the bar color.
export function BudgetRow({ budget, onPress }: BudgetRowProps) {
  const state = STATE[budget.state];
  const StateIcon = state.icon;
  const content = (
    <>
      <View style={styles.header}>
        <CategoryIcon category={budget.category} size="sm" />
        <AppText variant="bodyStrong" numberOfLines={1} style={styles.name}>
          {budget.category.name}
        </AppText>
        <AppText variant="amountSmall" tone="muted">
          {formatPercent(budget.ratio)}
        </AppText>
      </View>
      <ProgressBar
        ratio={budget.ratio}
        accessibilityLabel={`Budget ${budget.category.name} terpakai ${formatPercent(budget.ratio)}`}
      />
      <View style={styles.footer}>
        <AppText variant="caption" tone="muted" style={styles.numbers}>
          {formatRupiah(budget.spent)} dari {formatRupiah(budget.limit)}
        </AppText>
        <View style={styles.state}>
          <StateIcon size={iconSize.xs} color={state.color} strokeWidth={iconStroke + 0.25} />
          <AppText variant="caption" tone={state.tone} style={styles.numbers}>
            {stateLabel(budget)}
          </AppText>
        </View>
      </View>
    </>
  );

  if (!onPress) {
    return <View style={styles.container}>{content}</View>;
  }
  return (
    <PressableScale
      accessibilityHint="Ubah budget"
      onPress={() => onPress(budget)}
      scaleTo={0.99}
      style={styles.container}
    >
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.three,
    paddingVertical: spacing.three,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.three,
  },
  name: {
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.two,
  },
  state: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.one,
  },
  numbers: {
    fontVariant: ["tabular-nums"],
  },
});

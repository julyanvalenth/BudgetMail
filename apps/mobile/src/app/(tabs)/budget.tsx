import type { BudgetProgressDto } from "@budgetmail/shared-types";
import { useRouter } from "expo-router";
import { CloudOff, Copy, Plus, Target } from "lucide-react-native";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { errorMessage } from "@/api/client";
import { useBudgets, useCopyBudgets } from "@/api/queries";
import { BudgetRow } from "@/components/budget-row";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MonthSelector } from "@/components/ui/month-selector";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  currentMonthKey,
  formatMonth,
  formatPercent,
  formatRupiah,
  shiftMonth,
} from "@/lib/format";
import { colors, layout, radius, spacing } from "@/theme/tokens";

export default function BudgetScreen() {
  const router = useRouter();
  const [month, setMonth] = useState(currentMonthKey);
  const previousMonth = shiftMonth(month, -1);
  const budgets = useBudgets(month);
  const previous = useBudgets(previousMonth);
  const copyBudgets = useCopyBudgets();
  const [copyError, setCopyError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const items = [...(budgets.data ?? [])].sort((a, b) => b.ratio - a.ratio);
  const openEditor = (budget?: BudgetProgressDto) =>
    router.push({
      pathname: "/budget/edit",
      params: budget ? { month, categoryId: budget.category.id } : { month },
    });

  const copyFromPrevious = async () => {
    setCopyError(null);
    try {
      await copyBudgets.mutateAsync({ fromMonth: previousMonth, toMonth: month });
    } catch (err) {
      setCopyError(errorMessage(err));
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await budgets.refetch().finally(() => setRefreshing(false));
            }}
            tintColor={colors.brandTeal}
            colors={[colors.brandTeal]}
            progressBackgroundColor={colors.bgSurface}
          />
        }
      >
        <ScreenHeader
          title="Budget"
          right={
            <Button label="Set Budget" icon={Plus} pill size="sm" onPress={() => openEditor()} />
          }
        />
        <View style={styles.month}>
          {/* Allows planning one month ahead */}
          <MonthSelector
            month={month}
            onChange={setMonth}
            maxMonth={shiftMonth(currentMonthKey(), 1)}
          />
        </View>

        {budgets.isLoading ? (
          <View style={styles.list} accessibilityLabel="Memuat budget">
            <Skeleton height={120} rounded={radius.card} />
            <Skeleton height={240} rounded={radius.card} />
          </View>
        ) : budgets.isError ? (
          <EmptyState
            icon={CloudOff}
            tone="danger"
            title="Budget gagal dimuat"
            body="Periksa koneksimu, lalu coba lagi."
            action={
              <Button label="Coba lagi" variant="secondary" onPress={() => budgets.refetch()} />
            }
          />
        ) : items.length === 0 ? (
          <Card>
            <EmptyState
              icon={Target}
              title="Belum ada batas yang diset"
              body="Mulai dari satu kategori yang paling sering bikin boncos."
              action={
                <View style={styles.emptyActions}>
                  <Button label="Set Budget" icon={Plus} pill onPress={() => openEditor()} />
                  {(previous.data?.length ?? 0) > 0 && (
                    <Button
                      label={`Pakai budget ${formatMonth(previousMonth)}`}
                      icon={Copy}
                      variant="ghost"
                      loading={copyBudgets.isPending}
                      onPress={copyFromPrevious}
                    />
                  )}
                  {copyError && (
                    <AppText variant="caption" tone="danger" align="center">
                      {copyError}
                    </AppText>
                  )}
                </View>
              }
            />
          </Card>
        ) : (
          <View style={styles.list}>
            <BudgetTotals items={items} />
            <Card style={styles.rows}>
              {items.map((budget, index) => (
                <View key={budget.id} style={index > 0 && styles.rowDivider}>
                  <BudgetRow budget={budget} onPress={openEditor} />
                </View>
              ))}
            </Card>
            <AppText variant="caption" tone="muted" align="center">
              Hanya transaksi yang sudah dikonfirmasi yang dihitung ke budget.
            </AppText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BudgetTotals({ items }: { items: BudgetProgressDto[] }) {
  const limit = items.reduce((sum, item) => sum + item.limit, 0);
  const spent = items.reduce((sum, item) => sum + item.spent, 0);
  const ratio = limit > 0 ? spent / limit : 0;
  const remaining = limit - spent;
  const overCount = items.filter((item) => item.state === "over").length;
  return (
    <Card style={styles.totals}>
      <View style={styles.totalsRow}>
        <View style={styles.flex}>
          <AppText variant="caption" tone="muted">
            Terpakai dari total budget
          </AppText>
          <AppText variant="amountLarge">{formatRupiah(spent)}</AppText>
        </View>
        <AppText variant="h2" tone={ratio > 1 ? "danger" : ratio >= 0.8 ? "warning" : "brand"}>
          {formatPercent(ratio)}
        </AppText>
      </View>
      <ProgressBar
        ratio={ratio}
        accessibilityLabel={`Total budget terpakai ${formatPercent(ratio)}`}
      />
      <View style={styles.totalsRow}>
        <AppText variant="caption" tone="muted" style={styles.numbers}>
          Batas {formatRupiah(limit)}
        </AppText>
        <AppText variant="caption" tone={remaining < 0 ? "danger" : "muted"} style={styles.numbers}>
          {remaining < 0 ? `Lewat ${formatRupiah(-remaining)}` : `Sisa ${formatRupiah(remaining)}`}
        </AppText>
      </View>
      {overCount > 0 && (
        <AppText variant="caption" tone="danger">
          {overCount} kategori sudah melewati batas.
        </AppText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  content: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.four,
    paddingBottom: spacing.twelve,
    gap: spacing.four,
  },
  month: {
    marginLeft: -spacing.three,
  },
  list: {
    gap: spacing.four,
  },
  totals: {
    gap: spacing.three,
  },
  totalsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.two,
  },
  rows: {
    paddingVertical: spacing.two,
  },
  rowDivider: {
    borderTopWidth: layout.hairline,
    borderTopColor: colors.borderHairline,
  },
  emptyActions: {
    alignItems: "center",
    gap: spacing.two,
  },
  flex: {
    flex: 1,
    gap: spacing.half,
  },
  numbers: {
    fontVariant: ["tabular-nums"],
  },
});

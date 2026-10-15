import type { DashboardSummaryDto } from "@budgetmail/shared-types";
import { useRouter } from "expo-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleAlert,
  CloudOff,
  PieChart,
  Plus,
  Target,
} from "lucide-react-native";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDashboard, useMe } from "@/api/queries";
import { AmbientGlow } from "@/components/brand/ambient-glow";
import { SyncPulse } from "@/components/brand/sync-pulse";
import { BudgetRow } from "@/components/budget-row";
import { ExpenseBreakdown } from "@/components/expense-breakdown";
import { GmailBanner } from "@/components/gmail-banner";
import { Amount } from "@/components/ui/amount";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { MonthSelector } from "@/components/ui/month-selector";
import { Notice } from "@/components/ui/notice";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useSync } from "@/hooks/use-sync";
import { currentMonthKey, formatMonth, formatRelativeTime } from "@/lib/format";
import { colors, iconSize, iconStroke, layout, radius, spacing } from "@/theme/tokens";

const DASHBOARD_BUDGETS = 3;

export default function DashboardScreen() {
  const router = useRouter();
  const [month, setMonth] = useState(currentMonthKey);
  const dashboard = useDashboard(month);
  const me = useMe();
  const { gmail, isSyncing, startSync } = useSync();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (gmail?.status === "connected") await startSync().catch(() => undefined);
      await dashboard.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const firstName = me.data?.name.split(" ")[0];

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <SyncPulse active={isSyncing || refreshing} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brandTeal}
            colors={[colors.brandTeal]}
            progressBackgroundColor={colors.bgSurface}
          />
        }
      >
        <ScreenHeader
          subtitle={firstName ? `Halo, ${firstName}` : "Halo"}
          title="Ringkasan"
          right={
            <IconButton
              icon={Plus}
              label="Tambah transaksi manual"
              variant="brand"
              onPress={() => router.push("/transaction/new")}
            />
          }
        />

        <View style={styles.monthRow}>
          <MonthSelector month={month} onChange={setMonth} maxMonth={currentMonthKey()} />
          {gmail?.status === "connected" && gmail.lastSyncedAt && (
            <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.syncedAt}>
              {isSyncing ? "Menyinkronkan…" : `Sinkron ${formatRelativeTime(gmail.lastSyncedAt)}`}
            </AppText>
          )}
        </View>

        <GmailBanner />

        {dashboard.isLoading ? (
          <DashboardSkeleton />
        ) : dashboard.isError || !dashboard.data ? (
          <EmptyState
            icon={CloudOff}
            tone="danger"
            title="Ringkasan gagal dimuat"
            body="Periksa koneksimu, lalu coba lagi."
            action={
              <Button label="Coba lagi" variant="secondary" onPress={() => dashboard.refetch()} />
            }
          />
        ) : (
          <DashboardContent
            summary={dashboard.data}
            onReview={() =>
              router.navigate({ pathname: "/transactions", params: { filter: "pending" } })
            }
            onBudgets={() => router.navigate("/budget")}
            onSetBudget={() => router.push({ pathname: "/budget/edit", params: { month } })}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DashboardContent({
  summary,
  onReview,
  onBudgets,
  onSetBudget,
}: {
  summary: DashboardSummaryDto;
  onReview: () => void;
  onBudgets: () => void;
  onSetBudget: () => void;
}) {
  const topBudgets = [...summary.budgets]
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, DASHBOARD_BUDGETS);
  const negative = summary.balance < 0;

  return (
    <>
      <Card style={styles.hero}>
        <AmbientGlow />
        <AppText variant="bodySmall" tone="muted">
          Saldo bersih {formatMonth(summary.month)}
        </AppText>
        <Amount
          value={summary.balance}
          variant="amountHero"
          tone={negative ? "expense" : "primary"}
          adjustsFontSizeToFit
          numberOfLines={1}
        />
        <View style={styles.flows}>
          <FlowStat label="Pemasukan" value={summary.totalIncome} type="income" />
          <View style={styles.divider} />
          <FlowStat label="Pengeluaran" value={summary.totalExpense} type="expense" />
        </View>
      </Card>

      {summary.pendingReviewCount > 0 && (
        <Notice
          icon={CircleAlert}
          tone="warning"
          title={`${summary.pendingReviewCount} transaksi perlu ditinjau`}
          body="Belum dihitung di ringkasan sampai kamu konfirmasi nominal & kategorinya."
          actionLabel="Tinjau sekarang"
          onAction={onReview}
        />
      )}

      <View style={styles.section}>
        <SectionHeader title="Pengeluaran per kategori" />
        <Card>
          {summary.expenseByCategory.length > 0 ? (
            <ExpenseBreakdown items={summary.expenseByCategory} />
          ) : (
            <EmptyState
              icon={PieChart}
              title="Belum ada pengeluaran"
              body="Pengeluaran yang sudah dikonfirmasi bulan ini akan tampil di sini, dikelompokkan per kategori."
            />
          )}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Budget"
          actionLabel={summary.budgets.length > 0 ? "Lihat semua" : undefined}
          onAction={onBudgets}
        />
        <Card>
          {topBudgets.length > 0 ? (
            <View style={styles.budgetList}>
              {topBudgets.map((budget) => (
                <BudgetRow key={budget.id} budget={budget} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={Target}
              title="Belum ada batas yang diset"
              body="Mulai dari satu kategori yang paling sering bikin boncos."
              action={<Button label="Set budget" icon={Plus} pill onPress={onSetBudget} />}
            />
          )}
        </Card>
      </View>
    </>
  );
}

function FlowStat({
  label,
  value,
  type,
}: {
  label: string;
  value: number;
  type: "income" | "expense";
}) {
  const Icon = type === "income" ? ArrowDownLeft : ArrowUpRight;
  const color = type === "income" ? colors.signalIncome : colors.signalExpense;
  return (
    <View style={styles.flow}>
      <View style={styles.flowLabel}>
        <View
          style={[
            styles.flowIcon,
            { backgroundColor: type === "income" ? colors.tintBrand : colors.tintExpense },
          ]}
        >
          <Icon size={iconSize.sm} color={color} strokeWidth={iconStroke} />
        </View>
        <AppText variant="caption" tone="muted">
          {label}
        </AppText>
      </View>
      <Amount
        value={value}
        variant="amountLarge"
        tone={type}
        adjustsFontSizeToFit
        numberOfLines={1}
      />
    </View>
  );
}

function DashboardSkeleton() {
  return (
    <View style={styles.skeleton} accessibilityLabel="Memuat ringkasan">
      <Skeleton height={176} rounded={radius.card} />
      <Skeleton height={spacing.six} width="55%" />
      <Skeleton height={220} rounded={radius.card} />
    </View>
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
    gap: spacing.five,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: -spacing.three,
    gap: spacing.two,
  },
  syncedAt: {
    flexShrink: 1,
  },
  hero: {
    gap: spacing.two,
    paddingVertical: spacing.six,
  },
  flows: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: spacing.four,
    paddingTop: spacing.four,
    borderTopWidth: layout.hairline,
    borderTopColor: colors.borderHairline,
  },
  divider: {
    width: layout.hairline,
    backgroundColor: colors.borderHairline,
    marginHorizontal: spacing.four,
  },
  flow: {
    flex: 1,
    gap: spacing.two,
  },
  flowLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.two,
  },
  flowIcon: {
    width: spacing.six,
    height: spacing.six,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    gap: spacing.two,
  },
  budgetList: {
    gap: spacing.two,
  },
  skeleton: {
    gap: spacing.five,
  },
});

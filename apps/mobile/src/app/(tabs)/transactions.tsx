import type { TransactionDto } from "@budgetmail/shared-types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CircleCheck, CloudOff, Inbox, Plus } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, SectionList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTransactions, type TransactionFilter } from "@/api/queries";
import { SyncPulse } from "@/components/brand/sync-pulse";
import { GmailBanner } from "@/components/gmail-banner";
import { TransactionRow } from "@/components/transaction-row";
import { Amount } from "@/components/ui/amount";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { MonthSelector } from "@/components/ui/month-selector";
import { ScreenHeader } from "@/components/ui/screen-header";
import { TransactionRowSkeleton } from "@/components/ui/skeleton";
import { useSync } from "@/hooks/use-sync";
import { currentMonthKey, formatDayHeading, toDayKey } from "@/lib/format";
import { colors, layout, radius, spacing } from "@/theme/tokens";

type FilterKey = "all" | "pending" | "expense" | "income";

const FILTERS: { key: FilterKey; label: string; filter: TransactionFilter }[] = [
  { key: "all", label: "Semua", filter: {} },
  { key: "pending", label: "Perlu ditinjau", filter: { status: "pending_review" } },
  { key: "expense", label: "Pengeluaran", filter: { type: "expense" } },
  { key: "income", label: "Pemasukan", filter: { type: "income" } },
];

interface DaySection {
  key: string;
  title: string;
  net: number;
  data: TransactionDto[];
}

function groupByDay(transactions: TransactionDto[]): DaySection[] {
  const sections = new Map<string, DaySection>();
  for (const transaction of transactions) {
    const date = new Date(transaction.transactionDate);
    const key = toDayKey(date);
    const section = sections.get(key) ?? { key, title: formatDayHeading(date), net: 0, data: [] };
    section.net += transaction.type === "income" ? transaction.amount : -transaction.amount;
    section.data.push(transaction);
    sections.set(key, section);
  }
  return [...sections.values()];
}

export default function TransactionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: FilterKey }>();
  const [month, setMonth] = useState(currentMonthKey);
  const [filterKey, setFilterKey] = useState<FilterKey>(params.filter ?? "all");
  const { gmail, isSyncing, startSync } = useSync();
  const [refreshing, setRefreshing] = useState(false);

  // The dashboard links here with filter=pending ("Tinjau sekarang")
  useEffect(() => {
    if (params.filter) setFilterKey(params.filter);
  }, [params.filter]);

  const filter = FILTERS.find((item) => item.key === filterKey)!.filter;
  const query = useTransactions(month, filter);
  const transactions = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );
  const sections = useMemo(() => groupByDay(transactions), [transactions]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Pulling to refresh also asks the backend for a Gmail sync
      if (gmail?.status === "connected") await startSync().catch(() => undefined);
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const openTransaction = (transaction: TransactionDto) =>
    router.push({ pathname: "/transaction/[id]", params: { id: transaction.id } });

  const header = (
    <View style={styles.header}>
      <ScreenHeader
        title="Transaksi"
        right={
          <IconButton
            icon={Plus}
            label="Tambah transaksi manual"
            variant="brand"
            onPress={() => router.push("/transaction/new")}
          />
        }
      />
      <View style={styles.month}>
        <MonthSelector month={month} onChange={setMonth} maxMonth={currentMonthKey()} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipScroller}
        accessibilityRole="radiogroup"
        accessibilityLabel="Filter transaksi"
      >
        {FILTERS.map((item) => (
          <Chip
            key={item.key}
            label={item.label}
            selected={item.key === filterKey}
            onPress={() => setFilterKey(item.key)}
          />
        ))}
      </ScrollView>
      <GmailBanner />
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <SyncPulse active={isSyncing || refreshing} />
      <SectionList
        sections={query.isLoading || query.isError ? [] : sections}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.content}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <AppText variant="bodySmallStrong" tone="muted">
              {section.title}
            </AppText>
            <Amount value={section.net} variant="amountSmall" tone="muted" />
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <View
            style={[
              styles.rowShell,
              index === 0 && styles.rowFirst,
              index === section.data.length - 1 && styles.rowLast,
              index > 0 && styles.rowDivider,
            ]}
          >
            <TransactionRow transaction={item} onPress={openTransaction} />
          </View>
        )}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <View style={styles.footer}>
              <TransactionRowSkeleton />
            </View>
          ) : null
        }
        ListEmptyComponent={
          query.isLoading ? (
            <View style={styles.loading} accessibilityLabel="Memuat transaksi">
              {[0, 1, 2, 3, 4].map((index) => (
                <TransactionRowSkeleton key={index} />
              ))}
            </View>
          ) : query.isError ? (
            <EmptyState
              icon={CloudOff}
              tone="danger"
              title="Transaksi gagal dimuat"
              body="Periksa koneksimu, lalu coba lagi."
              action={
                <Button label="Coba lagi" variant="secondary" onPress={() => query.refetch()} />
              }
            />
          ) : filterKey === "pending" ? (
            <EmptyState
              icon={CircleCheck}
              title="Semua sudah ditinjau"
              body="Tidak ada transaksi yang menunggu konfirmasimu bulan ini."
            />
          ) : (
            <EmptyState
              icon={Inbox}
              title="Belum ada transaksi"
              body={
                gmail?.status === "connected"
                  ? "Transaksi dari Gmail akan muncul otomatis. Tarik ke bawah untuk sinkron sekarang, atau catat transaksi tunai secara manual."
                  : "Catat transaksi tunai secara manual, atau hubungkan Gmail agar terisi otomatis."
              }
              action={
                <Button
                  label="Tambah transaksi"
                  icon={Plus}
                  pill
                  onPress={() => router.push("/transaction/new")}
                />
              }
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brandTeal}
            colors={[colors.brandTeal]}
            progressBackgroundColor={colors.bgSurface}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  content: {
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.twelve,
  },
  header: {
    paddingTop: spacing.four,
    gap: spacing.four,
    paddingBottom: spacing.two,
  },
  month: {
    marginLeft: -spacing.three,
  },
  chipScroller: {
    marginHorizontal: -layout.screenGutter,
  },
  chips: {
    paddingHorizontal: layout.screenGutter,
    gap: spacing.two,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.five,
    paddingBottom: spacing.two,
    paddingHorizontal: spacing.one,
  },
  // Rows of one day share a surface so the day reads as one card
  rowShell: {
    backgroundColor: colors.bgSurface,
    borderLeftWidth: layout.hairline,
    borderRightWidth: layout.hairline,
    borderColor: colors.borderHairline,
    overflow: "hidden",
  },
  rowFirst: {
    borderTopWidth: layout.hairline,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
  },
  rowLast: {
    borderBottomWidth: layout.hairline,
    borderBottomLeftRadius: radius.card,
    borderBottomRightRadius: radius.card,
  },
  rowDivider: {
    borderTopWidth: layout.hairline,
  },
  footer: {
    paddingTop: spacing.three,
  },
  loading: {
    paddingTop: spacing.four,
  },
});

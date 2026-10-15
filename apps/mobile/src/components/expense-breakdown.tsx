import type { CategoryBreakdownItem } from "@budgetmail/shared-types";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { CategoryIcon } from "@/components/ui/category-icon";
import { categoryColor } from "@/lib/category-style";
import { formatPercent, formatRupiah } from "@/lib/format";
import { categoryNeutral, colors, layout, radius, spacing } from "@/theme/tokens";

// Categories past this fold into one neutral segment instead of getting new colors.
const MAX_SEGMENTS = 5;

interface Segment {
  key: string;
  label: string;
  total: number;
  share: number;
  color: string;
  item: CategoryBreakdownItem | null;
}

function toSegments(items: CategoryBreakdownItem[]): Segment[] {
  const head = items.slice(0, MAX_SEGMENTS).map<Segment>((item) => ({
    key: item.category?.id ?? "uncategorized",
    label: item.category?.name ?? "Tanpa kategori",
    total: item.total,
    share: item.share,
    color: categoryColor(item.category),
    item,
  }));
  const tail = items.slice(MAX_SEGMENTS);
  if (tail.length > 0) {
    head.push({
      key: "folded-tail",
      label: `${tail.length} kategori lain`,
      total: tail.reduce((sum, item) => sum + item.total, 0),
      share: tail.reduce((sum, item) => sum + item.share, 0),
      color: categoryNeutral,
      item: null,
    });
  }
  return head;
}

export interface ExpenseBreakdownProps {
  items: CategoryBreakdownItem[];
}

// One segmented bar plus a labeled legend. The legend names each category and its
// amount, so reading the chart never depends on telling colors apart.
export function ExpenseBreakdown({ items }: ExpenseBreakdownProps) {
  const segments = toSegments(items);
  return (
    <View style={styles.container}>
      <View
        style={styles.bar}
        accessible
        accessibilityLabel={`Komposisi pengeluaran: ${segments
          .map((segment) => `${segment.label} ${formatPercent(segment.share)}`)
          .join(", ")}`}
      >
        {segments.map((segment) => (
          <View
            key={segment.key}
            style={[
              styles.segment,
              { flexGrow: Math.max(segment.share, 0.015), backgroundColor: segment.color },
            ]}
          />
        ))}
      </View>

      <View style={styles.legend}>
        {segments.map((segment) => (
          <View key={segment.key} style={styles.legendRow}>
            {segment.item ? (
              <CategoryIcon category={segment.item.category} size="sm" />
            ) : (
              <View style={[styles.swatch, { backgroundColor: segment.color }]} />
            )}
            <AppText variant="bodySmall" numberOfLines={1} style={styles.legendLabel}>
              {segment.label}
            </AppText>
            <AppText variant="caption" tone="muted" style={styles.share}>
              {formatPercent(segment.share)}
            </AppText>
            <AppText variant="amountSmall" style={styles.amount}>
              {formatRupiah(segment.total)}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.five,
  },
  bar: {
    flexDirection: "row",
    height: layout.breakdownBarHeight,
    // 2px gap between segments
    gap: layout.lineWeight,
    borderRadius: radius.pill,
    overflow: "hidden",
    backgroundColor: colors.bgRaised,
  },
  segment: {
    flexBasis: 0,
    height: "100%",
  },
  legend: {
    gap: spacing.three,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.three,
  },
  swatch: {
    width: layout.categoryIconSmall,
    height: layout.categoryIconSmall,
    borderRadius: radius.pill,
  },
  legendLabel: {
    flex: 1,
  },
  share: {
    minWidth: spacing.eight,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  amount: {
    minWidth: 96,
    textAlign: "right",
  },
});

import type { TransactionDto } from "@budgetmail/shared-types";
import { LinearGradient } from "expo-linear-gradient";
import { CircleAlert, Mail } from "lucide-react-native";
import { memo, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Amount } from "@/components/ui/amount";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { CategoryIcon } from "@/components/ui/category-icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { useSync } from "@/hooks/use-sync";
import { formatTime } from "@/lib/format";
import {
  colors,
  gradients,
  iconSize,
  iconStroke,
  layout,
  motion,
  radius,
  spacing,
} from "@/theme/tokens";

export interface TransactionRowProps {
  transaction: TransactionDto;
  onPress: (transaction: TransactionDto) => void;
}

function TransactionRowBase({ transaction, onPress }: TransactionRowProps) {
  const { inflowSince, claimInflow } = useSync();
  const reduceMotion = useReducedMotion();
  // Decided once on mount: did this row arrive with the latest sync?
  const [arrivedWithSync] = useState(
    () =>
      transaction.source === "gmail" &&
      inflowSince !== null &&
      new Date(transaction.createdAt).getTime() >= inflowSince,
  );
  const [playInflow, setPlayInflow] = useState(false);
  const trail = useSharedValue(0);

  useEffect(() => {
    if (arrivedWithSync && claimInflow(transaction.id)) {
      setPlayInflow(true);
      if (!reduceMotion) trail.value = withTiming(1, { duration: motion.inflow });
    }
  }, [arrivedWithSync, claimInflow, transaction.id, reduceMotion, trail]);

  const trailStyle = useAnimatedStyle(() => ({
    width: `${trail.value * 100}%`,
    opacity: 1 - trail.value,
  }));

  const date = new Date(transaction.transactionDate);
  const pending = transaction.status === "pending_review";
  const categoryName = transaction.category?.name ?? "Tanpa kategori";

  return (
    <Animated.View
      entering={playInflow ? (reduceMotion ? FadeIn : FadeInDown).duration(motion.slow) : undefined}
    >
      <PressableScale
        accessibilityLabel={`${transaction.merchant}, ${categoryName}${transaction.source === "gmail" ? ", dari Gmail" : ""}${pending ? ", perlu ditinjau" : ""}`}
        accessibilityHint="Buka detail transaksi"
        onPress={() => onPress(transaction)}
        scaleTo={0.99}
        style={styles.row}
      >
        <CategoryIcon category={transaction.category} />
        <View style={styles.middle}>
          <AppText variant="bodyMedium" numberOfLines={1}>
            {transaction.merchant}
          </AppText>
          <View style={styles.meta}>
            {transaction.source === "gmail" && (
              <Mail size={iconSize.xs} color={colors.textMuted} strokeWidth={iconStroke} />
            )}
            <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.metaText}>
              {categoryName} · {formatTime(date)}
            </AppText>
          </View>
          {pending && <Badge label="Perlu ditinjau" tone="warning" icon={CircleAlert} />}
        </View>
        <Amount value={transaction.amount} type={transaction.type} />
      </PressableScale>
      {playInflow && !reduceMotion && (
        <Animated.View style={[styles.trail, trailStyle, { pointerEvents: "none" }]}>
          <LinearGradient
            colors={gradients.inflow}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}

export const TransactionRow = memo(TransactionRowBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.three,
    paddingVertical: spacing.three,
    paddingHorizontal: spacing.four,
    minHeight: layout.touchTarget + spacing.four,
  },
  middle: {
    flex: 1,
    gap: spacing.one,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.one,
  },
  metaText: {
    flexShrink: 1,
  },
  trail: {
    position: "absolute",
    left: 0,
    bottom: 0,
    height: layout.lineWeight,
    borderRadius: radius.pill,
  },
});

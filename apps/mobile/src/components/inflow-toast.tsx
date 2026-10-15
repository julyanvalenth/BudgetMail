import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { MailCheck, X } from "lucide-react-native";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { PressableScale } from "@/components/ui/pressable-scale";
import { useSync } from "@/hooks/use-sync";
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

const VISIBLE_MS = 5_000;

// Shown when a sync brings in new transactions. The gradient line at the bottom
// sweeps across once and fades.
export function InflowToast() {
  const { notice, dismissNotice } = useSync();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const trail = useSharedValue(0);

  // Keyed on the sync job, so a count that grows while the toast is up doesn't restart it
  const noticeKey = notice?.key;
  useEffect(() => {
    if (!noticeKey) return;
    const timer = setTimeout(dismissNotice, VISIBLE_MS);
    trail.value = 0;
    trail.value = reduceMotion
      ? 0
      : withDelay(motion.base, withTiming(1, { duration: motion.inflow * 2 }));
    return () => clearTimeout(timer);
  }, [noticeKey, dismissNotice, reduceMotion, trail]);

  const trailStyle = useAnimatedStyle(() => ({
    width: `${Math.min(trail.value * 2, 1) * 100}%`,
    opacity: trail.value < 0.5 ? 1 : 2 - trail.value * 2,
  }));

  if (!notice) return null;

  const label = `${notice.count} transaksi baru masuk dari Gmail`;

  return (
    <Animated.View
      key={notice.key}
      entering={reduceMotion ? FadeIn.duration(motion.fast) : SlideInUp.duration(motion.base)}
      exiting={reduceMotion ? FadeOut.duration(motion.fast) : SlideOutUp.duration(motion.base)}
      style={[styles.wrapper, { top: insets.top + spacing.two, pointerEvents: "box-none" }]}
    >
      <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.toast}>
        <PressableScale
          accessibilityLabel={`${label}. Buka daftar transaksi`}
          onPress={() => {
            dismissNotice();
            router.navigate("/transactions");
          }}
          scaleTo={0.99}
          style={styles.body}
        >
          <View style={styles.icon}>
            <MailCheck size={iconSize.md} color={colors.brandTeal} strokeWidth={iconStroke} />
          </View>
          <View style={styles.text}>
            <AppText variant="bodySmallStrong">{label}</AppText>
            <AppText variant="caption" tone="muted">
              Ketuk untuk meninjau
            </AppText>
          </View>
        </PressableScale>
        <PressableScale
          accessibilityLabel="Tutup notifikasi"
          onPress={dismissNotice}
          style={styles.close}
        >
          <X size={iconSize.sm} color={colors.textMuted} strokeWidth={iconStroke} />
        </PressableScale>
        <Animated.View style={[styles.trail, trailStyle]}>
          <LinearGradient
            colors={gradients.inflow}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: spacing.four,
    right: spacing.four,
    zIndex: 10,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgRaised,
    borderRadius: radius.card,
    borderWidth: layout.hairline,
    borderColor: colors.borderStrong,
    overflow: "hidden",
  },
  body: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.three,
    padding: spacing.four,
  },
  icon: {
    width: layout.categoryIconSmall,
    height: layout.categoryIconSmall,
    borderRadius: radius.pill,
    backgroundColor: colors.tintBrand,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
  },
  close: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  trail: {
    position: "absolute",
    left: 0,
    bottom: 0,
    height: layout.lineWeight,
  },
});

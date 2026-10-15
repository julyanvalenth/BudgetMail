import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { queryKeys } from "@/api/queries";
import { AmbientGlow } from "@/components/brand/ambient-glow";
import { InflowLine } from "@/components/brand/inflow-line";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { colors, layout, spacing } from "@/theme/tokens";

// The backend's Gmail OAuth callback redirects here (budgetmail://gmail-connected)
// after it saves the token and queues the backfill.
export default function GmailConnectedScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.gmailStatus });
    const timer = setTimeout(() => router.replace("/(tabs)"), 3_500);
    return () => clearTimeout(timer);
  }, [queryClient, router]);

  return (
    <View style={styles.root}>
      <AmbientGlow intensity="strong" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <InflowLine />
          <View style={styles.copy}>
            <AppText variant="h1" align="center" accessibilityRole="header">
              Gmail terhubung
            </AppText>
            <AppText variant="body" tone="muted" align="center" accessibilityLiveRegion="polite">
              Sedang menarik transaksi 3 bulan terakhir. Biasanya selesai dalam beberapa menit, dan
              kamu bisa mulai menjelajah sekarang.
            </AppText>
          </View>
        </View>
        <Button label="Buka dashboard" onPress={() => router.replace("/(tabs)")} fullWidth />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  safe: {
    flex: 1,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.four,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.ten,
    paddingHorizontal: spacing.four,
  },
  copy: {
    gap: spacing.three,
  },
});

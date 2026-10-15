import { Redirect, useRouter } from "expo-router";
import { EyeOff, KeyRound, MailCheck, Trash2, type LucideIcon } from "lucide-react-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AmbientGlow } from "@/components/brand/ambient-glow";
import { GridBackdrop } from "@/components/brand/grid-backdrop";
import { InflowLine } from "@/components/brand/inflow-line";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useConnectGmail } from "@/hooks/use-connect-gmail";
import { colors, iconSize, iconStroke, layout, radius, spacing } from "@/theme/tokens";

interface Point {
  icon: LucideIcon;
  title: string;
  body: string;
}

const READS: Point[] = [
  {
    icon: MailCheck,
    title: "Hanya email notifikasi transaksi",
    body: "Dari pengirim bank & e-wallet yang kami kenali (BCA, Mandiri, BRI, BNI, GoPay, OVO, DANA, ShopeePay). Email lain tidak disentuh.",
  },
];

const NEVER: Point[] = [
  {
    icon: KeyRound,
    title: "Tidak pernah meminta password bank",
    body: "Kami hanya membaca notifikasi, bukan masuk ke rekeningmu.",
  },
  {
    icon: Trash2,
    title: "Tidak mengubah atau menghapus email",
    body: "Izinnya baca-saja (gmail.readonly).",
  },
  {
    icon: EyeOff,
    title: "Tidak menyimpan isi email penuh",
    body: "Hanya cuplikan pendek yang dibutuhkan untuk mengenali transaksi.",
  },
];

export default function OnboardingScreen() {
  const { token, skipOnboarding } = useAuth();
  const router = useRouter();
  const { connect, isConnecting, error } = useConnectGmail();

  if (!token) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.root}>
      <GridBackdrop />
      <AmbientGlow focus="top" />
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.flow}>
            <InflowLine />
          </View>

          <View style={styles.copy}>
            <AppText variant="display" accessibilityRole="header">
              Hubungkan Gmail-mu
            </AppText>
            <AppText variant="body" tone="muted">
              Setelah terhubung, transaksi 3 bulan terakhir langsung masuk, lalu diperbarui otomatis
              setiap 30 menit. Kamu tinggal meninjau.
            </AppText>
          </View>

          <View style={styles.group}>
            <AppText variant="caption" tone="brand">
              Yang kami baca
            </AppText>
            {READS.map((point) => (
              <PointRow key={point.title} point={point} tone="brand" />
            ))}
          </View>

          <View style={styles.group}>
            <AppText variant="caption" tone="muted">
              Yang tidak pernah kami lakukan
            </AppText>
            {NEVER.map((point) => (
              <PointRow key={point.title} point={point} tone="muted" />
            ))}
          </View>
        </ScrollView>

        <View style={styles.actions}>
          {error && (
            <AppText variant="bodySmall" tone="danger" accessibilityLiveRegion="polite">
              {error}
            </AppText>
          )}
          <Button label="Hubungkan Gmail" onPress={connect} loading={isConnecting} fullWidth />
          <Button
            label="Nanti saja, catat manual dulu"
            variant="ghost"
            onPress={async () => {
              await skipOnboarding();
              router.replace("/(tabs)");
            }}
            fullWidth
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function PointRow({ point, tone }: { point: Point; tone: "brand" | "muted" }) {
  const Icon = point.icon;
  return (
    <View style={styles.point}>
      <View style={[styles.pointIcon, tone === "brand" && styles.pointIconBrand]}>
        <Icon
          size={iconSize.sm}
          color={tone === "brand" ? colors.brandTeal : colors.textMuted}
          strokeWidth={iconStroke}
        />
      </View>
      <View style={styles.pointText}>
        <AppText variant="bodySmallStrong">{point.title}</AppText>
        <AppText variant="bodySmall" tone="muted">
          {point.body}
        </AppText>
      </View>
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
  },
  content: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.twelve,
    paddingBottom: spacing.six,
    gap: spacing.eight,
  },
  flow: {
    paddingHorizontal: spacing.four,
  },
  copy: {
    gap: spacing.three,
  },
  group: {
    gap: spacing.four,
  },
  point: {
    flexDirection: "row",
    gap: spacing.three,
  },
  pointIcon: {
    width: layout.categoryIconSmall,
    height: layout.categoryIconSmall,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSurface,
    borderWidth: layout.hairline,
    borderColor: colors.borderHairline,
    alignItems: "center",
    justifyContent: "center",
  },
  pointIconBrand: {
    backgroundColor: colors.tintBrand,
  },
  pointText: {
    flex: 1,
    gap: spacing.half,
  },
  actions: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.three,
    paddingBottom: spacing.two,
    gap: spacing.one,
    borderTopWidth: layout.hairline,
    borderTopColor: colors.borderHairline,
    backgroundColor: colors.bgBase,
  },
});

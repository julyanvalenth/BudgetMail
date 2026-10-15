import {
  CircleAlert,
  CircleCheck,
  LogOut,
  MailPlus,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from "lucide-react-native";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { errorMessage } from "@/api/client";
import { useDisconnectGmail, useMe } from "@/api/queries";
import { SyncPulse } from "@/components/brand/sync-pulse";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useConnectGmail } from "@/hooks/use-connect-gmail";
import { useSync } from "@/hooks/use-sync";
import { formatRelativeTime } from "@/lib/format";
import { colors, iconSize, iconStroke, layout, radius, spacing } from "@/theme/tokens";

const PRIVACY_POINTS = [
  "Akses Gmail baca-saja (gmail.readonly), hanya untuk email dari pengirim bank & e-wallet.",
  "Token akses Gmail disimpan terenkripsi di server, tidak pernah dalam bentuk teks biasa.",
  "Yang disimpan hanya cuplikan pendek email notifikasi, bukan isi email penuh.",
  "Kamu bisa memutus koneksi kapan saja; sinkronisasi langsung berhenti.",
];

export default function AccountScreen() {
  const { signOut } = useAuth();
  const me = useMe();
  const { gmail, isSyncing, startSync } = useSync();
  const { connect, isConnecting, error: connectError } = useConnectGmail();
  const disconnect = useDisconnectGmail();

  const confirmDisconnect = () =>
    Alert.alert(
      "Putuskan koneksi Gmail?",
      "Sinkronisasi otomatis akan berhenti. Transaksi yang sudah tercatat tetap tersimpan.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Putuskan",
          style: "destructive",
          onPress: () =>
            disconnect.mutate(undefined, {
              onError: (err) => Alert.alert("Gagal memutus koneksi", errorMessage(err)),
            }),
        },
      ],
    );

  const confirmSignOut = () =>
    Alert.alert(
      "Keluar dari BudgetMail?",
      "Kamu bisa masuk lagi kapan saja dengan akun Google yang sama.",
      [
        { text: "Batal", style: "cancel" },
        { text: "Keluar", style: "destructive", onPress: () => void signOut() },
      ],
    );

  const initial = me.data?.name.trim().charAt(0).toUpperCase() ?? "";

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <SyncPulse active={isSyncing} />
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Akun" />

        <Card style={styles.profile}>
          <View style={styles.avatar}>
            <AppText variant="h2" tone="brand">
              {initial}
            </AppText>
          </View>
          {me.isLoading ? (
            <View style={styles.flex}>
              <Skeleton width="50%" />
              <Skeleton width="70%" height={spacing.three} />
            </View>
          ) : (
            <View style={styles.flex}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {me.data?.name}
              </AppText>
              <AppText variant="bodySmall" tone="muted" numberOfLines={1}>
                {me.data?.email}
              </AppText>
            </View>
          )}
        </Card>

        <View style={styles.section}>
          <SectionHeader title="Koneksi Gmail" />
          <Card style={styles.gmail}>
            <View style={styles.gmailHeader}>
              <AppText variant="bodyStrong" style={styles.flex}>
                Status
              </AppText>
              {gmail?.status === "connected" ? (
                <Badge label="Terhubung" tone="brand" icon={CircleCheck} />
              ) : gmail?.status === "token_expired" ? (
                <Badge label="Terputus" tone="danger" icon={CircleAlert} />
              ) : (
                <Badge label="Belum terhubung" />
              )}
            </View>

            {gmail?.status === "connected" && (
              <AppText variant="bodySmall" tone="muted">
                {isSyncing
                  ? "Sedang menyinkronkan transaksi baru…"
                  : gmail.lastSyncedAt
                    ? `Terakhir sinkron ${formatRelativeTime(gmail.lastSyncedAt)}. Sinkron otomatis tiap 30 menit.`
                    : "Menyiapkan sinkronisasi pertama…"}
              </AppText>
            )}
            {gmail?.status === "token_expired" && (
              <AppText variant="bodySmall" tone="muted">
                Koneksi Gmail terputus. Sambungkan ulang untuk lanjut menangkap transaksimu.
              </AppText>
            )}
            {gmail?.status === "not_connected" && (
              <AppText variant="bodySmall" tone="muted">
                Hubungkan Gmail agar transaksi bank & e-wallet tercatat otomatis.
              </AppText>
            )}
            {connectError && (
              <AppText variant="caption" tone="danger">
                {connectError}
              </AppText>
            )}

            <View style={styles.gmailActions}>
              {gmail?.status === "connected" ? (
                <>
                  <Button
                    label="Sinkronkan sekarang"
                    icon={RefreshCw}
                    variant="secondary"
                    loading={isSyncing}
                    onPress={() =>
                      startSync().catch((err) =>
                        Alert.alert("Sinkronisasi gagal", errorMessage(err)),
                      )
                    }
                    fullWidth
                  />
                  <Button
                    label="Putuskan koneksi"
                    icon={Unplug}
                    variant="danger"
                    loading={disconnect.isPending}
                    onPress={confirmDisconnect}
                    fullWidth
                  />
                </>
              ) : (
                <Button
                  label={
                    gmail?.status === "token_expired" ? "Hubungkan ulang Gmail" : "Hubungkan Gmail"
                  }
                  icon={MailPlus}
                  loading={isConnecting}
                  onPress={connect}
                  fullWidth
                />
              )}
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Privasi" />
          <Card style={styles.privacy}>
            {PRIVACY_POINTS.map((point) => (
              <View key={point} style={styles.point}>
                <ShieldCheck size={iconSize.sm} color={colors.brandTeal} strokeWidth={iconStroke} />
                <AppText variant="bodySmall" tone="muted" style={styles.flex}>
                  {point}
                </AppText>
              </View>
            ))}
          </Card>
        </View>

        <Button
          label="Keluar"
          icon={LogOut}
          variant="secondary"
          onPress={confirmSignOut}
          fullWidth
        />
      </ScrollView>
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
    paddingTop: spacing.four,
    paddingBottom: spacing.twelve,
    gap: spacing.five,
  },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.four,
  },
  avatar: {
    width: layout.touchTarget + spacing.two,
    height: layout.touchTarget + spacing.two,
    borderRadius: radius.pill,
    backgroundColor: colors.tintBrand,
    alignItems: "center",
    justifyContent: "center",
  },
  flex: {
    flex: 1,
    gap: spacing.one,
  },
  section: {
    gap: spacing.two,
  },
  gmail: {
    gap: spacing.three,
  },
  gmailHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  gmailActions: {
    gap: spacing.two,
    marginTop: spacing.one,
  },
  privacy: {
    gap: spacing.four,
  },
  point: {
    flexDirection: "row",
    gap: spacing.three,
    alignItems: "flex-start",
  },
});

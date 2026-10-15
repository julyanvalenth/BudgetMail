import * as AuthSession from "expo-auth-session";
import { Redirect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Lock } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { errorMessage, loginWithGoogle } from "@/api/client";
import { AmbientGlow } from "@/components/brand/ambient-glow";
import { GridBackdrop } from "@/components/brand/grid-backdrop";
import { InflowLine } from "@/components/brand/inflow-line";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { colors, iconSize, iconStroke, layout, spacing } from "@/theme/tokens";

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
};

// Fill in after creating an OAuth client (type: iOS/Android/Web as appropriate) for the
// mobile app in Google Cloud Console - separate from the backend's web client used for
// the Gmail incremental-consent flow. See docs/TASKS.md Fase 0 for the manual setup steps.
const GOOGLE_MOBILE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export default function LoginScreen() {
  const { token, signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  // Profile scopes only. gmail.readonly is requested later, from onboarding.
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_MOBILE_CLIENT_ID,
      scopes: ["openid", "profile", "email"],
      redirectUri: AuthSession.makeRedirectUri(),
      responseType: AuthSession.ResponseType.IdToken,
      usePKCE: false,
    },
    discovery,
  );

  useEffect(() => {
    if (!response) return;
    if (response.type !== "success") {
      setSigningIn(false);
      if (response.type === "error") setError("Login Google gagal. Coba lagi.");
      return;
    }
    const idToken = response.params.id_token;
    if (!idToken) {
      setSigningIn(false);
      return;
    }
    loginWithGoogle(idToken)
      .then(({ token: sessionToken }) => signIn(sessionToken))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setSigningIn(false));
  }, [response, signIn]);

  if (token) {
    return <Redirect href="/" />;
  }

  return (
    <View style={styles.root}>
      <GridBackdrop />
      <AmbientGlow intensity="strong" focus="top" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.hero}>
          <InflowLine />
          <View style={styles.copy}>
            <AppText variant="display" accessibilityRole="header">
              Catat pengeluaranmu tanpa mencatat apa-apa.
            </AppText>
            <AppText variant="body" tone="muted">
              BudgetMail membaca notifikasi transaksi bank & e-wallet dari Gmail-mu, lalu
              menyusunnya jadi ringkasan dan budget bulanan secara otomatis.
            </AppText>
          </View>
        </View>

        <View style={styles.actions}>
          {error && (
            <AppText variant="bodySmall" tone="danger" accessibilityLiveRegion="polite">
              {error}
            </AppText>
          )}
          <Button
            label="Masuk dengan Google"
            onPress={() => {
              setError(null);
              setSigningIn(true);
              void promptAsync();
            }}
            disabled={!request}
            loading={signingIn}
            fullWidth
          />
          <View style={styles.reassure}>
            <Lock size={iconSize.xs} color={colors.textMuted} strokeWidth={iconStroke} />
            <AppText variant="caption" tone="muted">
              Login hanya memakai profil Google-mu. Akses Gmail diminta terpisah.
            </AppText>
          </View>
        </View>
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
    justifyContent: "space-between",
  },
  hero: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.ten,
  },
  copy: {
    gap: spacing.four,
  },
  actions: {
    gap: spacing.three,
    paddingBottom: spacing.four,
  },
  reassure: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.two,
  },
});

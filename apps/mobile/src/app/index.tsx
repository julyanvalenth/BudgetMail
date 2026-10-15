import { Redirect } from "expo-router";
import { StyleSheet, View } from "react-native";

import { BrandMark } from "@/components/brand/brand-mark";
import { useAuth } from "@/hooks/use-auth";
import { useSync } from "@/hooks/use-sync";
import { colors, spacing } from "@/theme/tokens";

// Sends the user to login, Gmail onboarding, or the tabs.
export default function IndexGate() {
  const { token, isLoading, onboardingSkipped } = useAuth();
  const { gmail, gmailLoading } = useSync();

  if (!isLoading && !token) {
    return <Redirect href="/login" />;
  }
  if (token && !gmailLoading) {
    // token_expired skips onboarding; the in-app banner handles reconnecting.
    const needsOnboarding = (!gmail || gmail.status === "not_connected") && !onboardingSkipped;
    return <Redirect href={needsOnboarding ? "/onboarding" : "/(tabs)"} />;
  }

  return (
    <View style={styles.container} accessibilityLabel="Memuat BudgetMail">
      <BrandMark size={spacing.twelve + spacing.four} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgBase,
    alignItems: "center",
    justifyContent: "center",
  },
});

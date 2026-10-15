import { Redirect } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { CircleUser, House, PiggyBank, ReceiptText, type LucideIcon } from "lucide-react-native";
import { StyleSheet, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/hooks/use-auth";
import { colors, fonts, iconSize, iconStroke, layout, spacing, typography } from "@/theme/tokens";

function tabIcon(Icon: LucideIcon) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return (
      <Icon
        size={iconSize.lg}
        color={String(color)}
        strokeWidth={focused ? iconStroke + 0.5 : iconStroke}
      />
    );
  };
}

export default function TabsLayout() {
  const { token, isLoading } = useAuth();
  const insets = useSafeAreaInsets();
  if (!isLoading && !token) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bgBase },
        tabBarActiveTintColor: colors.brandTeal,
        tabBarInactiveTintColor: colors.textMuted,
        // The default height clips the label, so set it explicitly (plus the home-indicator inset)
        tabBarStyle: [
          styles.tabBar,
          {
            height: layout.tabBarHeight + insets.bottom,
            paddingBottom: insets.bottom + spacing.one,
          },
        ],
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Beranda", tabBarIcon: tabIcon(House) }} />
      <Tabs.Screen
        name="transactions"
        options={{ title: "Transaksi", tabBarIcon: tabIcon(ReceiptText) }}
      />
      <Tabs.Screen name="budget" options={{ title: "Budget", tabBarIcon: tabIcon(PiggyBank) }} />
      <Tabs.Screen name="account" options={{ title: "Akun", tabBarIcon: tabIcon(CircleUser) }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bgBase,
    borderTopColor: colors.borderHairline,
    borderTopWidth: layout.hairline,
    paddingTop: spacing.one,
  },
  label: {
    fontFamily: fonts.bodySemibold,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
});

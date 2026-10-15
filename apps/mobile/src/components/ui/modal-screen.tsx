import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import type { PropsWithChildren, ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/icon-button";
import { colors, layout, radius, spacing } from "@/theme/tokens";

export interface ModalScreenProps {
  title: string;
  // Stays above the keyboard
  footer?: ReactNode;
}

// Layout for modal routes: grabber, title, close button, scrolling body, sticky footer.
export function ModalScreen({ title, footer, children }: PropsWithChildren<ModalScreenProps>) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.root, { paddingTop: Platform.OS === "ios" ? 0 : insets.top }]}
    >
      <View style={styles.grabber} />
      <View style={styles.header}>
        <AppText variant="h2" accessibilityRole="header" style={styles.title} numberOfLines={1}>
          {title}
        </AppText>
        <IconButton icon={X} label="Tutup" onPress={() => router.back()} />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {children}
      </ScrollView>
      {footer && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.three }]}>
          {footer}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  grabber: {
    alignSelf: "center",
    width: spacing.ten,
    height: spacing.one,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
    marginTop: spacing.two,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: layout.screenGutter,
    paddingVertical: spacing.three,
    gap: spacing.three,
  },
  title: {
    flex: 1,
  },
  body: {
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.eight,
    gap: spacing.five,
  },
  footer: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.three,
    gap: spacing.two,
    borderTopWidth: layout.hairline,
    borderTopColor: colors.borderHairline,
    backgroundColor: colors.bgBase,
  },
});

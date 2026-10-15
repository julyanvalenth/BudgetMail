import { X } from "lucide-react-native";
import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/icon-button";
import { colors, layout, radius, spacing } from "@/theme/tokens";

export interface BottomSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
}

// Picker sheet for forms. Fades instead of sliding when reduce motion is on.
export function BottomSheet({
  visible,
  title,
  onClose,
  children,
}: PropsWithChildren<BottomSheetProps>) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? "fade" : "slide"}
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.root}
      >
        {/* Tap outside to close. Hidden from screen readers; the X button covers it */}
        <Pressable
          accessible={false}
          importantForAccessibility="no"
          onPress={onClose}
          style={styles.scrim}
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.four }]}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <AppText variant="h2" accessibilityRole="header" style={styles.title}>
              {title}
            </AppText>
            <IconButton icon={X} label="Tutup" variant="plain" onPress={onClose} />
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bgScrim,
  },
  sheet: {
    maxHeight: "85%",
    backgroundColor: colors.bgSurface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderWidth: layout.hairline,
    borderColor: colors.borderHairline,
    paddingHorizontal: spacing.five,
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
    paddingVertical: spacing.two,
  },
  title: {
    flex: 1,
  },
});

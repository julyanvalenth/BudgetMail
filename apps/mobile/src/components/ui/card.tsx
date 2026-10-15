import { StyleSheet, View, type ViewProps } from "react-native";

import { colors, layout, radius, spacing } from "@/theme/tokens";

export interface CardProps extends ViewProps {
  padded?: boolean;
}

// A lighter surface and a hairline border instead of a shadow, which barely shows on dark UI.
export function Card({ padded = true, style, ...rest }: CardProps) {
  return <View style={[styles.card, padded && styles.padded, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.card,
    borderWidth: layout.hairline,
    borderColor: colors.borderHairline,
    overflow: "hidden",
  },
  padded: {
    padding: spacing.five,
  },
});

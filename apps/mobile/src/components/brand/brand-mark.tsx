import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { colors, gradients, layout, radius } from "@/theme/tokens";

export interface BrandMarkProps {
  size?: number;
}

// Gradient tile with an envelope whose flap turns into a check mark.
export function BrandMark({ size = layout.touchTarget }: BrandMarkProps) {
  const glyph = size * 0.56;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: Math.min(radius.button, size / 3) },
      ]}
    >
      <LinearGradient
        colors={gradients.inflow}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Without this wrapper the absolute gradient paints over the glyph on web */}
      <View>
        <Svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 7.5 12 13l9-5.5M3 7v10a1.5 1.5 0 0 0 1.5 1.5H10"
            stroke={colors.textOnBrand}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="m14 17 2.5 2.5L21 14"
            stroke={colors.textOnBrand}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
});

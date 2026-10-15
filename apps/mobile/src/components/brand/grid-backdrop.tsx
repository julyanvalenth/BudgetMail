import { useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Mask, Path, Pattern, Rect, Stop } from "react-native-svg";

import { colors, spacing } from "@/theme/tokens";

const CELL = spacing.twelve;

// Faint grid behind login/onboarding, fading out toward the bottom.
export function GridBackdrop() {
  // SVG ids are global on web, and stacked screens stay mounted
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={`${uid}-grid`} width={CELL} height={CELL} patternUnits="userSpaceOnUse">
            <Path
              d={`M ${CELL} 0 L 0 0 0 ${CELL}`}
              fill="none"
              stroke={colors.borderHairline}
              strokeWidth={1}
            />
          </Pattern>
          <LinearGradient id={`${uid}-fade`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.textPrimary} stopOpacity={1} />
            <Stop offset="0.65" stopColor={colors.textPrimary} stopOpacity={0} />
          </LinearGradient>
          <Mask id={`${uid}-mask`}>
            <Rect width="100%" height="100%" fill={`url(#${uid}-fade)`} />
          </Mask>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${uid}-grid)`} mask={`url(#${uid}-mask)`} />
      </Svg>
    </View>
  );
}

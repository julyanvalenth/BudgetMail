import { useId } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { colors } from "@/theme/tokens";

export interface AmbientGlowProps {
  style?: StyleProp<ViewStyle>;
  intensity?: "soft" | "strong";
  // "top" keeps the light in the upper half. Don't crop the glow with a smaller box:
  // the gradient needs the whole box to fade out, otherwise it leaves a hard edge.
  focus?: "center" | "top";
}

const FOCUS = {
  center: { teal: { cx: "22%", cy: "30%", r: "60%" }, violet: { cx: "85%", cy: "75%", r: "55%" } },
  top: { teal: { cx: "20%", cy: "16%", r: "55%" }, violet: { cx: "90%", cy: "40%", r: "45%" } },
} as const;

// Soft teal/violet light behind a hero element. RN has no CSS blur, so it's two SVG
// radial gradients. One per screen at most.
export function AmbientGlow({ style, intensity = "soft", focus = "center" }: AmbientGlowProps) {
  const peak = intensity === "strong" ? 0.32 : 0.18;
  const { teal, violet } = FOCUS[focus];
  // SVG ids are global on web, and stacked screens stay mounted
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <View style={[StyleSheet.absoluteFill, style, { pointerEvents: "none" }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={`${uid}-teal`} {...teal}>
            <Stop offset="0" stopColor={colors.brandTeal} stopOpacity={peak} />
            <Stop offset="1" stopColor={colors.brandTeal} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${uid}-violet`} {...violet}>
            <Stop offset="0" stopColor={colors.brandViolet} stopOpacity={peak * 0.9} />
            <Stop offset="1" stopColor={colors.brandViolet} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${uid}-teal)`} />
        <Rect width="100%" height="100%" fill={`url(#${uid}-violet)`} />
      </Svg>
    </View>
  );
}

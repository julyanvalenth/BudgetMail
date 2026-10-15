// Colors, fonts and sizes from docs/Design.md §3. Dark mode only for now, but the
// names describe roles so a light theme can be added later. Components use these
// instead of hardcoded values.

export const colors = {
  bgBase: "#0B0F17",
  bgSurface: "#141B26",
  // Raised layer on top of a surface: inputs, pressed rows, segmented-control track
  bgRaised: "#1C2533",
  bgScrim: "rgba(5,8,12,0.6)",
  brandTeal: "#22D3AE",
  brandViolet: "#8B7CF6",
  borderHairline: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.16)",
  textPrimary: "#F4F6FA",
  textMuted: "#8993A8",
  // Text/icons placed on a brand-teal fill
  textOnBrand: "#0B0F17",
  signalIncome: "#22D3AE",
  signalExpense: "#FF7A66",
  signalWarning: "#F5B84C",
  signalDanger: "#FF4D4D",
  // ~15% fills behind icons, badges and banners
  tintBrand: "rgba(34,211,174,0.14)",
  tintViolet: "rgba(139,124,246,0.14)",
  tintExpense: "rgba(255,122,102,0.14)",
  tintWarning: "rgba(245,184,76,0.14)",
  tintDanger: "rgba(255,77,77,0.14)",
  glowTeal: "rgba(34,211,174,0.12)",
  glowViolet: "rgba(139,124,246,0.10)",
  transparent: "transparent",
} as const;

// Only for the Inflow line, the sync pulse and the brand mark.
export const gradients = {
  inflow: [colors.brandTeal, colors.brandViolet] as const,
};

// Category colors, checked with the dataviz palette validator against bgSurface in
// dark mode (contrast >= 3:1, adjacent colorblind ΔE >= 8.4). Assign by category,
// never by rank.
export const categoryPalette = [
  "#3987E5", // blue
  "#D95926", // orange
  "#199E70", // aqua
  "#C98500", // yellow
  "#D55181", // magenta
  "#9085E9", // violet
] as const;
// Neutral for "Lainnya"/uncategorized and folded tail segments
export const categoryNeutral = "#5D6678";

export const spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  eight: 32,
  ten: 40,
  twelve: 48,
} as const;

export const radius = {
  sm: 8,
  input: 12,
  button: 14,
  card: 20,
  sheet: 20,
  pill: 999,
} as const;

export const fonts = {
  display: "SpaceGrotesk_700Bold",
  displaySemibold: "SpaceGrotesk_600SemiBold",
  body: "Manrope_400Regular",
  bodyMedium: "Manrope_500Medium",
  bodySemibold: "Manrope_600SemiBold",
} as const;

// Type scale from Design.md §3.3. Amount styles use tabular numerals.
export const typography = {
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38 },
  h1: { fontFamily: fonts.displaySemibold, fontSize: 24, lineHeight: 30 },
  h2: { fontFamily: fonts.displaySemibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodySemibold, fontSize: 16, lineHeight: 22 },
  bodySmall: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  bodySmallStrong: { fontFamily: fonts.bodySemibold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16 },
  amountHero: {
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 40,
    fontVariant: ["tabular-nums"] as ["tabular-nums"],
  },
  amountLarge: {
    fontFamily: fonts.displaySemibold,
    fontSize: 20,
    lineHeight: 26,
    fontVariant: ["tabular-nums"] as ["tabular-nums"],
  },
  amountList: {
    fontFamily: fonts.displaySemibold,
    fontSize: 16,
    lineHeight: 22,
    fontVariant: ["tabular-nums"] as ["tabular-nums"],
  },
  amountSmall: {
    fontFamily: fonts.displaySemibold,
    fontSize: 13,
    lineHeight: 18,
    fontVariant: ["tabular-nums"] as ["tabular-nums"],
  },
  // Large numeric entry in the transaction/budget forms
  amountInput: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 48,
    fontVariant: ["tabular-nums"] as ["tabular-nums"],
  },
} as const;

export type TypographyVariant = keyof typeof typography;

export const iconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

export const iconStroke = 1.75;

export const layout = {
  // Minimum touch target, 44pt
  touchTarget: 44,
  screenGutter: 20,
  categoryIcon: 40,
  categoryIconSmall: 32,
  progressHeight: 8,
  breakdownBarHeight: 12,
  tabBarHeight: 64,
  fabSize: 56,
  hairline: 1,
  // Data/signature line weight (Inflow line, sync pulse)
  lineWeight: 2,
} as const;

export const motion = {
  fast: 150,
  base: 220,
  slow: 400,
  // Inflow trail
  inflow: 400,
  shimmer: 1200,
} as const;

export const opacity = {
  pressed: 0.72,
  disabled: 0.4,
} as const;

// Product palette: use semantic roles in screens. Artwork and map geometry have explicit exceptions.
export const palette = {
  brand: "#BD1C51",
  wine: "#760B20",
  accent: "#7955B0",
  accentFill: "#9774D0",
  background: "#F5F5F5",
  surface: "#FFFFFF",
  surfaceTint: "#FFF2F2",
  text: "#30213C",
  muted: "#66616E",
  border: "#E8DFE5",
  icon: "#EDA1B8",
  success: "#26775F",
  successTint: "#EAF7F1",
  warning: "#8C5800",
  warningTint: "#FFF5E9",
  error: "#B31848",
  errorTint: "#FFF2F4",
  info: "#3178C6",
  infoTint: "#F3EDFB",
  disabled: "#E3E7EF",
  focusSurface: "#FFFCFD",
  overlay: "#24152199",
  warningFill: "#F5A623",
  successFill: "#49A789",
  attentionFill: "#FF7155",
  dangerFill: "#D82041",
};
export const glass = {
  surface: "rgba(255, 255, 255, 0.76)",
  surfaceStrong: "rgba(255, 255, 255, 0.90)",
  surfaceSoft: "rgba(255, 242, 242, 0.80)",
  surfacePressed: "rgba(255, 242, 242, 0.94)",
  input: "rgba(255, 255, 255, 0.86)",
  brand: "rgba(189, 28, 81, 0.90)",
  wine: "rgba(118, 11, 32, 0.70)",
  wineInput: "rgba(255, 242, 242, 0.92)",
  pill: "rgba(255, 255, 255, 0.22)",
  pillBorder: "rgba(255, 255, 255, 0.48)",
  border: "rgba(232, 223, 229, 0.85)",
  specularBorder: "rgba(255, 255, 255, 0.94)",
  tintedBorder: "rgba(189, 28, 81, 0.18)",
  overlay: "rgba(36, 21, 33, 0.46)",
  fadeEdge: "rgba(245, 245, 245, 0.88)",
};
export const fonts = {
  display: "Outfit, 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'SF Pro Rounded', 'SF Pro Display', system-ui, sans-serif",
  sans: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif",
};
export const artwork = {
  cityWine: "#760A22",
  clearCream: "#FFF2F200",
  clearWine: "#760B2000",
};
export const mapCanvas = {
  land: "#F0EEEA",
  road: "#FFFFFF",
  ink: "#333333",
  user: palette.info,
};
export const colors = {
  surface: palette.background,
  achievement: palette.accentFill,
  cream: palette.surfaceTint,
  wine: palette.wine,
  cityWine: artwork.cityWine,
  pink: palette.brand,
  white: palette.surface,
  icon: palette.icon,
};
export const ui = {
  action: palette.brand,
  text: palette.text,
  muted: palette.muted,
  surface: palette.background,
  input: palette.disabled,
  accentText: palette.accent,
};
export const statusText = {
  safe: palette.success,
  moderate: palette.warning,
  attention: palette.error,
  danger: palette.error,
  requested: palette.accent,
};
export const achievementColors = {
  reviews: "#FF438B",
  votes: "#40A68C",
  places: palette.accentFill,
  improvements: "#FF5752",
  recognition: "#FFAD25",
};
export const radius = { small: 8, medium: 12, large: 20, pill: 999 };
export const layout = {
  touch: 48,
  pageMax: 520,
  pageWidth: "100%" as const,
  pagePadding: 20,
  sectionGap: 24,
  cardRadius: radius.large,
  buttonRadius: radius.medium,
};
export const typography = {
  page: 22,
  section: 18,
  card: 15,
  body: 14,
  secondary: 13,
  input: 16,
  button: 16,
  caption: 12,
  navigation: 12,
};
export const cardShadow = {
  shadowColor: palette.text,
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};
export const glassShadow = {
  shadowColor: palette.wine,
  shadowOpacity: 0.14,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 8 },
  elevation: 5,
};
export const cardSurface = {
  backgroundColor: glass.surfaceStrong,
  borderRadius: radius.large,
  padding: 20,
  borderWidth: 1,
  borderColor: glass.border,
  ...cardShadow,
};
export const glassPanel = {
  backgroundColor: glass.surfaceStrong,
  borderWidth: 1,
  borderColor: glass.tintedBorder,
  ...glassShadow,
};
export const glassAuthCard = {
  backgroundColor: "transparent",
  borderRadius: radius.large,
  borderWidth: 0,
  paddingHorizontal: 24,
  paddingVertical: 10,
};
export const pageContent = {
  width: layout.pageWidth,
  maxWidth: layout.pageMax,
  paddingHorizontal: layout.pagePadding,
  alignSelf: "center" as const,
};
export const formLayout = {
  pageMax: layout.pageMax,
  padding: layout.pagePadding,
  gap: 14,
  cardRadius: radius.large,
  controlRadius: radius.medium,
  headerRadius: radius.large,
  inputHeight: 54,
  buttonHeight: 52,
};

export const motionTiming = { pressFadeIn: 65, pressFadeOut: 220, pressScaleIn: 75, pressScaleOut: 240 };

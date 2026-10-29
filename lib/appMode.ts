// Explicit presentation builds use the real backend with labeled fictional samples.
export const demoMode = process.env.EXPO_PUBLIC_DEMO === "1";
export const showcaseEnabled = process.env.EXPO_PUBLIC_SHOWCASE === "1" && (
  (typeof __DEV__ !== "undefined" && __DEV__) || process.env.EXPO_PUBLIC_APP_ENV === "presentation"
);

import { fonts, palette, radius } from "../constants/theme";
import { createElement, memo } from "react";
import { Platform } from "react-native";

// Native mobile app typography (Outfit + Plus Jakarta Sans), GPU-optimized Apple Liquid Glass refraction, and touch-first ergonomics.
export const WebFormStyles = memo(function WebFormStyles() {
  if (Platform.OS !== "web") return null;
  return createElement(
    "style",
    null,
    `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;800&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap');

    html, body, #root {
      font-family: ${fonts.sans} !important;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
      -webkit-tap-highlight-color: transparent;
      overscroll-behavior-y: none;
    }
    div, span, p, a, button, input, textarea {
      font-family: ${fonts.sans};
      -webkit-font-smoothing: antialiased;
    }
    [role="header"], h1, h2, h3 {
      font-family: ${fonts.display} !important;
      letter-spacing: -0.025em;
    }

    /* Hide desktop scrollbars so scrolling feels like a mobile touchscreen */
    ::-webkit-scrollbar {
      width: 0px;
      height: 0px;
      background: transparent;
    }
    * {
      scrollbar-width: none;
    }

    input, textarea { outline: none !important; }
    input:focus-visible, textarea:focus-visible { box-shadow: 0 0 10px ${palette.icon} !important; }
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    input:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 1000px ${palette.surfaceTint} inset !important;
      -webkit-text-fill-color: ${palette.wine} !important;
      caret-color: ${palette.wine};
    }
    [role="button"]:focus, [role="link"]:focus, [role="tab"]:focus { outline: none !important; }
    [role="button"]:focus-visible, [role="link"]:focus-visible, [role="tab"]:focus-visible {
      box-shadow: 0 0 0 3px ${palette.icon};
      border-radius: ${radius.medium}px;
    }

    /* Apple Liquid Glass translucent surfaces with 3D specular rim (GPU-optimized 14px kernel) */
    div[style*="rgba(255, 255, 255, 0."],
    div[style*="rgba(255, 242, 242, 0."] {
      backdrop-filter: blur(14px) saturate(165%);
      -webkit-backdrop-filter: blur(14px) saturate(165%);
      box-shadow:
        inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.95),
        inset 0 -1px 1px 0 rgba(255, 255, 255, 0.5),
        0 8px 20px -6px rgba(48, 33, 60, 0.10);
    }
    div[style*="rgba(189, 28, 81, 0."],
    div[style*="rgba(118, 11, 32, 0."] {
      backdrop-filter: blur(14px) saturate(165%);
      -webkit-backdrop-filter: blur(14px) saturate(165%);
      box-shadow:
        inset 0 1px 1px 0 rgba(255, 255, 255, 0.38),
        inset 0 -1px 1px 0 rgba(118, 11, 32, 0.35),
        0 10px 22px -6px rgba(118, 11, 32, 0.22);
    }
    div[style*="rgba(36, 21, 33, 0."] {
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    /* Avoid redundant nested GPU blur passes on inner badges/pills inside an already blurred card */
    div[style*="rgba("] div[style*="rgba("] {
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }

    /* Compositor-only Apple Liquid Glass button physics without overflowing parent bounds */
    [role="button"], [role="tab"], [role="link"], [role="radio"], [role="checkbox"] {
      user-select: none;
      -webkit-user-select: none;
      transition:
        transform 0.34s cubic-bezier(0.22, 1.4, 0.36, 1),
        box-shadow 0.26s cubic-bezier(0.22, 1, 0.36, 1),
        background-color 0.2s ease !important;
      cursor: pointer;
    }
    [role="button"]:hover:not([aria-disabled="true"]),
    [role="tab"]:hover:not([aria-disabled="true"]),
    [role="radio"]:hover:not([aria-disabled="true"]) {
      transform: translate3d(0, -1px, 0) !important;
      box-shadow:
        inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.96),
        inset 0 -1px 1px 0 rgba(255, 255, 255, 0.45),
        0 6px 16px -4px rgba(189, 28, 81, 0.18);
    }
    [role="button"]:active:not([aria-disabled="true"]),
    [role="tab"]:active:not([aria-disabled="true"]),
    [role="link"]:active:not([aria-disabled="true"]),
    [role="radio"]:active:not([aria-disabled="true"]),
    [role="checkbox"]:active:not([aria-disabled="true"]) {
      transform: translate3d(0, 0.5px, 0) scale(0.965) !important;
      transition-duration: 0.07s !important;
      box-shadow:
        inset 0 2px 5px 0 rgba(255, 255, 255, 0.85),
        0 2px 8px -2px rgba(189, 28, 81, 0.22) !important;
    }
  `,
  );
});

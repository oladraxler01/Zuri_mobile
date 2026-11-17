// GENERATED from .claude/skills/zuri-design-system/tokens.json by
// scripts/generate-theme-tokens.py. Do not edit by hand.

/** Semantic colours, light theme. */
export const lightColors = {
  surface: "#fbf9f8",
  "surface-raised": "#ffffff",
  "surface-sunken": "#f0eded",
  "surface-inverse": "#17231b",
  scrim: "rgba(23, 35, 27, 0.45)",
  text: "#1b1c1c",
  "text-muted": "#434844",
  "text-subtle": "#5f6560",
  "text-on-inverse": "#fbf9f8",
  "text-on-inverse-muted": "#bbcabe",
  border: "#e4e2e1",
  "border-strong": "#737873",
  primary: "#17231b",
  "on-primary": "#ffffff",
  "primary-pressed": "#2c3930",
  accent: "#e9c349",
  "on-accent": "#17231b",
  "accent-text": "#735c00",
  tint: "#d7e6d9",
  "on-tint": "#17231b",
  focus: "#735c00",
  success: "#2f6b3a",
  "success-container": "#dfeee2",
  warning: "#8f4a00",
  "warning-container": "#fbeedd",
  danger: "#ba1a1a",
  "danger-container": "#ffdad6",
  recording: "#d92d20",
} as const;

/** Semantic colours, dark theme (same keys as light). */
export const darkColors: Record<keyof typeof lightColors, string> = {
  surface: "#0f1712",
  "surface-raised": "#18221b",
  "surface-sunken": "#0a100c",
  "surface-inverse": "#24302a",
  scrim: "rgba(0, 0, 0, 0.6)",
  text: "#eef1ee",
  "text-muted": "#b9c3bc",
  "text-subtle": "#929d95",
  "text-on-inverse": "#eef1ee",
  "text-on-inverse-muted": "#b9c3bc",
  border: "#2a362e",
  "border-strong": "#76847a",
  primary: "#d7e6d9",
  "on-primary": "#17231b",
  "primary-pressed": "#bbcabe",
  accent: "#e9c349",
  "on-accent": "#17231b",
  "accent-text": "#e9c349",
  tint: "#223328",
  "on-tint": "#d7e6d9",
  focus: "#e9c349",
  success: "#86c995",
  "success-container": "#1b3122",
  warning: "#f2ad6b",
  "warning-container": "#3a2715",
  danger: "#ffb4ab",
  "danger-container": "#5a1712",
  recording: "#ff6b5e",
};

/** Brand primitives. Screens use the semantic colours above, not these. */
export const brand = {
  forest: "#17231b",
  pine: "#2c3930",
  paper: "#fbf9f8",
  gold: "#e9c349",
  "gold-deep": "#cba72f",
  "gold-text": "#735c00",
  mint: "#d7e6d9",
  ink: "#1b1c1c",
} as const;

/** 4-pt spacing scale: space[4] = 16. */
export const space = {
  "1": 4,
  "2": 8,
  "3": 12,
  "4": 16,
  "5": 20,
  "6": 24,
  "8": 32,
  "12": 48,
} as const;

/** The five corner radii. */
export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

/** Fixed sizes (touch-target, control-height, …). */
export const size = {
  "touch-target": 48,
  "control-height": 52,
  "control-height-sm": 36,
  "tab-bar-height": 64,
  "icon-sm": 16,
  "icon-md": 20,
  "icon-lg": 24,
  "record-button": 72,
} as const;

/** Type styles: spread into a Text style, e.g. {...type.headline}. */
export const type = {
  display: {
    fontFamily: "SourceSerif4_600SemiBold",
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.68,
  },
  "title-1": {
    fontFamily: "SourceSerif4_600SemiBold",
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.56,
  },
  "title-2": {
    fontFamily: "SourceSerif4_600SemiBold",
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.44,
  },
  headline: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    lineHeight: 22,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 24,
  },
  callout: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 20,
  },
  subhead: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  footnote: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  caption: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 16,
  },
  eyebrow: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  stat: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.64,
    fontVariant: ["tabular-nums"],
  },
} as const;

/** CSS box-shadow strings per theme; undefined means no shadow (dark cards use a hairline instead). */
export const lightShadows: Record<ShadowName, string | undefined> = {
  card: "0 1px 2px rgba(23, 35, 27, 0.06), 0 6px 16px rgba(23, 35, 27, 0.06)",
  raised: "0 8px 24px rgba(23, 35, 27, 0.14)",
  sheet: "0 -8px 32px rgba(23, 35, 27, 0.16)",
};
export const darkShadows: Record<ShadowName, string | undefined> = {
  card: undefined,
  raised: "0 8px 24px rgba(0, 0, 0, 0.5)",
  sheet: "0 -8px 32px rgba(0, 0, 0, 0.6)",
};

export type ColorName = keyof typeof lightColors;
export type TypeStyle = keyof typeof type;
export type SizeName = keyof typeof size;
export type ShadowName = "card" | "raised" | "sheet";

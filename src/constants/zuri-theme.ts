/**
 * Zuri Design System
 * Extracted from the Stitch-generated design tokens.
 * All colors follow Material Design 3 naming conventions.
 */

// ─── Color Palette ───────────────────────────────────────────────
export const ZuriColors = {
  // Core surfaces
  surface: '#fbf9f8',
  background: '#fbf9f8',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f6f3f2',
  surfaceContainer: '#f0eded',
  surfaceContainerHigh: '#eae8e7',
  surfaceContainerHighest: '#e4e2e1',
  surfaceBright: '#fbf9f8',
  surfaceDim: '#dcd9d9',
  surfaceVariant: '#e4e2e1',
  surfaceTint: '#546257',

  // Primary
  primary: '#17231b',
  primaryContainer: '#2c3930',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#94a397',
  primaryFixed: '#d7e6d9',
  primaryFixedDim: '#bbcabe',
  onPrimaryFixed: '#121e16',
  onPrimaryFixedVariant: '#3d4a40',
  inversePrimary: '#bbcabe',

  // Secondary
  secondary: '#5e5e5c',
  secondaryContainer: '#e1dfdc',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#636360',
  secondaryFixed: '#e4e2de',
  secondaryFixedDim: '#c8c6c3',
  onSecondaryFixed: '#1b1c1a',
  onSecondaryFixedVariant: '#474744',

  // Tertiary (Gold/Amber accent)
  tertiary: '#735c00',
  tertiaryContainer: '#cba72f',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#4e3d00',
  tertiaryFixed: '#ffe088',
  tertiaryFixedDim: '#e9c349',
  onTertiaryFixed: '#241a00',
  onTertiaryFixedVariant: '#574500',

  // Error
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  onErrorContainer: '#93000a',

  // On-surface
  onSurface: '#1b1c1c',
  onSurfaceVariant: '#434844',
  onBackground: '#1b1c1c',

  // Outline
  outline: '#737873',
  outlineVariant: '#c3c8c2',

  // Inverse
  inverseSurface: '#303030',
  inverseOnSurface: '#f3f0f0',
} as const;

// ─── Typography ──────────────────────────────────────────────────
export const ZuriFonts = {
  headlineLg: 'SourceSerif4_600SemiBold',
  headlineLgMobile: 'SourceSerif4_600SemiBold',
  headlineMd: 'SourceSerif4_600SemiBold',
  headlineMedium: 'SourceSerif4_600SemiBold',
  displayBold: 'SourceSerif4_600SemiBold',
  bodyLg: 'Inter_400Regular',
  bodyMd: 'Inter_400Regular',
  bodyRegular: 'Inter_400Regular',
  bodyMdMedium: 'Inter_500Medium',
  bodyMedium: 'Inter_500Medium',
  labelSm: 'Inter_500Medium',
  labelSmBold: 'Inter_600SemiBold',
} as const;

export const ZuriFontSizes = {
  headlineLg: { fontSize: 32, lineHeight: 38.4, fontWeight: '600' as const, letterSpacing: -0.64 },
  headlineLgMobile: { fontSize: 28, lineHeight: 33.6, fontWeight: '600' as const },
  headlineMd: { fontSize: 24, lineHeight: 31.2, fontWeight: '600' as const },
  bodyLg: { fontSize: 16, lineHeight: 25.6, fontWeight: '400' as const },
  bodyMd: { fontSize: 14, lineHeight: 21, fontWeight: '400' as const },
  labelSm: { fontSize: 13, lineHeight: 18.2, fontWeight: '500' as const },
} as const;

// ─── Spacing ─────────────────────────────────────────────────────
export const ZuriSpacing = {
  base: 4,
  xs: 8,
  sm: 16,
  stackGap: 20,
  md: 24,
  containerPaddingH: 24,
  lg: 48,
  xl: 64,
} as const;

// ─── Border Radius ───────────────────────────────────────────────
export const ZuriRadius = {
  default: 4,
  lg: 8,
  xl: 12,
  full: 9999,
} as const;

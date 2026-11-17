import { brand, lightColors as t } from '@/theme/tokens';

/**
 * @deprecated Use `@/theme` instead: `useTheme()` for colours (light and dark),
 * spacing and radii, and `<Text variant>` for type. Kept as an alias while
 * screens move to tokens (design system §8); delete it once nothing imports it.
 *
 * Keys that have a design-system token now point at it. Every one of them had
 * the same value already, so nothing changes visually. Keys with no token keep
 * their old literal; don't use them in new code.
 */

// ─── Color Palette ───────────────────────────────────────────────
export const ZuriColors = {
  // Core surfaces
  surface: t.surface,
  background: t.surface,
  surfaceContainerLowest: t['surface-raised'],
  surfaceContainerLow: '#f6f3f2',
  surfaceContainer: t['surface-sunken'],
  surfaceContainerHigh: '#eae8e7',
  surfaceContainerHighest: t.border,
  surfaceBright: t.surface,
  surfaceDim: '#dcd9d9',
  surfaceVariant: t.border,
  surfaceTint: '#546257',

  // Primary
  primary: t.primary,
  primaryContainer: t['primary-pressed'],
  onPrimary: t['on-primary'],
  onPrimaryContainer: '#94a397',
  primaryFixed: t.tint,
  primaryFixedDim: t['text-on-inverse-muted'],
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
  tertiary: t['accent-text'],
  tertiaryContainer: brand['gold-deep'],
  onTertiary: '#ffffff',
  onTertiaryContainer: '#4e3d00',
  tertiaryFixed: '#ffe088',
  tertiaryFixedDim: t.accent,
  onTertiaryFixed: '#241a00',
  onTertiaryFixedVariant: '#574500',

  // Error
  error: t.danger,
  errorContainer: t['danger-container'],
  onError: '#ffffff',
  onErrorContainer: '#93000a',

  // On-surface
  onSurface: t.text,
  onSurfaceVariant: t['text-muted'],
  onBackground: t.text,

  // Outline
  outline: t['border-strong'],
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

import { useColorScheme } from 'react-native';
import { darkColors, lightColors, radius, size, space, type, type ColorName } from '@/theme/tokens';

export { lightColors, darkColors, radius, size, space, type };
export type { ColorName };

/**
 * Dark mode stays off until every screen in the student loop is on tokens
 * (docs/MOBILE_ROADMAP.md, Phase 0; design system migration.md step 4).
 * Until then useTheme() always returns the light colours, so migrated and
 * unmigrated screens look the same.
 */
export const DARK_MODE_ENABLED = false;

export type ThemeColors = Record<ColorName, string>;

/** The design system's tokens for the current theme: { colors, space, radius, size, type, dark }. */
export function useTheme() {
  const scheme = useColorScheme();
  const dark = DARK_MODE_ENABLED && scheme === 'dark';
  const colors: ThemeColors = dark ? darkColors : lightColors;
  return { colors, space, radius, size, type, dark };
}

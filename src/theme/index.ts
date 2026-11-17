/**
 * The Zuri Mobile design system in code.
 *
 *   import { useTheme, Text, Button, Card } from '@/theme';
 *
 * Values come from src/theme/tokens.ts, generated from
 * .claude/skills/zuri-design-system/tokens.json by
 * scripts/generate-theme-tokens.py (npm run tokens). Don't add colours,
 * sizes or radii anywhere else.
 */
export {
  lightColors,
  darkColors,
  brand,
  space,
  radius,
  size,
  type,
  lightShadows,
  darkShadows,
} from './tokens';
export type { ColorName, TypeStyle, SizeName, ShadowName } from './tokens';

export {
  ThemeProvider,
  useTheme,
  useAppearance,
  buildTheme,
  DARK_MODE_ENABLED,
  type Theme,
  type ThemeColors,
  type AppearancePreference,
  type ColorScheme,
} from './theme-provider';
export { Text, MAX_FONT_SCALE, type TextProps } from './text';
export { haptics } from './haptics';

export { Button, type ButtonProps, type ButtonVariant } from './components/button';
export { Card, type CardProps } from './components/card';
export { ListGroup, ListRow, LIST_ROW_MIN_HEIGHT, type ListRowProps } from './components/list-row';
export { Chip, type ChipProps, type ChipStatus } from './components/chip';
export { TextField, type TextFieldProps } from './components/text-field';
export { StateView, Skeleton, type StateViewProps, type StateKind } from './components/state-view';
export { BottomSheet, type BottomSheetProps, type SheetAction } from './components/bottom-sheet';

import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme } from './theme-provider';
import type { ColorToken, TypeVariant } from './tokens';

/** Font scaling cap from the design system: support up to 1.3×. */
export const MAX_FONT_SCALE = 1.3;

export interface TextProps extends RNTextProps {
  /** A type style from the design system. Defaults to `body`. */
  variant?: TypeVariant;
  /** A colour token. Defaults to `text`. */
  color?: ColorToken;
}

/**
 * Text with a design-system type style and colour.
 *
 *   <Text variant="eyebrow" color="accent-text">BEFORE CLASS</Text>
 *   <Text variant="stat">67%</Text>
 *
 * `stat` always uses tabular numerals. Eyebrow text is written in capitals in
 * the source, so no textTransform is applied.
 */
export function Text({ variant = 'body', color = 'text', style, maxFontSizeMultiplier, ...rest }: TextProps) {
  const theme = useTheme();
  const base: TextStyle = {
    ...theme.type[variant],
    color: theme.colors[color],
    ...(variant === 'stat' ? { fontVariant: ['tabular-nums'] } : null),
  };
  return (
    <RNText
      allowFontScaling
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? MAX_FONT_SCALE}
      style={[base, style]}
      {...rest}
    />
  );
}

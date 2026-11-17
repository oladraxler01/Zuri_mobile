import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme-provider';
import { Text } from '../text';
import { haptics } from '../haptics';
import type { ColorToken } from '../tokens';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'text' | 'danger';

export interface ButtonProps {
  /** A verb in sentence case: "Start class", "Upload notes". */
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** `sm` only inside cards and rows. */
  size?: 'md' | 'sm';
  /** Leading Ionicons name. */
  icon?: IoniconName;
  loading?: boolean;
  disabled?: boolean;
  /** Full width: the bottom of onboarding steps and sheets. */
  block?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

const FILL: Record<ButtonVariant, { bg?: ColorToken; pressed?: ColorToken; fg: ColorToken; border?: ColorToken }> = {
  primary: { bg: 'primary', pressed: 'primary-pressed', fg: 'on-primary' },
  secondary: { fg: 'text', border: 'border-strong' },
  tonal: { bg: 'tint', fg: 'on-tint' },
  text: { fg: 'accent-text' },
  danger: { bg: 'danger-container', fg: 'danger' },
};

/** Pressed overlay for variants with no dedicated pressed colour: 8% of the text colour. */
const OVERLAY_ALPHA = '14'; // 0x14 / 0xff ≈ 8%

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  block = false,
  accessibilityLabel,
  accessibilityHint,
  style,
}: ButtonProps) {
  const { colors, radius, size: sizes, space } = useTheme();
  const fill = FILL[variant];
  const inactive = disabled || loading;
  const fg = colors[fill.fg];
  const small = size === 'sm';
  const height = small ? sizes.controlHeightSm : sizes.controlHeight;

  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress();
      }}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      // Keep the hit area at the 48px touch target even for small buttons.
      hitSlop={Math.max(0, (sizes.touchTarget - height) / 2)}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: height,
          borderRadius: small ? radius.sm : radius.md,
          paddingHorizontal: variant === 'text' ? space[2] : small ? space[4] : space[6],
          backgroundColor:
            pressed && fill.pressed
              ? colors[fill.pressed]
              : fill.bg
                ? colors[fill.bg]
                : 'transparent',
          borderWidth: fill.border ? 1 : 0,
          borderColor: fill.border ? colors[fill.border] : undefined,
          opacity: disabled ? 0.45 : 1,
        },
        block && styles.block,
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          {pressed && !fill.pressed && (
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: fg + OVERLAY_ALPHA, borderRadius: small ? radius.sm : radius.md }]}
            />
          )}
          {loading ? (
            <ActivityIndicator size="small" color={fg} style={{ marginRight: space[2] }} />
          ) : icon ? (
            <Ionicons name={icon} size={sizes.iconMd} color={fg} style={{ marginRight: space[2] }} />
          ) : null}
          <Text variant={small ? 'subhead' : 'headline'} color={fill.fg} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  block: {
    alignSelf: 'stretch',
  },
});

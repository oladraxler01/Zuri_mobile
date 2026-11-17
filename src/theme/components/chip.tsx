import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme-provider';
import { Text } from '../text';
import type { ColorName } from '../tokens';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export type ChipStatus = 'success' | 'warning' | 'danger';

const CHIP_HEIGHT = 32;

const STATUS_ICON: Record<ChipStatus, IoniconName> = {
  success: 'checkmark-circle',
  warning: 'alert-circle',
  danger: 'close-circle',
};

export interface ChipProps {
  label: string;
  icon?: IoniconName;
  /** Choice/filter chips: selected shows tint plus a check icon. */
  selected?: boolean;
  /** Status chips always show an icon and a word ("Due tomorrow"). */
  status?: ChipStatus;
  onPress?: () => void;
  /** 'checkbox' for multi-select groups, 'radio' for single-select. */
  role?: 'checkbox' | 'radio';
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, icon, selected = false, status, onPress, role = 'checkbox', style }: ChipProps) {
  const { colors, radius, space, size } = useTheme();

  let bg: ColorName = 'surface-sunken';
  let fg: ColorName = 'text-muted';
  let glyph: IoniconName | undefined = icon;

  if (status) {
    bg = `${status}-container` as ColorName;
    fg = status;
    glyph = icon ?? STATUS_ICON[status];
  } else if (selected) {
    bg = 'tint';
    fg = 'on-tint';
    glyph = 'checkmark';
  }

  const chipStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    height: CHIP_HEIGHT,
    paddingHorizontal: space[3],
    gap: space[1],
    borderRadius: radius.sm,
    backgroundColor: colors[bg],
  };

  const content = (
    <>
      {glyph ? <Ionicons name={glyph} size={size['icon-sm']} color={colors[fg]} /> : null}
      <Text variant="caption" color={fg} numberOfLines={1}>
        {label}
      </Text>
    </>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label} style={[chipStyle, style]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      hitSlop={(size['touch-target'] - CHIP_HEIGHT) / 2}
      style={({ pressed }) => [chipStyle, pressed && { opacity: 0.8 }, style]}
    >
      {content}
    </Pressable>
  );
}

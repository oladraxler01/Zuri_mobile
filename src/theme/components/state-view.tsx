import React from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme-provider';
import { Text } from '../text';
import { Button } from './button';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export type StateKind = 'empty' | 'error' | 'offline';

export interface StateViewProps {
  kind: StateKind;
  title?: string;
  /** One sentence: what will appear and how to add the first one, or what to do. */
  body: string;
  icon?: IoniconName;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Empty, error and offline states. Loading uses <Skeleton> instead.
 * `offline` renders as a warning banner for the top of a screen, with cached
 * content below it.
 */
export function StateView({ kind, title, body, icon, actionLabel, onAction, style }: StateViewProps) {
  const { colors, radius, space, size } = useTheme();

  if (kind === 'offline') {
    return (
      <View
        accessibilityRole="alert"
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: space[2],
            paddingHorizontal: space[4],
            paddingVertical: space[3],
            backgroundColor: colors['warning-container'],
            borderRadius: radius.md,
          },
          style,
        ]}
      >
        <Ionicons name={icon ?? 'cloud-offline-outline'} size={size.iconMd} color={colors.warning} />
        <Text variant="subhead" color="warning" style={{ flex: 1 }}>
          {body}
        </Text>
      </View>
    );
  }

  const isError = kind === 'error';
  return (
    <View style={[{ alignItems: 'center', padding: space[8], gap: space[3] }, style]}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isError ? colors['danger-container'] : colors.tint,
          marginBottom: space[1],
        }}
      >
        <Ionicons
          name={icon ?? (isError ? 'alert-circle-outline' : 'folder-open-outline')}
          size={size.iconLg}
          color={isError ? colors.danger : colors['on-tint']}
        />
      </View>
      {title ? (
        <Text variant="headline" style={{ textAlign: 'center' }} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      <Text variant="callout" color="text-muted" style={{ textAlign: 'center' }}>
        {body}
      </Text>
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant={isError ? 'secondary' : 'primary'}
          icon={isError ? 'refresh' : undefined}
          style={{ alignSelf: 'center', marginTop: space[2] }}
        />
      ) : null}
    </View>
  );
}

/** A loading placeholder block on surface-sunken. Shape it like the content. */
export function Skeleton({
  width = '100%',
  height = 16,
  rounded = 'sm',
  style,
}: {
  width?: DimensionValue;
  height?: number;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, radius } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius[rounded], backgroundColor: colors['surface-sunken'] }, style]}
    />
  );
}

import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme-provider';
import { Text } from '../text';

export interface CardProps {
  /** Written in capitals: "AFTER CLASS". */
  eyebrow?: string;
  title?: string;
  body?: string;
  /** At most one button row, e.g. <Button size="sm" … />. */
  action?: React.ReactNode;
  /** Makes the whole card tappable. Don't add a separate "Open" button then. */
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * The default container for one idea on Home, Course and Plan.
 * Don't nest cards and don't add a coloured left border.
 */
export function Card({ eyebrow, title, body, action, onPress, accessibilityLabel, style, children }: CardProps) {
  const { colors, radius, space, shadows, scheme } = useTheme();

  const container: ViewStyle = {
    backgroundColor: colors['surface-raised'],
    borderRadius: radius.lg,
    padding: space[4],
    gap: space[2],
    ...(scheme === 'dark'
      ? { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }
      : { boxShadow: shadows.card }),
  };

  const content = (
    <>
      {eyebrow ? (
        <Text variant="eyebrow" color="accent-text">
          {eyebrow}
        </Text>
      ) : null}
      {title ? <Text variant="headline">{title}</Text> : null}
      {body ? (
        <Text variant="callout" color="text-muted">
          {body}
        </Text>
      ) : null}
      {children}
      {action ? <View style={[styles.actions, { gap: space[2], marginTop: space[2] }]}>{action}</View> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? [eyebrow, title, body].filter(Boolean).join('. ')}
        style={({ pressed }) => [container, pressed && { opacity: 0.92 }, style]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View accessible={!action} accessibilityLabel={accessibilityLabel} style={[container, style]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
});

import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme-provider';
import { Text } from '../text';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** Minimum row height from the spec. */
export const LIST_ROW_MIN_HEIGHT = 60;

/**
 * A grouped list (as in Settings): surface-raised, radius-md, rows divided by
 * hairlines. Put <ListRow>s inside it.
 */
export function ListGroup({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors, radius, shadows, scheme } = useTheme();
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View
      style={[
        {
          backgroundColor: colors['surface-raised'],
          borderRadius: radius.md,
          overflow: 'hidden',
          ...(scheme === 'dark'
            ? { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }
            : { boxShadow: shadows.card }),
        },
        style,
      ]}
    >
      {rows.map((row, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />}
          {row}
        </React.Fragment>
      ))}
    </View>
  );
}

export interface ListRowProps {
  title: string;
  meta?: string;
  /** Leading Ionicons glyph in a tint icon well. */
  icon?: IoniconName;
  /** Leading course colour square instead of an icon. */
  leadingColor?: string;
  /** Chip, switch or anything else. Defaults to a chevron when onPress is set. */
  trailing?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
}

export function ListRow({ title, meta, icon, leadingColor, trailing, onPress, onLongPress, accessibilityLabel }: ListRowProps) {
  const { colors, radius, space, size } = useTheme();

  const leading = icon ? (
    <View style={[styles.well, { backgroundColor: colors.tint, borderRadius: radius.sm }]}>
      <Ionicons name={icon} size={size.iconMd} color={colors['on-tint']} />
    </View>
  ) : leadingColor ? (
    <View style={[styles.well, { backgroundColor: leadingColor, borderRadius: radius.sm }]} />
  ) : null;

  const end =
    trailing ?? (onPress ? <Ionicons name="chevron-forward" size={size.iconMd} color={colors['text-subtle']} /> : null);

  const body = (
    <>
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="headline" style={styles.title}>
          {title}
        </Text>
        {meta ? (
          <Text variant="footnote" color="text-subtle">
            {meta}
          </Text>
        ) : null}
      </View>
      {end}
    </>
  );

  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: LIST_ROW_MIN_HEIGHT,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    gap: space[3],
  };

  if (!onPress && !onLongPress) {
    return (
      <View accessible accessibilityLabel={accessibilityLabel ?? [title, meta].filter(Boolean).join(', ')} style={rowStyle}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [title, meta].filter(Boolean).join(', ')}
      android_ripple={{ color: colors.border }}
      style={({ pressed }) => [rowStyle, pressed && { backgroundColor: colors['surface-sunken'] }]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  well: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The spec asks for 16px semibold titles in rows (headline is 17).
  title: {
    fontSize: 16,
  },
});

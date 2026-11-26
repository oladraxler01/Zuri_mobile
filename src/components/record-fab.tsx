import React from 'react';
import { Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, makeStyles, useTheme, haptics } from '@/theme';

/**
 * "Record" floats above the tab bar on every tab: one tap and the lecture is
 * being recorded. No course to pick first; the class on now (from the timetable)
 * is used if there is one, otherwise it's sorted into a course afterwards.
 */
export function RecordFab({ bottom }: { bottom: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Record a lecture now"
        accessibilityHint="Starts recording straight away. You can choose the course later."
        onPress={() => {
          haptics.light();
          router.push({ pathname: '/lecture-recording', params: { quick: '1' } } as unknown as Href);
        }}
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
      >
        <Ionicons name="mic" size={22} color={colors['on-primary']} />
        <Text variant="headline" color="on-primary">
          Record
        </Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { position: 'absolute', left: t.space[4] },
  fab: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[2],
    paddingHorizontal: t.space[5],
    borderRadius: t.radius.full,
    backgroundColor: t.colors.primary,
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.25)',
  },
  pressed: { transform: [{ scale: 0.96 }] },
}));

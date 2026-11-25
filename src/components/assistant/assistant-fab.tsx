import React from 'react';
import { Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { makeStyles, useTheme, haptics } from '@/theme';

/** The round Zuri button that floats above the tab bar and opens the assistant. */
export function AssistantFab({ bottom }: { bottom: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Zuri Assistant"
        accessibilityHint="Ask about your classes, tests and deadlines"
        onPress={() => {
          haptics.light();
          router.push('/assistant' as Href);
        }}
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
      >
        <Ionicons name="sparkles" size={26} color={colors['on-accent']} />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { position: 'absolute', right: t.space[4] },
  fab: {
    width: 58,
    height: 58,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: t.colors.primary,
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.25)',
  },
  pressed: { transform: [{ scale: 0.94 }] },
}));

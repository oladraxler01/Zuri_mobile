import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { ASSESSMENT_KINDS, type Assessment } from '@/types/planner';
import { daysUntil, describeDue } from '@/utils/planner';
import { lightColors, makeStyles, useTheme, type ThemeColors } from '@/theme';

export function kindMeta(kind: Assessment['kind']) {
  return ASSESSMENT_KINDS.find((k) => k.key === kind) ?? ASSESSMENT_KINDS[0];
}

/**
 * Colour for how urgent a deadline is. Pass the theme's colours from
 * useTheme(); screens not yet on tokens get the light palette.
 */
export function urgencyColor(a: Assessment, now = new Date(), colors: ThemeColors = lightColors) {
  if (a.status === 'done') return colors.success;
  if (new Date(a.dueAt) < now) return colors.danger;
  if (daysUntil(a.dueAt, now) <= 2) return colors.warning;
  return colors['text-subtle'];
}

export function AssessmentCard({ item, showCourse = true }: { item: Assessment; showCourse?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const meta = kindMeta(item.kind);
  const done = item.steps.filter((s) => s.done).length;
  const color = urgencyColor(item, new Date(), colors);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => router.push(`/assessment/${item.id}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label}: ${item.title}, ${describeDue(item)}`}
    >
      <View style={[styles.icon, item.status === 'done' && { backgroundColor: colors['success-container'] }]}>
        <Ionicons name={item.status === 'done' ? 'checkmark' : meta.icon} size={18} color={item.status === 'done' ? colors.success : colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.eyebrow}>
          {showCourse ? `${item.courseCode} · ` : ''}
          {meta.label.toUpperCase()}
          {item.weight ? ` · ${item.weight}%` : ''}
        </Text>
        <Text style={[styles.title, item.status === 'done' && styles.titleDone]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.due, { color }]}>{item.status === 'done' ? 'Completed' : describeDue(item)}</Text>
        {item.steps.length > 0 && item.status !== 'done' && (
          <View style={styles.progressRow}>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(done / item.steps.length) * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {done}/{item.steps.length}
            </Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors['text-subtle']} />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: t.colors['surface-raised'],
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: 16,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  icon: {
    width: 42,
    height: 42,
    borderRadius: t.radius.md,
    backgroundColor: t.colors['surface-sunken'],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  eyebrow: { ...t.type.caption, letterSpacing: 0.8, color: t.colors['accent-text'], marginBottom: 2 },
  title: { ...t.type.subhead, color: t.colors.text },
  titleDone: { color: t.colors['text-subtle'], textDecorationLine: 'line-through' },
  due: { ...t.type.subhead, marginTop: 3 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  track: { flex: 1, height: 4, borderRadius: t.radius.full, backgroundColor: t.colors['surface-sunken'], overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: t.colors.accent },
  progressText: { ...t.type.caption, color: t.colors['text-subtle'] },
}));

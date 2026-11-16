import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { ASSESSMENT_KINDS, type Assessment } from '@/types/planner';
import { daysUntil, describeDue } from '@/utils/planner';

export function kindMeta(kind: Assessment['kind']) {
  return ASSESSMENT_KINDS.find((k) => k.key === kind) ?? ASSESSMENT_KINDS[0];
}

/** Colour for how urgent a deadline is. */
export function urgencyColor(a: Assessment, now = new Date()) {
  if (a.status === 'done') return UI.success;
  if (new Date(a.dueAt) < now) return UI.error;
  if (daysUntil(a.dueAt, now) <= 2) return UI.amber;
  return UI.muted;
}

export function AssessmentCard({ item, showCourse = true }: { item: Assessment; showCourse?: boolean }) {
  const meta = kindMeta(item.kind);
  const done = item.steps.filter((s) => s.done).length;
  const color = urgencyColor(item);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => router.push(`/assessment/${item.id}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label}: ${item.title}, ${describeDue(item)}`}
    >
      <View style={[styles.icon, item.status === 'done' && { backgroundColor: UI.successSoft }]}>
        <Ionicons name={item.status === 'done' ? 'checkmark' : meta.icon} size={18} color={item.status === 'done' ? UI.success : UI.ink} />
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
      <Ionicons name="chevron-forward" size={18} color={UI.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 16,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: UI.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  eyebrow: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, letterSpacing: 0.8, color: UI.amber, marginBottom: 2 },
  title: { fontFamily: ZuriFonts.bodyMedium, fontSize: 15, lineHeight: 21, color: UI.ink },
  titleDone: { color: UI.muted, textDecorationLine: 'line-through' },
  due: { fontFamily: ZuriFonts.labelSmBold, fontSize: 13, marginTop: 3 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  track: { flex: 1, height: 4, borderRadius: 2, backgroundColor: UI.cardMuted, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: UI.amber },
  progressText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, color: UI.muted },
});

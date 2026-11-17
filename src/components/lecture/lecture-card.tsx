import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import type { Lecture } from '@/types/lecture';
import { formatDuration, formatLectureDate } from '@/utils/time';
import { makeStyles, useTheme } from '@/theme';

export function lectureTitle(lecture: Lecture): string {
  return lecture.analysis?.title ?? `${lecture.courseCode} lecture`;
}

export function StatusPill({ lecture }: { lecture: Lecture }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { status, progress } = lecture;
  if (status === 'ready') {
    return (
      <View style={[styles.pill, { backgroundColor: colors['success-container'] }]}>
        <Ionicons name="checkmark" size={12} color={colors.success} />
        <Text style={[styles.pillText, { color: colors.success }]}>Ready</Text>
      </View>
    );
  }
  if (status === 'failed') {
    return (
      <View style={[styles.pill, { backgroundColor: colors['danger-container'] }]}>
        <Ionicons name="alert-circle" size={12} color={colors.danger} />
        <Text style={[styles.pillText, { color: colors.danger }]}>Needs attention</Text>
      </View>
    );
  }
  if (status === 'waiting') {
    return (
      <View style={[styles.pill, { backgroundColor: colors['surface-sunken'] }]}>
        <Ionicons name="cloud-offline-outline" size={12} color={colors['text-muted']} />
        <Text style={[styles.pillText, { color: colors['text-muted'] }]}>Waiting for internet</Text>
      </View>
    );
  }
  const label =
    status === 'uploading'
      ? `Uploading ${Math.round(Number(progress ?? 0) * 100)}%`
      : 'Processing';
  return (
    <View style={[styles.pill, { backgroundColor: colors['warning-container'] }]}>
      <Ionicons name="sync" size={12} color={colors.warning} />
      <Text style={[styles.pillText, { color: colors.warning }]}>{label}</Text>
    </View>
  );
}

export function LectureCard({ lecture, showCourse = true }: { lecture: Lecture; showCourse?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => router.push(`/lecture/${lecture.id}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={`${lecture.courseCode} lecture, ${formatLectureDate(lecture.createdAt)}`}
    >
      <View style={styles.iconBox}>
        <Ionicons name="mic" size={18} color={colors.text} />
      </View>
      <View style={styles.body}>
        {showCourse && <Text style={styles.course}>{lecture.courseCode}</Text>}
        <Text style={styles.title} numberOfLines={2}>
          {lectureTitle(lecture)}
        </Text>
        <Text style={styles.meta}>
          {formatLectureDate(lecture.createdAt)} · {formatDuration(lecture.durationSeconds)}
        </Text>
        <View style={{ marginTop: 8 }}>
          <StatusPill lecture={lecture} />
        </View>
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
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: t.radius.md,
    backgroundColor: t.colors['surface-sunken'],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  body: {
    flex: 1,
  },
  course: { ...t.type.eyebrow, color: t.colors['accent-text'],
    marginBottom: 2,
  },
  title: { ...t.type.subhead, color: t.colors.text,
  },
  meta: { ...t.type.footnote, color: t.colors['text-subtle'],
    marginTop: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: t.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: { ...t.type.caption, },
}));

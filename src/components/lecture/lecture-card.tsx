import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import type { Lecture } from '@/types/lecture';
import { formatDuration, formatLectureDate } from '@/utils/time';

export function lectureTitle(lecture: Lecture): string {
  return lecture.analysis?.title ?? `${lecture.courseCode} lecture`;
}

export function StatusPill({ lecture }: { lecture: Lecture }) {
  const { status, progress } = lecture;
  if (status === 'ready') {
    return (
      <View style={[styles.pill, { backgroundColor: UI.successSoft }]}>
        <Ionicons name="checkmark" size={12} color={UI.success} />
        <Text style={[styles.pillText, { color: UI.success }]}>Ready</Text>
      </View>
    );
  }
  if (status === 'failed') {
    return (
      <View style={[styles.pill, { backgroundColor: UI.errorSoft }]}>
        <Ionicons name="alert-circle" size={12} color={UI.error} />
        <Text style={[styles.pillText, { color: UI.error }]}>Needs attention</Text>
      </View>
    );
  }
  if (status === 'waiting') {
    return (
      <View style={[styles.pill, { backgroundColor: UI.cardMuted }]}>
        <Ionicons name="cloud-offline-outline" size={12} color={UI.inkSoft} />
        <Text style={[styles.pillText, { color: UI.inkSoft }]}>Waiting for internet</Text>
      </View>
    );
  }
  const label =
    status === 'uploading'
      ? `Uploading ${Math.round((progress ?? 0) * 100)}%`
      : 'Processing';
  return (
    <View style={[styles.pill, { backgroundColor: UI.amberSoft }]}>
      <Ionicons name="sync" size={12} color={UI.amber} />
      <Text style={[styles.pillText, { color: UI.amber }]}>{label}</Text>
    </View>
  );
}

export function LectureCard({ lecture, showCourse = true }: { lecture: Lecture; showCourse?: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => router.push(`/lecture/${lecture.id}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={`${lecture.courseCode} lecture, ${formatLectureDate(lecture.createdAt)}`}
    >
      <View style={styles.iconBox}>
        <Ionicons name="mic" size={18} color={UI.ink} />
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
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: UI.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  body: {
    flex: 1,
  },
  course: {
    fontFamily: ZuriFonts.labelSmBold,
    fontSize: 11,
    letterSpacing: 1,
    color: UI.amber,
    marginBottom: 2,
  },
  title: {
    fontFamily: ZuriFonts.bodyMedium,
    fontSize: 15,
    lineHeight: 21,
    color: UI.ink,
  },
  meta: {
    fontFamily: ZuriFonts.bodyRegular,
    fontSize: 13,
    color: UI.muted,
    marginTop: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: {
    fontFamily: ZuriFonts.labelSmBold,
    fontSize: 11,
  },
});

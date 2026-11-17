import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useAcademic, type CourseItem } from '@/context/academic-context';
import { getWeakTopics, type TimelineCardDTO, type WeakTopicDTO } from '@/services/academic-api';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const CARD_ICON: Record<string, IoniconName> = {
  class_countdown: 'time-outline',
  pre_class_prep: 'book-outline',
  post_class_summary: 'document-text-outline',
  deadline: 'calendar-outline',
  practice_gap: 'fitness-outline',
  lecturer_revision_pack: 'school-outline',
};

/** Where a timeline card's action takes the student. */
function routeFor(card: TimelineCardDTO, courses: CourseItem[]): Href | null {
  const course = courses.find(
    (c) => c.serverId === card.course_id || (card.course_code && c.code.toLowerCase() === card.course_code.toLowerCase())
  );
  switch (card.action_type) {
    case 'view_class':
      return '/upcoming-lecture' as Href;
    case 'open_deadline':
      return '/(tabs)/plan' as Href;
    case 'review_summary':
      return (course ? `/course/${course.id}` : '/lectures') as Href;
    case 'start_diagnostic':
    case 'solve_gap':
      return { pathname: '/study/session', params: { courseId: course?.id ?? '', mode: 'weak' } } as unknown as Href;
    default:
      return course ? (`/course/${course.id}` as Href) : null;
  }
}

/**
 * Home: today's cards from Zuri's academic service (GET /academic/today).
 * Tapping one records it (POST …/act) and opens the right screen; × dismisses it (POST …/dismiss).
 * Renders nothing when the server has no cards (e.g. signed out, or no catalogue courses).
 */
export function TodayFromZuri() {
  const styles = useStyles();
  const { colors, size } = useTheme();
  const { todayTimeline, actOnTimelineCard, dismissTimelineCard, state } = useAcademic();
  const cards = (todayTimeline?.cards ?? [])
    .filter((c) => !c.is_dismissed && !c.is_acted_upon)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 4);
  if (!cards.length) return null;

  const open = (card: TimelineCardDTO) => {
    actOnTimelineCard(card.id).catch(() => {});
    const to = routeFor(card, state.courses);
    if (to) router.push(to);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Today from Zuri</Text>
      <View style={styles.card}>
        {cards.map((c, i) => (
          <Pressable
            key={c.id}
            onPress={() => open(c)}
            style={({ pressed }) => [styles.row, i > 0 && styles.border, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel={`${c.title}. ${c.subtitle ?? ''}`}
          >
            <View style={styles.icon}>
              <Ionicons name={CARD_ICON[c.card_type] ?? 'sparkles-outline'} size={size['icon-md']} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={2}>
                {c.title}
              </Text>
              {!!c.subtitle && (
                <Text style={styles.sub} numberOfLines={2}>
                  {c.subtitle}
                </Text>
              )}
              <Text style={styles.meta}>
                {[c.course_code, c.estimated_minutes ? `${c.estimated_minutes} min` : ''].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Pressable
              onPress={() => dismissTimelineCard(c.id).catch(() => {})}
              hitSlop={16}
              accessibilityRole="button"
              accessibilityLabel={`Dismiss ${c.title}`}
            >
              <Ionicons name="close" size={size['icon-sm']} color={colors['text-subtle']} />
            </Pressable>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/**
 * Course page: the topics Zuri's academic service thinks this student is weak at
 * (GET /academic/courses/:id/weak-topics). Only catalogue courses have server mastery.
 */
export function WeakTopicsFromZuri({ course }: { course: CourseItem }) {
  const styles = useStyles();
  const { colors, space, size } = useTheme();
  const [topics, setTopics] = useState<WeakTopicDTO[] | null>(null);
  const enabled = !!course.serverId && !!course.catalogue;

  useEffect(() => {
    if (!enabled) return;
    getWeakTopics(course.serverId!)
      .then(setTopics)
      .catch(() => setTopics([]));
  }, [enabled, course.serverId]);

  if (!enabled) return null;
  if (topics === null) return <ActivityIndicator color={colors.text} style={{ marginVertical: space[3] }} />;
  if (!topics.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Zuri suggests revising</Text>
      <View style={styles.card}>
        {topics.slice(0, 5).map((t, i) => (
          <Pressable
            key={`${t.topic}-${t.subtopic}`}
            onPress={() => router.push({ pathname: '/study/session', params: { courseId: course.id, concept: t.subtopic || t.topic } } as any)}
            style={({ pressed }) => [styles.row, i > 0 && styles.border, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
          >
            <View style={styles.icon}>
              <Ionicons name="flag-outline" size={size['icon-md']} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t.subtopic || t.topic}</Text>
              <Text style={styles.sub} numberOfLines={2}>
                {t.reason || t.topic}
              </Text>
              <Text style={styles.meta}>Mastery {Math.round((t.mastery_score <= 1 ? t.mastery_score * 100 : t.mastery_score))}% · tap to practise</Text>
            </View>
            <Ionicons name="chevron-forward" size={size['icon-sm']} color={colors['text-subtle']} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function useStyles() {
  const { colors, space, radius, size, type } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        wrap: { marginVertical: space[3] },
        heading: { ...type.eyebrow, color: colors['text-subtle'], marginBottom: space[2] },
        card: {
          backgroundColor: colors['surface-raised'],
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        },
        row: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4], minHeight: size['touch-target'] },
        border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
        icon: { width: size['control-height-sm'], height: size['control-height-sm'], borderRadius: radius.full, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
        title: { ...type.subhead, color: colors.text },
        sub: { ...type.footnote, color: colors['text-muted'], marginTop: space[1] },
        meta: { ...type.caption, color: colors['text-subtle'], marginTop: space[1] },
      }),
    [colors]
  );
}

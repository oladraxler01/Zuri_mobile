import React, { useEffect, useState } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Text, makeStyles, useTheme } from '@/theme';
import type { CourseItem } from '@/context/academic-context';
import { getKnowledgeState, type CourseMasteryGraphDTO, type KnowledgeStateDTO } from '@/services/academic-api';

type Status = KnowledgeStateDTO['status'];

const STATUS: Record<string, { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: 'success' | 'warning' | 'danger' | 'text-subtle' }> = {
  mastered: { label: 'Mastered', icon: 'checkmark-circle', color: 'success' },
  learning: { label: 'Learning', icon: 'trending-up-outline', color: 'warning' },
  struggling: { label: 'Struggling', icon: 'alert-circle-outline', color: 'danger' },
  not_started: { label: 'Not started', icon: 'ellipse-outline', color: 'text-subtle' },
};
const statusOf = (s: Status) => STATUS[s] ?? STATUS.not_started;

/**
 * Course → Topics: the syllabus mastery map from Zuri's academic service
 * (GET /academic/courses/:id/knowledge-state): overall mastery, then each topic
 * with its subtopics, status (icon + word) and attempts. Catalogue courses only.
 */
export function MasteryMap({ course }: { course: CourseItem }) {
  const styles = useStyles();
  const { colors, size } = useTheme();
  const [graph, setGraph] = useState<CourseMasteryGraphDTO | null | undefined>(undefined);
  const [open, setOpen] = useState<string | null>(null);
  const enabled = !!course.serverId && !!course.catalogue;

  useEffect(() => {
    if (!enabled) return;
    getKnowledgeState(course.serverId!)
      .then(setGraph)
      .catch(() => setGraph(null));
  }, [enabled, course.serverId]);

  if (!enabled || graph === null) return null;
  if (graph === undefined) return <ActivityIndicator color={colors.text} style={styles.loading} />;
  if (!graph.topic_groups?.length) return null;

  return (
    <Card eyebrow="SYLLABUS MASTERY" style={styles.card}>
      <View style={styles.summary}>
        <Text variant="stat">{graph.overall_mastery}%</Text>
        <Text variant="footnote" color="text-muted" style={{ flex: 1 }}>
          {graph.mastered_count} of {graph.total_subtopics} subtopics mastered
          {graph.struggling_count ? ` · ${graph.struggling_count} need work` : ''}
        </Text>
      </View>

      {graph.topic_groups.map((g) => {
        const isOpen = open === g.topic;
        return (
          <View key={g.topic} style={styles.group}>
            <Pressable
              onPress={() => setOpen(isOpen ? null : g.topic)}
              style={styles.groupHead}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              accessibilityLabel={`${g.topic}, ${g.average_mastery}% mastery`}
            >
              <Text variant="subhead" style={{ flex: 1 }}>
                {g.topic}
              </Text>
              <Text variant="caption" color="text-muted">
                {g.average_mastery}%
              </Text>
              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={size['icon-sm']} color={colors['text-subtle']} />
            </Pressable>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, g.average_mastery))}%` }]} />
            </View>
            {isOpen &&
              g.subtopics.map((s) => {
                const st = statusOf(s.status);
                return (
                  <Pressable
                    key={s.subtopic}
                    onPress={() => router.push({ pathname: '/study/session', params: { courseId: course.id, concept: s.subtopic } } as any)}
                    style={styles.sub}
                    accessibilityRole="button"
                    accessibilityLabel={`${s.subtopic}, ${st.label}, ${s.mastery_score}%. Practise it`}
                  >
                    <Ionicons name={st.icon} size={size['icon-sm']} color={colors[st.color]} />
                    <View style={{ flex: 1 }}>
                      <Text variant="footnote">{s.subtopic}</Text>
                      <Text variant="caption" color="text-subtle">
                        {st.label} · {s.mastery_score}% · {s.correct_attempts}/{s.total_attempts} right
                      </Text>
                      {!!s.last_error_summary && (
                        <Text variant="caption" color="text-muted">
                          Last mistake: {s.last_error_summary}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={size['icon-sm']} color={colors['text-subtle']} />
                  </Pressable>
                );
              })}
          </View>
        );
      })}
    </Card>
  );
}

const useStyles = makeStyles(({ colors, space, radius, size }) => ({
  loading: { marginVertical: space[3] },
  card: { marginBottom: space[4] },
  summary: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginBottom: space[3] },
  group: { paddingVertical: space[2], borderTopWidth: 1, borderTopColor: colors.border, gap: space[2] },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: size['touch-target'] },
  track: { height: space[1] * 1.5, borderRadius: radius.full, backgroundColor: colors['surface-sunken'], overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  sub: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: size['touch-target'], paddingVertical: space[1] },
}));

import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useAcademic } from '@/context/academic-context';
import { useLectures } from '@/context/lectures-context';
import { useMaterials } from '@/context/materials-context';
import { useProgress } from '@/context/progress-context';
import { usePlanner } from '@/context/planner-context';
import { ScreenShell, Panel, Grid, StatTile, ListRow, Divider } from '@/components/dashboard';
import { Chip } from '@/components/ui/chip';
import { courseMastery } from '@/utils/mastery';
import { buildStudyPlan, localDateKey } from '@/utils/planner';
import { formatDuration, formatLectureDate } from '@/utils/time';

/** Study hub: start a personalised session, review weak topics, see mastery and history. */
export default function StudyHubScreen() {
  const { state } = useAcademic();
  const { lectures } = useLectures();
  const { materials } = useMaterials();
  const { events } = useProgress();
  const { assessments } = usePlanner();

  const all = useMemo(
    () => state.courses.flatMap((c) => courseMastery(c.id, lectures, materials, events).map((m) => ({ ...m, course: c }))),
    [state.courses, lectures, materials, events]
  );
  const weak = all.filter((c) => c.level === 'weak' || c.level === 'developing');
  const sessions = events.filter((e) => e.type === 'study-session').sort((a, b) => b.at.localeCompare(a.at));
  const today = localDateKey(new Date());
  const planned = buildStudyPlan(assessments, state.preferences.weeklyStudyHours, 1).filter((b) => b.date === today);
  const minutesThisWeek = sessions
    .filter((s) => Date.now() - new Date(s.at).getTime() < 7 * 86400_000)
    .reduce((n, s) => n + (s.minutes ?? 0), 0);
  const coursesWithContent = state.courses.filter((c) => all.some((m) => m.course.id === c.id));

  return (
    <ScreenShell back eyebrow="STUDY" title="Study" edges={['top', 'bottom']}>
      <Pressable style={styles.hero} onPress={() => router.push('/study/session' as Href)} accessibilityRole="button">
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTag}>PERSONALISED SESSION · ABOUT 10 MIN</Text>
          <Text style={styles.heroTitle}>Start studying</Text>
          <Text style={styles.heroSub}>Questions and flashcards from your lectures, weighted to what you know least.</Text>
        </View>
        <View style={styles.heroBtn}>
          <Ionicons name="play" size={22} color={UI.ink} />
        </View>
      </Pressable>

      {weak.length > 0 && (
        <Pressable style={styles.weak} onPress={() => router.push({ pathname: '/study/session', params: { mode: 'weak' } } as any)}>
          <Ionicons name="flag-outline" size={20} color={UI.error} />
          <View style={{ flex: 1 }}>
            <Text style={styles.weakTitle}>Review {weak.length} weak {weak.length === 1 ? 'topic' : 'topics'}</Text>
            <Text style={styles.weakSub} numberOfLines={1}>
              {weak.slice(0, 3).map((w) => w.concept).join(', ')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={UI.muted} />
        </Pressable>
      )}

      {coursesWithContent.length > 0 && (
        <View>
          <Text style={styles.label}>STUDY ONE COURSE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {coursesWithContent.map((c) => (
              <Chip key={c.id} label={c.code} on={false} onPress={() => router.push({ pathname: '/study/session', params: { courseId: c.id } } as any)} />
            ))}
          </ScrollView>
        </View>
      )}

      <Grid min={150}>
        <StatTile label="Studied this week" value={formatDuration(minutesThisWeek * 60)} icon="time-outline" />
        <StatTile label="Topics strong" value={`${all.filter((c) => c.level === 'strong').length}/${all.length}`} icon="school-outline" />
        <StatTile label="Planned today" value={formatDuration(planned.reduce((n, b) => n + b.minutes, 0) * 60)} icon="calendar-outline" />
      </Grid>

      <Panel>
        <ListRow icon="git-network-outline" title="Concept mastery" subtitle="Every topic, across all courses" onPress={() => router.push('/study/mastery' as Href)} />
        <Divider />
        <ListRow icon="stats-chart-outline" title="Study history" subtitle={sessions[0] ? `Last session ${formatLectureDate(sessions[0].at)}` : 'No sessions yet'} onPress={() => router.push('/study/history' as Href)} />
        <Divider />
        <ListRow icon="calendar-outline" title="This week’s study plan" subtitle="Sessions planned around your deadlines" onPress={() => router.push('/(tabs)/plan' as Href)} />
      </Panel>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: UI.ink, borderRadius: 22, padding: 20 },
  heroTag: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, letterSpacing: 1, color: '#e9c349' },
  heroTitle: { fontFamily: ZuriFonts.headlineLg, fontSize: 26, color: '#fff', marginTop: 4 },
  heroSub: { fontFamily: ZuriFonts.bodyRegular, fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  heroBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  weak: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff8f6', borderRadius: 16, borderWidth: 1, borderColor: UI.errorSoft, padding: 14 },
  weakTitle: { fontFamily: ZuriFonts.labelSmBold, fontSize: 15, color: UI.ink },
  weakSub: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 2 },
  label: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, letterSpacing: 1.2, color: UI.muted, marginBottom: 8 },
});

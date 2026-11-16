import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useAcademic } from '@/context/academic-context';
import { useLectures } from '@/context/lectures-context';
import { useMaterials } from '@/context/materials-context';
import { useProgress } from '@/context/progress-context';
import { ScreenShell, Panel, Grid, StatTile, HBarList } from '@/components/dashboard';
import { EmptyState } from '@/components/states/state-view';
import { courseMastery } from '@/utils/mastery';
import { formatDuration } from '@/utils/time';

/** Learning profile from real activity: strengths, growth areas, accuracy by course, habits. */
export default function LearningProfileScreen() {
  const { state } = useAcademic();
  const { lectures } = useLectures();
  const { materials } = useMaterials();
  const { events } = useProgress();

  const concepts = useMemo(
    () => state.courses.flatMap((c) => courseMastery(c.id, lectures, materials, events).map((m) => ({ ...m, code: c.code }))),
    [state.courses, lectures, materials, events]
  );
  const tested = concepts.filter((c) => c.score !== null);
  const strengths = [...tested].sort((a, b) => b.score! - a.score!).slice(0, 4);
  const growth = [...tested].sort((a, b) => a.score! - b.score!).filter((c) => c.score! < 80).slice(0, 4);

  const answers = events.filter((e) => e.type === 'quiz-answer' || e.type === 'flashcard');
  const byCourse = state.courses
    .map((c) => {
      const mine = answers.filter((a) => a.courseId === c.id);
      return { label: `${c.code} · ${c.title}`, value: mine.length ? Math.round((mine.filter((a) => a.correct).length / mine.length) * 100) : -1, sub: `${mine.length} answers` };
    })
    .filter((r) => r.value >= 0);

  const sessions = events.filter((e) => e.type === 'study-session');
  const avgSession = sessions.length ? Math.round(sessions.reduce((n, s) => n + (s.minutes ?? 0), 0) / sessions.length) : 0;
  const hours = events.map((e) => new Date(e.at).getHours());
  const part = (h: number) => (h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening');
  const counts = { morning: 0, afternoon: 0, evening: 0 } as Record<string, number>;
  hours.forEach((h) => counts[part(h)]++);
  const usual = hours.length ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] : null;

  if (!answers.length && !sessions.length) {
    return (
      <ScreenShell back eyebrow="PROFILE" title="Learning profile" edges={['top', 'bottom']}>
        <EmptyState
          icon="analytics-outline"
          title="Your profile builds as you study"
          message="Answer lecture quizzes, rate flashcards and do study sessions. Your strengths, growth areas and habits appear here, based on what you actually do."
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell back eyebrow="PROFILE" title="Learning profile" edges={['top', 'bottom']}>
      <Grid min={140}>
        <StatTile label="Answers" value={`${answers.length}`} icon="help-circle-outline" />
        <StatTile label="Accuracy" value={`${answers.length ? Math.round((answers.filter((a) => a.correct).length / answers.length) * 100) : 0}%`} icon="checkmark-circle-outline" />
        <StatTile label="Avg session" value={formatDuration(avgSession * 60)} icon="time-outline" />
        <StatTile label="Usually studies" value={usual ? usual[0].toUpperCase() + usual.slice(1) : '—'} icon="sunny-outline" />
      </Grid>

      <Grid min={320}>
        <Panel title="Strengths" subtitle="Topics you answer best">
          {strengths.length ? (
            <HBarList rows={strengths.map((c) => ({ label: c.concept, value: c.score!, sub: c.code }))} />
          ) : (
            <Text style={styles.muted}>Not enough answers yet.</Text>
          )}
        </Panel>
        <Panel title="Growth areas" subtitle="Topics worth more practice">
          {growth.length ? (
            <HBarList rows={growth.map((c) => ({ label: c.concept, value: c.score!, sub: c.code }))} warnBelow={50} />
          ) : (
            <Text style={styles.muted}>No weak topics among the ones you’ve practised.</Text>
          )}
        </Panel>
      </Grid>

      {byCourse.length > 0 && (
        <Panel title="Accuracy by course">
          <HBarList rows={byCourse} warnBelow={50} />
        </Panel>
      )}

      <Panel title="Study habits">
        <Text style={styles.body}>
          {sessions.length} study {sessions.length === 1 ? 'session' : 'sessions'} so far
          {avgSession ? `, about ${avgSession} minutes each` : ''}.{usual ? ` You’re most active in the ${usual}` : ''}
          {usual && state.preferences.preferredStudyTime !== usual ? `, though your preference is set to ${state.preferences.preferredStudyTime}.` : usual ? '.' : ''}
        </Text>
      </Panel>
      <Text style={styles.muted}>Built only from activity on this phone: quiz answers, flashcards and study sessions.</Text>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  muted: { fontFamily: ZuriFonts.bodyRegular, fontSize: 13, color: UI.muted },
  body: { fontFamily: ZuriFonts.bodyRegular, fontSize: 15, lineHeight: 22, color: UI.inkSoft },
});

import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { useLectures } from '@/context/lectures-context';
import { useMaterials } from '@/context/materials-context';
import { usePlanner } from '@/context/planner-context';
import { useProgress } from '@/context/progress-context';
import { ScreenShell, Panel, Grid, StatTile, BarChart } from '@/components/dashboard';
import { ActivityList, activityFor } from '@/components/course/course-topics';
import { localDateKey } from '@/utils/planner';
import { formatDuration } from '@/utils/time';

/** Study history: minutes per day this week, streak, answers, and everything you did. */
export default function StudyHistoryScreen() {
  const { lectures } = useLectures();
  const { materials } = useMaterials();
  const { assessments } = usePlanner();
  const { events } = useProgress();

  const days = useMemo(() => {
    const out: { key: string; label: string; minutes: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      out.push({ key: localDateKey(d), label: i === 0 ? 'Today' : d.toLocaleDateString([], { weekday: 'short' }), minutes: 0 });
    }
    for (const e of events) {
      if (e.type !== 'study-session') continue;
      const day = out.find((x) => x.key === localDateKey(new Date(e.at)));
      if (day) day.minutes += e.minutes ?? 0;
    }
    return out;
  }, [events]);

  // Streak: consecutive days (ending today or yesterday) with any learning activity.
  const streak = useMemo(() => {
    const active = new Set(events.map((e) => localDateKey(new Date(e.at))));
    let n = 0;
    const d = new Date();
    if (!active.has(localDateKey(d))) d.setDate(d.getDate() - 1);
    while (active.has(localDateKey(d))) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }, [events]);

  const answers = events.filter((e) => e.type === 'quiz-answer');
  const correct = answers.filter((e) => e.correct).length;
  const activity = useMemo(() => activityFor({ lectures, materials, assessments, events }), [lectures, materials, assessments, events]);

  return (
    <ScreenShell back eyebrow="STUDY" title="Study history" edges={['top', 'bottom']}>
      <Grid min={140}>
        <StatTile label="This week" value={formatDuration(days.reduce((n, d) => n + d.minutes, 0) * 60)} icon="time-outline" />
        <StatTile label="Day streak" value={`${streak}`} icon="flame-outline" />
        <StatTile label="Questions answered" value={`${answers.length}`} icon="help-circle-outline" />
        <StatTile label="Accuracy" value={answers.length ? `${Math.round((correct / answers.length) * 100)}%` : '—'} icon="checkmark-circle-outline" />
      </Grid>

      <Panel title="Study sessions" subtitle="Minutes per day, last 7 days · tap a bar">
        <BarChart data={days.map((d) => ({ label: d.label, value: d.minutes }))} format={(v) => `${v} min`} label="Study minutes per day, last 7 days" />
        {days.every((d) => !d.minutes) && <Text style={styles.note}>No study sessions this week yet.</Text>}
      </Panel>

      <Text style={styles.section}>Everything you’ve done</Text>
      <ActivityList items={activity} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  note: { fontFamily: LexiFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 8 },
  section: { fontFamily: LexiFonts.headlineMd, fontSize: 19, color: UI.ink },
});

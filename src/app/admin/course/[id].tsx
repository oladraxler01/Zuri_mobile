import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { ScreenShell, Panel, Grid, StatTile, BarChart, HBarList, SampleBanner, StatusBadge } from '@/components/dashboard';
import { EmptyState } from '@/components/states/state-view';
import { allCourses } from '@/data/sample-institution';
import { classInsights } from '@/data/sample-class-insights';

/** Course performance as the institution sees it. */
export default function AdminCourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = allCourses().find((x) => x.id === id);
  if (!c) {
    return (
      <ScreenShell back title="Course">
        <EmptyState icon="library-outline" title="Course not found" />
      </ScreenShell>
    );
  }
  const i = classInsights(c);
  const status = c.mastery < 55 ? 'critical' : c.mastery < 65 ? 'warning' : 'good';

  return (
    <ScreenShell back eyebrow={`${c.code} · ${c.department.toUpperCase()}`} title={c.title} edges={['top', 'bottom']}>
      <View style={styles.row}>
        <Text style={styles.lecturer}>{c.lecturer}</Text>
        <StatusBadge status={status} label={status === 'good' ? 'On track' : status === 'warning' ? 'Watch' : 'Needs support'} />
      </View>
      <Grid min={150}>
        <StatTile label="Enrolled" value={`${c.enrolled}`} icon="people-outline" />
        <StatTile label="Lectures captured" value={`${c.lecturesCaptured}`} icon="mic-outline" />
        <StatTile label="Average mastery" value={`${c.mastery}%`} icon="school-outline" />
        <StatTile label="Active this week" value={`${c.engagement}%`} icon="pulse-outline" />
      </Grid>
      <Grid min={320}>
        <Panel title="Engagement" subtitle="% of class active each week">
          <BarChart data={i.weeklyEngagement.map((v, k) => ({ label: k === 7 ? 'Now' : `W${k + 1}`, value: v }))} max={100} format={(v) => `${v}%`} label="Weekly engagement" />
        </Panel>
        <Panel title="Topic mastery">
          <HBarList rows={i.topics.map((t) => ({ label: t.topic, value: t.mastery }))} warnBelow={50} />
        </Panel>
      </Grid>
      <SampleBanner />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lecturer: { fontFamily: LexiFonts.bodyMedium, fontSize: 15, color: UI.inkSoft },
});

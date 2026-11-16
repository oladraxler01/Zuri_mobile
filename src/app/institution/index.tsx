import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useInstitution } from '@/context/institution-context';
import { ScreenShell, Panel, Grid, StatTile, BarChart, SampleBanner, ListRow, Divider, StatusBadge } from '@/components/dashboard';
import { FACULTIES, WEEKLY_ACTIVE, WEEKLY_LECTURES, SYSTEM_HEALTH, INTERVENTIONS, allCourses } from '@/data/sample-institution';

/** Institution dashboard: the university at a glance. */
export default function InstitutionOverviewScreen() {
  const { settings } = useInstitution();
  const depts = FACULTIES.flatMap((f) => f.departments);
  const students = depts.reduce((n, d) => n + d.students, 0);
  const lecturers = depts.reduce((n, d) => n + d.lecturers, 0);
  const courses = allCourses();
  const captured = courses.reduce((n, c) => n + c.lecturesCaptured, 0);
  const weeks = (arr: number[]) => arr.map((v, i) => ({ label: i === arr.length - 1 ? 'Now' : `W${i + 1}`, value: v }));
  const issues = SYSTEM_HEALTH.filter((s) => s.status !== 'good');
  const open = INTERVENTIONS.filter((i) => i.status !== 'resolved');

  return (
    <ScreenShell eyebrow={`${settings.shortName} · ${settings.semester.toUpperCase()} ${settings.academicYear}`} title="Institution overview">
      <Grid min={160}>
        <StatTile label="Students" value={students.toLocaleString()} icon="people-outline" />
        <StatTile label="Lecturers" value={`${lecturers}`} icon="person-outline" />
        <StatTile label="Courses" value={`${courses.length}`} icon="library-outline" />
        <StatTile label="Lectures captured" value={`${captured}`} delta={{ text: `${WEEKLY_LECTURES[7]} this week`, up: true }} icon="mic-outline" />
        <StatTile
          label="Active students"
          value={`${WEEKLY_ACTIVE[7]}%`}
          delta={{ text: `${WEEKLY_ACTIVE[7] - WEEKLY_ACTIVE[6] >= 0 ? '+' : ''}${WEEKLY_ACTIVE[7] - WEEKLY_ACTIVE[6]} pts vs last week`, up: WEEKLY_ACTIVE[7] >= WEEKLY_ACTIVE[6] }}
          icon="pulse-outline"
        />
      </Grid>

      <Grid min={340}>
        <Panel title="Academic activity" subtitle="% of students active each week · tap a bar">
          <BarChart data={weeks(WEEKLY_ACTIVE)} max={100} format={(v) => `${v}% active`} label="Weekly active students, last 8 weeks" />
        </Panel>
        <Panel title="Lectures captured" subtitle="Recordings per week across all courses">
          <BarChart data={weeks(WEEKLY_LECTURES)} format={(v) => `${v} lectures`} label="Lectures captured per week, last 8 weeks" />
        </Panel>
      </Grid>

      <Panel title="Faculties" subtitle="Tap to see departments and courses">
        {FACULTIES.map((f, i) => {
          const fs = f.departments.reduce((n, d) => n + d.students, 0);
          const fc = f.departments.flatMap((d) => d.courses);
          const m = Math.round(fc.reduce((n, c) => n + c.mastery, 0) / Math.max(1, fc.length));
          return (
            <View key={f.id}>
              {i > 0 && <Divider />}
              <ListRow
                icon="business-outline"
                title={f.name}
                subtitle={`${f.departments.length} departments · ${fs.toLocaleString()} students · ${m}% avg mastery`}
                onPress={() => router.push(`/admin/faculty/${f.id}` as Href)}
              />
            </View>
          );
        })}
      </Panel>

      <Grid min={320}>
        <Panel title="System health" action={{ label: 'Details', onPress: () => router.push({ pathname: '/institution/analytics', params: { view: 'system' } } as any) }}>
          {issues.length === 0 ? (
            <StatusBadge status="good" label="All systems healthy" />
          ) : (
            issues.map((s, i) => (
              <View key={s.name}>
                {i > 0 && <Divider />}
                <ListRow title={s.name} subtitle={s.detail} right={<StatusBadge status={s.status} />} />
              </View>
            ))
          )}
        </Panel>
        <Panel title="Interventions" subtitle={`${open.length} open`} action={{ label: 'All', onPress: () => router.push({ pathname: '/institution/analytics', params: { view: 'interventions' } } as any) }}>
          {open.slice(0, 3).map((x, i) => (
            <View key={x.id}>
              {i > 0 && <Divider />}
              <ListRow title={`${x.course}: ${x.issue}`} subtitle={`${x.students} students`} />
            </View>
          ))}
        </Panel>
      </Grid>

      <Panel title="University-wide intelligence" action={{ label: 'Open', onPress: () => router.push('/admin/intelligence' as Href) }}>
        <Text style={styles.body}>
          See difficulties shared across courses, compare departments, and search everything the university has taught.
        </Text>
      </Panel>

      <SampleBanner />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: ZuriFonts.bodyRegular, fontSize: 14, lineHeight: 21, color: UI.inkSoft },
});

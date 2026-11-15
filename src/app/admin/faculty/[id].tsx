import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { ScreenShell, Panel, Grid, StatTile, HBarList, ListRow, Divider, SampleBanner } from '@/components/dashboard';
import { EmptyState } from '@/components/states/state-view';
import { FACULTIES } from '@/data/sample-institution';

/** Faculty overview: its departments, their performance and courses. */
export default function FacultyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const f = FACULTIES.find((x) => x.id === id);
  if (!f) {
    return (
      <ScreenShell back title="Faculty">
        <EmptyState icon="business-outline" title="Faculty not found" />
      </ScreenShell>
    );
  }
  const courses = f.departments.flatMap((d) => d.courses);
  const students = f.departments.reduce((n, d) => n + d.students, 0);
  const avg = (xs: number[]) => Math.round(xs.reduce((n, x) => n + x, 0) / Math.max(1, xs.length));

  return (
    <ScreenShell back eyebrow={`DEAN: ${f.dean.toUpperCase()}`} title={f.name} edges={['top', 'bottom']}>
      <Grid min={150}>
        <StatTile label="Departments" value={`${f.departments.length}`} icon="git-branch-outline" />
        <StatTile label="Students" value={students.toLocaleString()} icon="people-outline" />
        <StatTile label="Average mastery" value={`${avg(courses.map((c) => c.mastery))}%`} icon="school-outline" />
        <StatTile label="Engagement" value={`${avg(courses.map((c) => c.engagement))}%`} icon="pulse-outline" />
      </Grid>

      <Panel title="Department overview" subtitle="Average mastery">
        <HBarList
          rows={f.departments.map((d) => ({
            label: d.name,
            value: avg(d.courses.map((c) => c.mastery)),
            sub: `Head: ${d.head} · ${d.students} students · ${d.lecturers} lecturers`,
          }))}
          warnBelow={55}
        />
      </Panel>

      {f.departments.map((d) => (
        <Panel key={d.id} title={d.name} subtitle={`${d.courses.length} courses`}>
          {d.courses.map((c, i) => (
            <View key={c.id}>
              {i > 0 && <Divider />}
              <ListRow
                title={`${c.code} · ${c.title}`}
                subtitle={`${c.lecturer} · ${c.enrolled} enrolled · ${c.mastery}% mastery · ${c.engagement}% active`}
                onPress={() => router.push(`/admin/course/${c.id}` as Href)}
              />
            </View>
          ))}
        </Panel>
      ))}
      <SampleBanner />
    </ScreenShell>
  );
}

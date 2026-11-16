import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { useInstitution } from '@/context/institution-context';
import { ScreenShell, Panel, Grid, StatTile, Divider, SampleBanner, StatusBadge } from '@/components/dashboard';
import { Pressable } from 'react-native';

/** Lecturer overview: who teaches what, lecture capture, and how their classes are doing. */
export default function LecturerOverviewScreen() {
  const { courses, staff } = useInstitution();
  const live = courses.filter((c) => !c.archived);
  const byLecturer = new Map<string, typeof live>();
  live.forEach((c) => byLecturer.set(c.lecturer, [...(byLecturer.get(c.lecturer) ?? []), c]));
  const rows = [...byLecturer.entries()]
    .map(([name, list]) => ({
      name,
      list,
      captured: list.reduce((n, c) => n + c.lecturesCaptured, 0),
      students: list.reduce((n, c) => n + c.enrolled, 0),
      mastery: Math.round(list.reduce((n, c) => n + c.mastery, 0) / list.length),
      engagement: Math.round(list.reduce((n, c) => n + c.engagement, 0) / list.length),
      onZuri: staff.some((s) => s.name.toLowerCase().includes(name.split(' ').slice(-1)[0].toLowerCase()) && s.status === 'active'),
    }))
    .sort((a, b) => b.captured - a.captured);

  return (
    <ScreenShell back eyebrow="INSTITUTION" title="Lecturers" edges={['top', 'bottom']}>
      <Grid min={150}>
        <StatTile label="Teaching" value={`${rows.length}`} icon="person-outline" />
        <StatTile label="Lectures captured" value={`${rows.reduce((n, r) => n + r.captured, 0)}`} icon="mic-outline" />
        <StatTile label="Using Zuri" value={`${rows.filter((r) => r.onZuri).length}`} icon="checkmark-circle-outline" />
      </Grid>
      <Panel title="By lecturer" subtitle="Most lectures captured first">
        {rows.map((r, i) => (
          <View key={r.name}>
            {i > 0 && <Divider />}
            <View style={styles.row}>
              <View style={styles.head}>
                <Text style={styles.name}>{r.name}</Text>
                <StatusBadge status={r.onZuri ? 'good' : 'warning'} label={r.onZuri ? 'On Zuri' : 'Not invited'} />
              </View>
              <Text style={styles.meta}>
                {r.captured} lectures captured · {r.students} students · {r.mastery}% mastery · {r.engagement}% active
              </Text>
              <View style={styles.courses}>
                {r.list.map((c) => (
                  <Pressable key={c.id} style={styles.pill} onPress={() => router.push(`/admin/course/${c.id}` as Href)}>
                    <Text style={styles.pillText}>{c.code}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        ))}
      </Panel>
      <SampleBanner text="Sample teaching data. Invite lecturers from Settings → Staff management." />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 12, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontFamily: LexiFonts.bodyMedium, fontSize: 15, color: UI.ink },
  meta: { fontFamily: LexiFonts.bodyRegular, fontSize: 12, color: UI.muted },
  courses: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  pill: { backgroundColor: UI.cardMuted, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontFamily: LexiFonts.labelSmBold, fontSize: 11, color: UI.ink },
});

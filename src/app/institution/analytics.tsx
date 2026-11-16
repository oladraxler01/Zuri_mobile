import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { ScreenShell, Panel, Grid, StatTile, BarChart, HBarList, SampleBanner, ListRow, Divider, StatusBadge } from '@/components/dashboard';
import { Chip } from '@/components/ui/chip';
import { AI_USAGE, INTERVENTIONS, SYSTEM_HEALTH, WEEKLY_ACTIVE, allCourses, allDepartments } from '@/data/sample-institution';

type View_ = 'learning' | 'engagement' | 'interventions' | 'ai' | 'system';
const VIEWS: { key: View_; label: string }[] = [
  { key: 'learning', label: 'Learning' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'interventions', label: 'Interventions' },
  { key: 'ai', label: 'AI usage & cost' },
  { key: 'system', label: 'System health' },
];

export default function InstitutionAnalyticsScreen() {
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<View_>(VIEWS.some((v) => v.key === params.view) ? (params.view as View_) : 'learning');
  const courses = allCourses();
  const depts = allDepartments();

  return (
    <ScreenShell eyebrow="ANALYTICS" title="Analytics">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {VIEWS.map((v) => (
          <Chip key={v.key} label={v.label} on={view === v.key} onPress={() => setView(v.key)} />
        ))}
      </ScrollView>

      {view === 'learning' && (
        <>
          <Grid min={150}>
            <StatTile label="Average mastery" value={`${Math.round(courses.reduce((n, c) => n + c.mastery, 0) / courses.length)}%`} icon="school-outline" />
            <StatTile label="Courses below 55%" value={`${courses.filter((c) => c.mastery < 55).length}`} icon="alert-circle-outline" />
            <StatTile label="Lectures captured" value={`${courses.reduce((n, c) => n + c.lecturesCaptured, 0)}`} icon="mic-outline" />
          </Grid>
          <Grid min={340}>
            <Panel title="Course performance" subtitle="Average topic mastery · tap a course">
              <HBarList
                rows={[...courses].sort((a, b) => a.mastery - b.mastery).map((c) => ({ label: `${c.code} · ${c.title}`, value: c.mastery }))}
                warnBelow={55}
                onPressRow={(i) => router.push(`/admin/course/${[...courses].sort((a, b) => a.mastery - b.mastery)[i].id}` as Href)}
              />
            </Panel>
            <Panel title="Department performance" subtitle="Average mastery across each department's courses">
              <HBarList
                rows={depts
                  .map((d) => ({
                    label: d.name,
                    value: Math.round(d.courses.reduce((n, c) => n + c.mastery, 0) / d.courses.length),
                    sub: `${d.faculty} · ${d.students} students`,
                  }))
                  .sort((a, b) => a.value - b.value)}
                warnBelow={55}
              />
            </Panel>
          </Grid>
        </>
      )}

      {view === 'engagement' && (
        <Grid min={340}>
          <Panel title="Student engagement" subtitle="% of students active each week">
            <BarChart
              data={WEEKLY_ACTIVE.map((v, i) => ({ label: i === 7 ? 'Now' : `W${i + 1}`, value: v }))}
              max={100}
              format={(v) => `${v}% active`}
              label="Weekly active students"
            />
          </Panel>
          <Panel title="Engagement by course" subtitle="% of enrolled students active this week">
            <HBarList rows={[...courses].sort((a, b) => a.engagement - b.engagement).map((c) => ({ label: c.code, value: c.engagement, sub: `${c.enrolled} enrolled` }))} warnBelow={50} />
          </Panel>
        </Grid>
      )}

      {view === 'interventions' && (
        <>
          <Grid min={150}>
            <StatTile label="Open" value={`${INTERVENTIONS.filter((i) => i.status === 'open').length}`} icon="flag-outline" />
            <StatTile label="In progress" value={`${INTERVENTIONS.filter((i) => i.status === 'in-progress').length}`} icon="hourglass-outline" />
            <StatTile label="Students reached" value={`${INTERVENTIONS.reduce((n, i) => n + i.students, 0)}`} icon="people-outline" />
          </Grid>
          <Panel title="Intervention opportunities and outcomes">
            {INTERVENTIONS.map((x, i) => (
              <View key={x.id}>
                {i > 0 && <Divider />}
                <ListRow
                  title={`${x.course}: ${x.issue}`}
                  subtitle={`${x.students} students`}
                  right={
                    <StatusBadge
                      status={x.status === 'resolved' ? 'good' : x.status === 'open' ? 'critical' : 'warning'}
                      label={x.status === 'resolved' ? 'Resolved' : x.status === 'open' ? 'Open' : 'In progress'}
                    />
                  }
                />
              </View>
            ))}
          </Panel>
        </>
      )}

      {view === 'ai' && (
        <>
          <Grid min={150}>
            <StatTile label="Minutes transcribed" value={AI_USAGE.minutesTranscribed.toLocaleString()} icon="mic-outline" />
            <StatTile label="Questions answered" value={AI_USAGE.questionsAnswered.toLocaleString()} icon="chatbubble-ellipses-outline" />
            <StatTile label="Documents processed" value={AI_USAGE.documentsProcessed.toLocaleString()} icon="document-text-outline" />
          </Grid>
          <Grid min={340}>
            <Panel title="AI cost this month" subtitle={`$${AI_USAGE.costThisMonth.toFixed(2)} of $${AI_USAGE.budget} budget`}>
              <HBarList rows={[{ label: 'Budget used', value: Math.round((AI_USAGE.costThisMonth / AI_USAGE.budget) * 100) }]} />
              <Text style={styles.note}>
                About ${((AI_USAGE.costThisMonth / AI_USAGE.minutesTranscribed) * 60).toFixed(3)} per lecture hour transcribed, in line with the audio spec's
                estimate.
              </Text>
            </Panel>
            <Panel title="Weekly AI cost" subtitle="USD · tap a bar">
              <BarChart
                data={AI_USAGE.weeklyCost.map((v, i) => ({ label: i === 7 ? 'Now' : `W${i + 1}`, value: v }))}
                format={(v) => `$${v.toFixed(2)}`}
                label="AI cost per week in US dollars"
              />
            </Panel>
          </Grid>
        </>
      )}

      {view === 'system' && (
        <Panel title="System health">
          {SYSTEM_HEALTH.map((s, i) => (
            <View key={s.name}>
              {i > 0 && <Divider />}
              <ListRow title={s.name} subtitle={s.detail} right={<StatusBadge status={s.status} />} />
            </View>
          ))}
        </Panel>
      )}

      <SampleBanner />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  note: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 10 },
});

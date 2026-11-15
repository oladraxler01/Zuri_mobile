import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { useLecturer } from '@/context/lecturer-context';
import { useLectures } from '@/context/lectures-context';
import { ScreenShell, Panel, Grid, StatTile, BarChart, HBarList, SampleBanner, StatusBadge, Divider } from '@/components/dashboard';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/states/state-view';
import { insightsFor } from '@/utils/lecturer';

/** Class intelligence for one course: engagement, mastery, misconceptions, FAQs, results, cohort. */
export default function LecturerInsightsScreen() {
  const params = useLocalSearchParams<{ courseId?: string }>();
  const { courses } = useLecturer();
  const { lectures } = useLectures();
  const [courseId, setCourseId] = useState(params.courseId ?? courses[0]?.id);
  const course = courses.find((c) => c.id === courseId) ?? courses[0];

  if (!course) {
    return (
      <ScreenShell eyebrow="CLASS INTELLIGENCE" title="Insights">
        <EmptyState icon="analytics-outline" title="No courses yet" message="Add the courses you teach to see how each class is doing." />
      </ScreenShell>
    );
  }

  const i = insightsFor(course, lectures);
  const weeks = i.weeklyEngagement.map((v, idx) => ({ label: idx === 7 ? 'Now' : `W${idx + 1}`, value: v }));
  const lastDelta = i.weeklyEngagement[7] - i.weeklyEngagement[6];
  const passed = i.gradeBands.filter((b) => b.band !== 'F').reduce((n, b) => n + b.count, 0);
  const graded = i.gradeBands.reduce((n, b) => n + b.count, 0);

  return (
    <ScreenShell eyebrow="CLASS INTELLIGENCE" title="Insights">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {courses.map((c) => (
          <Chip key={c.id} label={c.code} on={c.id === course.id} onPress={() => setCourseId(c.id)} />
        ))}
      </ScrollView>

      <Panel>
        <Text style={styles.overviewTitle}>
          {course.code} · {course.title}
        </Text>
        <Text style={styles.trend}>{i.trend}</Text>
      </Panel>

      <Grid min={150}>
        <StatTile label="Students" value={`${i.cohortSize}`} icon="people-outline" />
        <StatTile
          label="Active this week"
          value={`${i.activeThisWeek}`}
          delta={{ text: `${lastDelta >= 0 ? '+' : ''}${lastDelta} pts vs last week`, up: lastDelta >= 0 }}
          icon="pulse-outline"
        />
        <StatTile label="Average mastery" value={`${i.avgMastery}%`} icon="school-outline" />
      </Grid>

      <Grid min={320}>
        <Panel title="Student engagement" subtitle="% of class active each week · tap a bar">
          <BarChart data={weeks} max={100} format={(v) => `${v}%`} label="Weekly engagement, last 8 weeks" />
        </Panel>
        <Panel title="Topic mastery" subtitle="% answering questions on each topic correctly">
          <HBarList rows={i.topics.map((t) => ({ label: t.topic, value: t.mastery }))} warnBelow={50} />
        </Panel>
      </Grid>

      <Grid min={320}>
        <Panel title="Weak topics" subtitle="Lowest mastery, worth revisiting">
          {i.topics.slice(0, 3).map((t, idx) => (
            <View key={t.topic}>
              {idx > 0 && <Divider />}
              <View style={styles.weakRow}>
                <Text style={styles.weakRank}>{idx + 1}</Text>
                <Text style={styles.weakTopic}>{t.topic}</Text>
                <Text style={styles.weakValue}>{t.mastery}%</Text>
              </View>
            </View>
          ))}
          <Pressable
            style={styles.link}
            onPress={() => router.push({ pathname: '/teach/revision/[id]', params: { id: 'new', courseId: course.id } } as any)}
          >
            <Text style={styles.linkText}>Create a revision pack on these →</Text>
          </Pressable>
        </Panel>

        <Panel title="Common misconceptions" subtitle="Patterns in wrong answers">
          {i.misconceptions.map((m, idx) => (
            <View key={m.topic} style={[styles.misc, idx > 0 && styles.miscBorder]}>
              <View style={styles.miscHead}>
                <Text style={styles.miscTopic}>{m.topic}</Text>
                <Text style={styles.miscShare}>{m.share}% of class</Text>
              </View>
              <Text style={styles.miscText}>Students {m.statement.charAt(0).toLowerCase() + m.statement.slice(1)}.</Text>
            </View>
          ))}
        </Panel>
      </Grid>

      <Grid min={320}>
        <Panel title="Frequently asked questions" subtitle="What students ask most after lectures">
          {i.faqs.map((f, idx) => (
            <View key={f.question}>
              {idx > 0 && <Divider />}
              <View style={styles.faqRow}>
                <Text style={styles.faqQ}>“{f.question}”</Text>
                <Text style={styles.faqCount}>{f.count}×</Text>
              </View>
            </View>
          ))}
        </Panel>

        <Panel title="Assessment performance" subtitle={`Latest assessment · ${Math.round((passed / Math.max(1, graded)) * 100)}% passed`}>
          <BarChart
            data={i.gradeBands.map((b) => ({ label: b.band, value: b.count }))}
            format={(v) => `${v} students`}
            highlight={2}
            height={120}
            label="Students per grade band, latest assessment"
          />
        </Panel>
      </Grid>

      <Panel title="Student cohort breakdown" subtitle="Based on engagement and quiz results">
        <View style={{ gap: 12 }}>
          {i.cohort.map((c) => (
            <View key={c.label} style={styles.cohortRow}>
              <StatusBadge status={c.status} label={c.label} />
              <View style={styles.cohortTrack}>
                <View style={[styles.cohortFill, { width: `${(c.count / i.cohortSize) * 100}%` }]} />
              </View>
              <Text style={styles.cohortCount}>
                {c.count} <Text style={styles.cohortPct}>({Math.round((c.count / i.cohortSize) * 100)}%)</Text>
              </Text>
            </View>
          ))}
        </View>
      </Panel>

      <Panel title="Learning trends">
        <Text style={styles.trendBody}>
          Engagement has moved from {i.weeklyEngagement[0]}% to {i.weeklyEngagement[7]}% over 8 weeks. Mastery is strongest in{' '}
          {i.topics[i.topics.length - 1]?.topic} ({i.topics[i.topics.length - 1]?.mastery}%) and weakest in {i.topics[0]?.topic} (
          {i.topics[0]?.mastery}%).
        </Text>
      </Panel>

      <SampleBanner
        text={`Sample class data${lectures.some((l) => l.courseId === course.id) ? ', using topics from your recorded lectures' : ''}. Live figures appear once students are connected.`}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  overviewTitle: { fontFamily: LexiFonts.headlineMd, fontSize: 18, color: UI.ink },
  trend: { fontFamily: LexiFonts.bodyRegular, fontSize: 14, lineHeight: 21, color: UI.inkSoft, marginTop: 6 },
  weakRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  weakRank: { fontFamily: LexiFonts.headlineMd, fontSize: 18, color: UI.amber, width: 18 },
  weakTopic: { flex: 1, fontFamily: LexiFonts.bodyMedium, fontSize: 15, color: UI.ink },
  weakValue: { fontFamily: LexiFonts.labelSmBold, fontSize: 14, color: UI.ink },
  link: { marginTop: 10 },
  linkText: { fontFamily: LexiFonts.labelSmBold, fontSize: 13, color: UI.amber },
  misc: { paddingVertical: 10 },
  miscBorder: { borderTopWidth: 1, borderTopColor: UI.borderSoft },
  miscHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  miscTopic: { fontFamily: LexiFonts.labelSmBold, fontSize: 14, color: UI.ink },
  miscShare: { fontFamily: LexiFonts.labelSmBold, fontSize: 12, color: UI.inkSoft },
  miscText: { fontFamily: LexiFonts.bodyRegular, fontSize: 13, lineHeight: 19, color: UI.inkSoft },
  faqRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  faqQ: { flex: 1, fontFamily: LexiFonts.bodyRegular, fontSize: 14, lineHeight: 20, color: UI.ink, fontStyle: 'italic' },
  faqCount: { fontFamily: LexiFonts.labelSmBold, fontSize: 13, color: UI.inkSoft },
  cohortRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cohortTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: UI.cardMuted, overflow: 'hidden' },
  cohortFill: { height: '100%', borderRadius: 4, backgroundColor: '#c5832b' },
  cohortCount: { fontFamily: LexiFonts.labelSmBold, fontSize: 13, color: UI.ink, minWidth: 70, textAlign: 'right' },
  cohortPct: { fontFamily: LexiFonts.bodyRegular, color: UI.muted },
  trendBody: { fontFamily: LexiFonts.bodyRegular, fontSize: 14, lineHeight: 21, color: UI.inkSoft },
});

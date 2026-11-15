import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { useLecturer } from '@/context/lecturer-context';
import { useLectures } from '@/context/lectures-context';
import { ScreenShell, Panel, Grid, StatTile, SampleBanner, ListRow, Divider, StatusBadge } from '@/components/dashboard';
import { EmptyState } from '@/components/states/state-view';
import { describeStart, upcomingClasses, parseTimeOfDay } from '@/utils/time';
import { insightsFor, teachingTimetable } from '@/utils/lecturer';

/** Lecturer Today: next class, today's teaching, alerts, class signals, top intervention. */
export default function LecturerTodayScreen() {
  const { profile, courses } = useLecturer();
  const { lectures } = useLectures();

  const timetable = useMemo(() => teachingTimetable(courses), [courses]);
  const upcoming = upcomingClasses(timetable);
  const next = upcoming[0];
  const nextCourse = courses.find((c) => c.id === next?.slot.courseId);
  const today = new Date();
  const todays = upcoming
    .filter((o) => o.start.toDateString() === today.toDateString())
    .sort((a, b) => parseTimeOfDay(a.slot.startTime) - parseTimeOfDay(b.slot.startTime));

  const insights = courses.map((c) => ({ course: c, i: insightsFor(c, lectures) }));
  const active = insights.reduce((n, x) => n + x.i.activeThisWeek, 0);
  const cohort = insights.reduce((n, x) => n + x.i.cohortSize, 0);
  const atRisk = insights.reduce((n, x) => n + (x.i.cohort.find((c) => c.status === 'critical')?.count ?? 0), 0);
  const avgMastery = insights.length ? Math.round(insights.reduce((n, x) => n + x.i.avgMastery, 0) / insights.length) : 0;
  const alerts = insights
    .map(({ course, i }) => ({ course, topic: i.topics[0] }))
    .filter((a) => a.topic && a.topic.mastery < 55)
    .sort((a, b) => a.topic.mastery - b.topic.mastery);
  const worst = [...insights].sort(
    (a, b) => (b.i.cohort.find((c) => c.status === 'critical')?.count ?? 0) - (a.i.cohort.find((c) => c.status === 'critical')?.count ?? 0)
  )[0];

  const hour = today.getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const surname = profile.fullName.trim().split(/\s+/).slice(-1)[0];

  const record = (courseId?: string) => {
    const c = courses.find((x) => x.id === courseId);
    router.push({ pathname: '/lecture-recording', params: c ? { courseId: c.id, courseCode: c.code, courseTitle: c.title } : {} } as any);
  };

  return (
    <ScreenShell
      eyebrow={today.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
      title={`${greet}${surname ? `, ${profile.title} ${surname}` : ''}`}
    >
      {!profile.onboarded && (
        <Pressable style={styles.setup} onPress={() => router.push('/onboarding/lecturer-setup' as Href)}>
          <Ionicons name="person-circle-outline" size={20} color="#7a4f12" />
          <Text style={styles.setupText}>Finish setting up your teaching profile</Text>
          <Ionicons name="chevron-forward" size={18} color="#7a4f12" />
        </Pressable>
      )}

      {next && nextCourse ? (
        <View style={styles.hero}>
          <View style={styles.heroPill}>
            {next.inProgress && <View style={styles.liveDot} />}
            <Text style={styles.heroPillText}>{describeStart(next).toUpperCase()}</Text>
          </View>
          <Text style={styles.heroCode}>{nextCourse.code}</Text>
          <Text style={styles.heroTitle}>{nextCourse.title}</Text>
          <Text style={styles.heroMeta}>
            {next.slot.startTime} – {next.slot.endTime} · {next.slot.venue} · {nextCourse.cohortSize} students
          </Text>
          <View style={styles.heroActions}>
            <Pressable style={styles.heroPrimary} onPress={() => record(nextCourse.id)}>
              <Ionicons name="mic" size={16} color={UI.ink} />
              <Text style={styles.heroPrimaryText}>Record lecture</Text>
            </Pressable>
            <Pressable style={styles.heroGhost} onPress={() => router.push(`/teach/course/${nextCourse.id}` as Href)}>
              <Text style={styles.heroGhostText}>Prepare</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <EmptyState
          compact
          icon="calendar-outline"
          title="No classes scheduled"
          message="Add weekly lecture times to your courses to see what's next."
          primary={{ label: 'Manage courses', onPress: () => router.push('/onboarding/lecturer-setup' as Href) }}
        />
      )}

      <Grid min={300}>
        <Panel title="Today's teaching" subtitle={todays.length ? `${todays.length} ${todays.length === 1 ? 'class' : 'classes'}` : undefined}>
          {todays.length ? (
            todays.map((o, i) => {
              const c = courses.find((x) => x.id === o.slot.courseId);
              return (
                <View key={o.slot.id}>
                  {i > 0 && <Divider />}
                  <ListRow
                    icon="time-outline"
                    title={`${o.slot.startTime} · ${o.slot.courseCode}`}
                    subtitle={`${c?.title ?? ''} · ${o.slot.venue}`}
                    right={o.inProgress ? <StatusBadge status="warning" label="Now" /> : undefined}
                    onPress={() => router.push(`/teach/course/${o.slot.courseId}` as Href)}
                  />
                </View>
              );
            })
          ) : (
            <Text style={styles.muted}>No classes today.</Text>
          )}
        </Panel>

        <Panel title="Course alerts" subtitle="Topics where students are struggling">
          {alerts.length ? (
            alerts.map((a, i) => (
              <View key={a.course.id}>
                {i > 0 && <Divider />}
                <ListRow
                  icon="alert-circle-outline"
                  title={`${a.course.code}: ${a.topic.topic}`}
                  subtitle={`Only ${a.topic.mastery}% answering correctly`}
                  onPress={() => router.push({ pathname: '/lecturer/insights', params: { courseId: a.course.id } } as any)}
                />
              </View>
            ))
          ) : (
            <Text style={styles.muted}>No topics below 55% mastery.</Text>
          )}
        </Panel>
      </Grid>

      <Text style={styles.section}>Student learning signals</Text>
      <Grid min={150}>
        <StatTile label="Active this week" value={`${active}`} delta={{ text: `of ${cohort} students`, up: true }} icon="people-outline" />
        <StatTile label="Average mastery" value={`${avgMastery}%`} icon="school-outline" />
        <StatTile label="At risk" value={`${atRisk}`} delta={{ text: 'students across courses', up: false }} icon="warning-outline" />
      </Grid>

      {worst && (worst.i.cohort.find((c) => c.status === 'critical')?.count ?? 0) > 0 && (
        <Panel title="Important intervention">
          <Text style={styles.body}>
            {worst.i.cohort.find((c) => c.status === 'critical')?.count} students in {worst.course.code} are at risk, mostly on{' '}
            <Text style={styles.bold}>{worst.i.topics[0]?.topic}</Text>. A short revision pack before the next class usually helps.
          </Text>
          <View style={styles.actionsRow}>
            <Pressable
              style={styles.darkBtn}
              onPress={() => router.push({ pathname: '/teach/revision/[id]', params: { id: 'new', courseId: worst.course.id } } as any)}
            >
              <Text style={styles.darkBtnText}>Create revision pack</Text>
            </Pressable>
            <Pressable
              style={styles.outlineBtn}
              onPress={() => router.push({ pathname: '/teach/announcement', params: { courseId: worst.course.id } } as any)}
            >
              <Text style={styles.outlineBtnText}>Message class</Text>
            </Pressable>
          </View>
        </Panel>
      )}

      <SampleBanner text="Class figures are sample data until your students are connected. Your courses, schedule and recordings are real." />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  setup: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: UI.amberSoft, borderRadius: 14, padding: 14 },
  setupText: { flex: 1, fontFamily: LexiFonts.bodyMedium, fontSize: 14, color: '#7a4f12' },
  hero: { backgroundColor: UI.ink, borderRadius: 22, padding: 20 },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#fdf1df',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: UI.error },
  heroPillText: { fontFamily: LexiFonts.labelSmBold, fontSize: 11, letterSpacing: 1, color: '#7a4f12' },
  heroCode: { fontFamily: LexiFonts.labelSmBold, fontSize: 13, letterSpacing: 1.4, color: '#e9c349', marginTop: 14 },
  heroTitle: { fontFamily: LexiFonts.headlineLg, fontSize: 24, lineHeight: 30, color: '#fff', marginTop: 2 },
  heroMeta: { fontFamily: LexiFonts.bodyRegular, fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 6 },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  heroPrimary: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10 },
  heroPrimaryText: { fontFamily: LexiFonts.labelSmBold, fontSize: 14, color: UI.ink },
  heroGhost: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10 },
  heroGhostText: { fontFamily: LexiFonts.labelSmBold, fontSize: 14, color: '#fff' },
  section: { fontFamily: LexiFonts.headlineMd, fontSize: 19, color: UI.ink, marginTop: 6 },
  muted: { fontFamily: LexiFonts.bodyRegular, fontSize: 14, color: UI.muted },
  body: { fontFamily: LexiFonts.bodyRegular, fontSize: 15, lineHeight: 22, color: UI.inkSoft },
  bold: { fontFamily: LexiFonts.labelSmBold, color: UI.ink },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  darkBtn: { backgroundColor: UI.ink, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10 },
  darkBtnText: { fontFamily: LexiFonts.labelSmBold, fontSize: 14, color: '#fff' },
  outlineBtn: { borderWidth: 1, borderColor: UI.border, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10 },
  outlineBtnText: { fontFamily: LexiFonts.labelSmBold, fontSize: 14, color: UI.ink },
});

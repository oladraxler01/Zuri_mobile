import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useZuriFonts } from '@/hooks/use-zuri-fonts';
import { useAcademic, type TimetableSlot } from '@/context/academic-context';
import { useLectures } from '@/context/lectures-context';
import { LectureCard } from '@/components/lecture/lecture-card';
import { EmptyState } from '@/components/states/state-view';
import { useMaterials } from '@/context/materials-context';
import { usePlanner } from '@/context/planner-context';
import { MaterialCard } from '@/components/materials/material-card';
import { AssessmentCard } from '@/components/planner/assessment-card';
import { pickAndUploadMaterial } from '@/utils/pick-material';
import { useProgress } from '@/context/progress-context';
import { courseMastery, overallMastery } from '@/utils/mastery';
import { CourseTopics, ActivityList, activityFor } from '@/components/course/course-topics';
import { WeakTopicsFromZuri } from '@/components/academic/from-zuri';
import { describeStart, formatDuration, upcomingClasses } from '@/utils/time';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'lectures', label: 'Lectures' },
  { key: 'materials', label: 'Materials' },
  { key: 'assessments', label: 'Assessments' },
  { key: 'topics', label: 'Topics' },
  { key: 'activity', label: 'Activity' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const DAY_ORDER: TimetableSlot['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAME: Record<TimetableSlot['day'], string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
};

export default function CourseDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; tab?: string }>();
  const [fontsLoaded] = useZuriFonts();
  const { state } = useAcademic();
  const { lectures } = useLectures();
  const { materials } = useMaterials();
  const { assessments } = usePlanner();
  const courseMaterials = materials.filter((m) => m.courseId === params.id).sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  const courseAssessments = assessments.filter((a) => a.courseId === params.id).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const nextDue = courseAssessments.find((a) => a.status !== 'done' && new Date(a.dueAt) > new Date());
  const { events } = useProgress();
  const mastery = useMemo(() => courseMastery(params.id, lectures, materials, events), [params.id, lectures, materials, events]);
  const overall = overallMastery(mastery);
  const answers = events.filter((e) => e.courseId === params.id && e.type === 'quiz-answer');
  const activity = useMemo(
    () => activityFor({ lectures, materials, assessments, events }, params.id),
    [lectures, materials, assessments, events, params.id]
  );

  const course = state.courses.find((c) => c.id === params.id);
  const [tab, setTab] = useState<TabKey>(
    TABS.some((t) => t.key === params.tab) ? (params.tab as TabKey) : 'overview'
  );

  const slots = useMemo(
    () =>
      state.timetable
        .filter((s) => s.courseId === params.id)
        .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)),
    [state.timetable, params.id]
  );
  const courseLectures = useMemo(
    () => lectures.filter((l) => l.courseId === params.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [lectures, params.id]
  );
  const next = upcomingClasses(slots)[0];
  const latest = courseLectures[0];
  const totalSeconds = courseLectures.reduce((s, l) => s + l.durationSeconds, 0);

  // Topics covered = unique concepts across this course's processed lectures.
  const topics = useMemo(() => {
    const seen = new Map<string, string>();
    courseLectures.forEach((l) =>
      l.analysis?.concepts.forEach((c) => {
        if (!seen.has(c.title.toLowerCase())) seen.set(c.title.toLowerCase(), c.title);
      })
    );
    return [...seen.values()];
  }, [courseLectures]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/explore' as Href));
  const record = () =>
    router.push({
      pathname: '/lecture-recording',
      params: { courseId: course?.id, courseCode: course?.code, courseTitle: course?.title },
    } as any);

  if (!fontsLoaded) return <View style={styles.container} />;

  if (!course) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
        <Text style={styles.body}>This course is no longer in your list.</Text>
        <Pressable onPress={goBack} style={styles.outlineBtn}>
          <Text style={styles.outlineBtnText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <Pressable onPress={goBack} hitSlop={10} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={UI.ink} />
        </Pressable>
        <Pressable onPress={record} hitSlop={10} style={styles.recordPill} accessibilityLabel="Record a lecture">
          <Ionicons name="mic" size={14} color="#fff" />
          <Text style={styles.recordPillText}>Record</Text>
        </Pressable>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.codePill, { backgroundColor: course.color ?? UI.ink }]}>
          <Text style={styles.codePillText}>{course.code}</Text>
        </View>
        <Text style={styles.title}>{course.title}</Text>
        <Text style={styles.meta}>
          {course.lecturer ?? 'Lecturer not set'} · {course.units} units
        </Text>

        <View style={styles.stats}>
          <Stat value={String(courseLectures.length)} label="lectures" />
          <View style={styles.statDivider} />
          <Stat value={totalSeconds ? formatDuration(totalSeconds) : '0m'} label="recorded" />
          <View style={styles.statDivider} />
          <Stat value={String(slots.length)} label="classes / week" />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.tabs} accessibilityRole="tablist">
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.tab, tab === t.key && styles.tabOn]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.key }}
          >
            <Text style={[styles.tabText, tab === t.key && { color: '#fff' }]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {tab === 'overview' && (
          <>
            <WeakTopicsFromZuri course={course} />
            <Text style={styles.sectionLabel}>YOUR STANDING</Text>
            <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={() => setTab('topics')}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.standingBig}>{overall === null ? '—' : `${overall}%`}</Text>
                  <Text style={styles.cardMeta}>{overall === null ? 'Take a lecture quiz to measure mastery' : 'average mastery across tested topics'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={UI.muted} />
              </View>
              <View style={styles.standingRow}>
                <Text style={styles.standingItem}>
                  <Text style={styles.standingN}>{mastery.filter((c) => c.level === 'strong').length}</Text> strong
                </Text>
                <Text style={styles.standingItem}>
                  <Text style={styles.standingN}>{mastery.filter((c) => c.level === 'weak').length}</Text> weak
                </Text>
                <Text style={styles.standingItem}>
                  <Text style={styles.standingN}>{mastery.filter((c) => c.level === 'new').length}</Text> untested
                </Text>
                <Text style={styles.standingItem}>
                  <Text style={styles.standingN}>{answers.length}</Text> answers
                </Text>
              </View>
              {mastery.find((c) => c.level === 'weak') && (
                <Text style={styles.standingHint}>Weakest: {mastery.find((c) => c.level === 'weak')!.concept}</Text>
              )}
            </Pressable>

            <Text style={styles.sectionLabel}>NEXT CLASS</Text>
            {next ? (
              <Pressable
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                onPress={() => router.push({ pathname: '/upcoming-lecture', params: { slotId: next.slot.id } } as any)}
              >
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>{describeStart(next)}</Text>
                  <Ionicons name="chevron-forward" size={18} color={UI.muted} />
                </View>
                <Text style={styles.cardMeta}>
                  {DAY_NAME[next.slot.day]} · {next.slot.startTime} – {next.slot.endTime}
                </Text>
                <Text style={styles.cardMeta}>{next.slot.venue}</Text>
              </Pressable>
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardMeta}>No classes on your timetable for this course.</Text>
              </View>
            )}

            {nextDue && (
              <>
                <Text style={styles.sectionLabel}>NEXT DEADLINE</Text>
                <AssessmentCard item={nextDue} showCourse={false} />
              </>
            )}

            <Text style={styles.sectionLabel}>LATEST LECTURE</Text>
            {latest ? (
              <>
                <LectureCard lecture={latest} showCourse={false} />
                {latest.analysis && (
                  <Text style={[styles.body, { marginTop: 10 }]} numberOfLines={4}>
                    {latest.analysis.summary}
                  </Text>
                )}
              </>
            ) : (
              <View style={[styles.card, { alignItems: 'center', paddingVertical: 24 }]}>
                <Ionicons name="mic-outline" size={24} color={UI.amber} />
                <Text style={[styles.cardMeta, { textAlign: 'center', marginVertical: 8 }]}>
                  No lectures recorded for {course.code} yet.
                </Text>
                <Pressable style={styles.darkBtn} onPress={record}>
                  <Text style={styles.darkBtnText}>Record the next class</Text>
                </Pressable>
              </View>
            )}

            {topics.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>TOPICS COVERED SO FAR</Text>
                <View style={styles.topicWrap}>
                  {topics.map((t) => (
                    <View key={t} style={styles.topic}>
                      <Text style={styles.topicText}>{t}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {tab === 'schedule' &&
          (slots.length ? (
            <View style={{ gap: 10 }}>
              {slots.map((s) => (
                <Pressable
                  key={s.id}
                  style={({ pressed }) => [styles.card, styles.slot, pressed && styles.pressed]}
                  onPress={() => router.push({ pathname: '/upcoming-lecture', params: { slotId: s.id } } as any)}
                >
                  <View style={styles.dayBox}>
                    <Text style={styles.dayText}>{s.day.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      {s.startTime} – {s.endTime}
                    </Text>
                    <View style={styles.venueRow}>
                      <Ionicons name="location-outline" size={14} color={UI.muted} />
                      <Text style={styles.cardMeta}>{s.venue}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={UI.muted} />
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyState
              compact
              icon="calendar-outline"
              title="No classes scheduled"
              message={`${course.code} isn’t on your timetable yet, so there are no reminders for it.`}
            />
          ))}

        {tab === 'lectures' &&
          (courseLectures.length ? (
            <View style={{ gap: 10 }}>
              {courseLectures.map((l) => (
                <LectureCard key={l.id} lecture={l} showCourse={false} />
              ))}
            </View>
          ) : (
            <EmptyState
              compact
              icon="mic-outline"
              title="No lectures yet"
              message={`Record a ${course.code} class to get its transcript, notes and questions here.`}
              primary={{ label: 'Record a lecture', icon: 'mic', onPress: record }}
            />
          ))}
        {tab === 'materials' && (
          <>
            <Pressable style={styles.inlineAction} onPress={() => pickAndUploadMaterial(course.id)}>
              <Ionicons name="cloud-upload-outline" size={18} color={UI.ink} />
              <Text style={styles.inlineActionText}>Upload material</Text>
            </Pressable>
            {courseMaterials.length ? (
              <View style={{ gap: 10 }}>
                {courseMaterials.map((m) => (
                  <MaterialCard key={m.id} m={m} showCourse={false} />
                ))}
              </View>
            ) : (
              <EmptyState
                compact
                icon="folder-open-outline"
                title="No materials yet"
                message={`Upload ${course.code} notes, slides or past questions to study from them.`}
              />
            )}
          </>
        )}

        {tab === 'topics' && <CourseTopics concepts={mastery} onRecord={record} courseId={course.id} />}

        {tab === 'activity' && <ActivityList items={activity} />}

        {tab === 'assessments' && (
          <>
            <Pressable
              style={styles.inlineAction}
              onPress={() => router.push({ pathname: '/assessment/edit', params: { courseId: course.id } } as any)}
            >
              <Ionicons name="add" size={18} color={UI.ink} />
              <Text style={styles.inlineActionText}>Add assignment, test or exam</Text>
            </Pressable>
            {courseAssessments.length ? (
              <View style={{ gap: 10 }}>
                {courseAssessments.map((a) => (
                  <AssessmentCard key={a.id} item={a} showCourse={false} />
                ))}
              </View>
            ) : (
              <EmptyState compact icon="calendar-outline" title="Nothing due" message={`No assignments or exams added for ${course.code}.`} />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  recordPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: UI.ink,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  recordPillText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 13, color: '#fff' },
  header: { paddingHorizontal: 20, paddingBottom: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  codePill: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
  codePillText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 12, letterSpacing: 1, color: '#fff' },
  title: { fontFamily: ZuriFonts.headlineLg, fontSize: 28, lineHeight: 34, color: UI.ink },
  meta: { fontFamily: ZuriFonts.bodyRegular, fontSize: 14, color: UI.muted, marginTop: 6 },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    paddingVertical: 14,
    marginTop: 16,
  },
  statDivider: { width: 1, height: 28, backgroundColor: UI.border },
  statValue: { fontFamily: ZuriFonts.headlineMd, fontSize: 20, color: UI.ink },
  statLabel: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 2 },
  tabs: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: UI.borderSoft,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  standingBig: { fontFamily: ZuriFonts.headlineLg, fontSize: 30, color: UI.ink },
  standingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: UI.borderSoft },
  standingItem: { fontFamily: ZuriFonts.bodyRegular, fontSize: 13, color: UI.muted },
  standingN: { fontFamily: ZuriFonts.labelSmBold, color: UI.ink },
  standingHint: { fontFamily: ZuriFonts.bodyMedium, fontSize: 13, color: UI.error, marginTop: 8 },
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: UI.border,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  inlineActionText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 14, color: UI.ink },
  tabOn: { backgroundColor: UI.ink },
  tabText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 13, color: UI.inkSoft },
  scroll: { padding: 20, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  sectionLabel: {
    fontFamily: ZuriFonts.labelSmBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: UI.muted,
    marginTop: 18,
    marginBottom: 10,
  },
  card: { backgroundColor: UI.card, borderRadius: 16, borderWidth: 1, borderColor: UI.border, padding: 16 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontFamily: ZuriFonts.bodyMedium, fontSize: 16, color: UI.ink },
  cardMeta: { fontFamily: ZuriFonts.bodyRegular, fontSize: 14, color: UI.muted, marginTop: 2 },
  body: { fontFamily: ZuriFonts.bodyRegular, fontSize: 15, lineHeight: 22, color: UI.inkSoft },
  darkBtn: { backgroundColor: UI.ink, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 10 },
  darkBtnText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 14, color: '#fff' },
  outlineBtn: { borderWidth: 1, borderColor: UI.border, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 10 },
  outlineBtnText: { fontFamily: ZuriFonts.labelSmBold, color: UI.ink },
  topicWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topic: { backgroundColor: UI.cardMuted, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  topicText: { fontFamily: ZuriFonts.bodyMedium, fontSize: 13, color: UI.ink },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  dayBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: UI.amberSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 12, color: '#7a4f12' },
  venueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  emptyText: { fontFamily: ZuriFonts.bodyRegular, fontSize: 14, color: UI.muted, textAlign: 'center', marginTop: 24 },
});

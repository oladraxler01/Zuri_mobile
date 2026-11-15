import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { useLexiFonts } from '@/hooks/use-lexi-fonts';
import { useAcademic, type TimetableSlot } from '@/context/academic-context';
import { useLectures } from '@/context/lectures-context';
import { LectureCard } from '@/components/lecture/lecture-card';
import { describeStart, formatDuration, upcomingClasses } from '@/utils/time';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'lectures', label: 'Lectures' },
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
  const [fontsLoaded] = useLexiFonts();
  const { state } = useAcademic();
  const { lectures } = useLectures();

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

      <View style={styles.tabs} accessibilityRole="tablist">
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
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {tab === 'overview' && (
          <>
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
            <Text style={styles.emptyText}>No classes scheduled. Add them from your timetable.</Text>
          ))}

        {tab === 'lectures' &&
          (courseLectures.length ? (
            <View style={{ gap: 10 }}>
              {courseLectures.map((l) => (
                <LectureCard key={l.id} lecture={l} showCourse={false} />
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No lectures recorded for {course.code} yet.</Text>
          ))}
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
  recordPillText: { fontFamily: LexiFonts.labelSmBold, fontSize: 13, color: '#fff' },
  header: { paddingHorizontal: 20, paddingBottom: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  codePill: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
  codePillText: { fontFamily: LexiFonts.labelSmBold, fontSize: 12, letterSpacing: 1, color: '#fff' },
  title: { fontFamily: LexiFonts.headlineLg, fontSize: 28, lineHeight: 34, color: UI.ink },
  meta: { fontFamily: LexiFonts.bodyRegular, fontSize: 14, color: UI.muted, marginTop: 6 },
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
  statValue: { fontFamily: LexiFonts.headlineMd, fontSize: 20, color: UI.ink },
  statLabel: { fontFamily: LexiFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 2 },
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
  tabOn: { backgroundColor: UI.ink },
  tabText: { fontFamily: LexiFonts.labelSmBold, fontSize: 13, color: UI.inkSoft },
  scroll: { padding: 20, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  sectionLabel: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: UI.muted,
    marginTop: 18,
    marginBottom: 10,
  },
  card: { backgroundColor: UI.card, borderRadius: 16, borderWidth: 1, borderColor: UI.border, padding: 16 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontFamily: LexiFonts.bodyMedium, fontSize: 16, color: UI.ink },
  cardMeta: { fontFamily: LexiFonts.bodyRegular, fontSize: 14, color: UI.muted, marginTop: 2 },
  body: { fontFamily: LexiFonts.bodyRegular, fontSize: 15, lineHeight: 22, color: UI.inkSoft },
  darkBtn: { backgroundColor: UI.ink, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 10 },
  darkBtnText: { fontFamily: LexiFonts.labelSmBold, fontSize: 14, color: '#fff' },
  outlineBtn: { borderWidth: 1, borderColor: UI.border, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 10 },
  outlineBtnText: { fontFamily: LexiFonts.labelSmBold, color: UI.ink },
  topicWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topic: { backgroundColor: UI.cardMuted, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  topicText: { fontFamily: LexiFonts.bodyMedium, fontSize: 13, color: UI.ink },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  dayBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: UI.amberSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontFamily: LexiFonts.labelSmBold, fontSize: 12, color: '#7a4f12' },
  venueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  emptyText: { fontFamily: LexiFonts.bodyRegular, fontSize: 14, color: UI.muted, textAlign: 'center', marginTop: 24 },
});

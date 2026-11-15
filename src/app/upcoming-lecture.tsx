import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { useLexiFonts } from '@/hooks/use-lexi-fonts';
import { useAcademic } from '@/context/academic-context';
import { useLectures } from '@/context/lectures-context';
import { describeStart, nextOccurrence, upcomingClasses } from '@/utils/time';
import { lectureTitle } from '@/components/lecture/lecture-card';

/** Upcoming lecture + preparation from the previous lecture in the same course. */
export default function UpcomingLectureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slotId?: string }>();
  const [fontsLoaded] = useLexiFonts();
  const { state } = useAcademic();
  const { lectures } = useLectures();

  // Re-render every 30s so the countdown stays current.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const slot = state.timetable.find((s) => s.id === params.slotId) ?? upcomingClasses(state.timetable, now)[0]?.slot;
  const occ = slot ? nextOccurrence(slot, now) : undefined;
  const course = state.courses.find((c) => c.id === slot?.courseId);

  const previous = lectures
    .filter((l) => l.courseId === slot?.courseId && l.status === 'ready' && l.analysis)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as Href));
  const record = () =>
    router.push({
      pathname: '/lecture-recording',
      params: { courseId: course?.id, courseCode: slot?.courseCode, courseTitle: course?.title },
    } as any);

  if (!fontsLoaded) return <View style={styles.container} />;

  if (!slot || !occ) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }]}>
        <Ionicons name="calendar-outline" size={30} color={UI.muted} />
        <Text style={styles.body}>No classes on your timetable yet.</Text>
        <Pressable onPress={goBack} style={styles.outlineBtn}>
          <Text style={styles.outlineBtnText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const when = describeStart(occ, now);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={UI.bg} />
      <View style={styles.topBar}>
        <Pressable onPress={goBack} hitSlop={10} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={UI.ink} />
        </Pressable>
        <Text style={styles.topTitle}>Upcoming lecture</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.whenPill, occ.inProgress && { backgroundColor: '#ffe3e0' }]}>
            {occ.inProgress && <View style={styles.liveDot} />}
            <Text style={[styles.whenText, occ.inProgress && { color: UI.error }]}>{when.toUpperCase()}</Text>
          </View>
          <Text style={styles.code}>{slot.courseCode}</Text>
          <Text style={styles.title}>{course?.title ?? 'Course'}</Text>

          <View style={styles.facts}>
            <Fact icon="time-outline" text={`${slot.startTime} – ${slot.endTime}`} />
            <Fact icon="location-outline" text={slot.venue} />
            {course?.lecturer && <Fact icon="person-outline" text={course.lecturer} />}
          </View>
        </View>

        {/* Preparation */}
        <Text style={styles.sectionLabel}>PREPARE IN 5 MINUTES</Text>
        {previous?.analysis ? (
          <>
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() => router.push(`/lecture/${previous.id}` as Href)}
            >
              <Text style={styles.cardEyebrow}>LAST TIME IN {slot.courseCode}</Text>
              <Text style={styles.cardTitle}>{lectureTitle(previous)}</Text>
              <Text style={styles.cardBody} numberOfLines={4}>
                {previous.analysis.summary}
              </Text>
              <View style={styles.linkRow}>
                <Text style={styles.linkText}>Open lecture</Text>
                <Ionicons name="arrow-forward" size={14} color={UI.ink} />
              </View>
            </Pressable>

            {previous.analysis.knowledgeGap && (
              <View style={[styles.card, styles.gapCard]}>
                <Text style={[styles.cardEyebrow, { color: UI.error }]}>REVISIT BEFORE CLASS</Text>
                <Text style={styles.cardTitle}>{previous.analysis.knowledgeGap.concept}</Text>
                <Text style={styles.cardBody}>{previous.analysis.knowledgeGap.reason}</Text>
              </View>
            )}

            <View style={styles.quickRow}>
              <QuickAction
                icon="albums-outline"
                label={`${previous.analysis.flashcards.length} flashcards`}
                onPress={() => router.push({ pathname: '/lecture/[id]', params: { id: previous.id, tab: 'overview' } } as any)}
              />
              <QuickAction
                icon="help-circle-outline"
                label={`${previous.analysis.questions.length}-question quiz`}
                onPress={() => router.push({ pathname: '/lecture/[id]', params: { id: previous.id, tab: 'questions' } } as any)}
              />
            </View>
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nothing to review yet</Text>
            <Text style={styles.cardBody}>
              Record this class and next time you'll see a recap, the concept to revisit, and flashcards here.
            </Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>BEFORE YOU START</Text>
        <View style={styles.card}>
          {['Arrive early and sit near the front.', 'Charge your phone; long lectures use battery.', 'Keep Lexi open while recording.'].map(
            (tip) => (
              <View key={tip} style={styles.tip}>
                <Ionicons name="checkmark-circle-outline" size={18} color={UI.success} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            )
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={({ pressed }) => [styles.recordBtn, pressed && styles.pressed]} onPress={record}>
          <Ionicons name="mic" size={18} color="#fff" />
          <Text style={styles.recordBtnText}>{occ.inProgress ? 'Record now' : 'Record this lecture'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Fact({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={16} color={UI.inkSoft} />
      <Text style={styles.factText}>{text}</Text>
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.quick, pressed && styles.pressed]} onPress={onPress}>
      <Ionicons name={icon} size={20} color={UI.ink} />
      <Text style={styles.quickText}>{label}</Text>
    </Pressable>
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
    borderBottomWidth: 1,
    borderBottomColor: UI.borderSoft,
  },
  topTitle: { fontFamily: LexiFonts.labelSmBold, fontSize: 15, color: UI.ink },
  scroll: { padding: 20, paddingBottom: 32, maxWidth: 640, width: '100%', alignSelf: 'center' },
  hero: {
    backgroundColor: UI.ink,
    borderRadius: 22,
    padding: 22,
  },
  whenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#fdf1df',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: UI.error },
  whenText: { fontFamily: LexiFonts.labelSmBold, fontSize: 11, letterSpacing: 1, color: '#7a4f12' },
  code: { fontFamily: LexiFonts.labelSmBold, fontSize: 13, letterSpacing: 1.4, color: '#e9c349' },
  title: { fontFamily: LexiFonts.headlineLg, fontSize: 26, lineHeight: 32, color: '#fff', marginTop: 4 },
  facts: { marginTop: 16, gap: 8 },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  factText: { fontFamily: LexiFonts.bodyMedium, fontSize: 13, color: UI.ink },
  sectionLabel: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: UI.muted,
    marginTop: 24,
    marginBottom: 10,
  },
  card: { backgroundColor: UI.card, borderRadius: 16, borderWidth: 1, borderColor: UI.border, padding: 16, marginBottom: 10 },
  gapCard: { backgroundColor: '#fff8f6', borderColor: UI.errorSoft },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  cardEyebrow: { fontFamily: LexiFonts.labelSmBold, fontSize: 10, letterSpacing: 1.2, color: UI.amber, marginBottom: 4 },
  cardTitle: { fontFamily: LexiFonts.headlineMd, fontSize: 18, color: UI.ink, marginBottom: 4 },
  cardBody: { fontFamily: LexiFonts.bodyRegular, fontSize: 14, lineHeight: 20, color: UI.inkSoft },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  linkText: { fontFamily: LexiFonts.labelSmBold, fontSize: 14, color: UI.ink, textDecorationLine: 'underline' },
  quickRow: { flexDirection: 'row', gap: 10 },
  quick: {
    flex: 1,
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
    gap: 8,
  },
  quickText: { fontFamily: LexiFonts.bodyMedium, fontSize: 14, color: UI.ink },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  tipText: { flex: 1, fontFamily: LexiFonts.bodyRegular, fontSize: 14, color: UI.inkSoft },
  body: { fontFamily: LexiFonts.bodyRegular, fontSize: 15, color: UI.inkSoft, textAlign: 'center' },
  outlineBtn: { borderWidth: 1, borderColor: UI.border, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 10 },
  outlineBtnText: { fontFamily: LexiFonts.labelSmBold, color: UI.ink },
  footer: { padding: 16, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: UI.borderSoft, backgroundColor: UI.bg },
  recordBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: UI.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  recordBtnText: { fontFamily: LexiFonts.labelSmBold, fontSize: 15, color: '#fff' },
});

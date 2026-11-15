import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiColors, LexiFonts, LexiSpacing } from '@/constants/lexi-theme';
import { useLexiFonts } from '@/hooks/use-lexi-fonts';
import { useAcademic } from '@/context/academic-context';
import { useLectures } from '@/context/lectures-context';
import { describeStart, upcomingClasses, formatDuration } from '@/utils/time';
import { lectureTitle } from '@/components/lecture/lecture-card';
import { usePlanner } from '@/context/planner-context';
import { useFeed } from '@/context/feed-context';
import { useMaterials } from '@/context/materials-context';
import { describeDue, daysUntil } from '@/utils/planner';
import { kindMeta } from '@/components/planner/assessment-card';

export default function AcademicHomeScreen() {
  const router = useRouter();
  const [fontsLoaded] = useLexiFonts();
  const { state } = useAcademic();
  const { lectures } = useLectures();
  const { materials } = useMaterials();
  const feed = useFeed();
  const { assessments } = usePlanner();
  const openWork = assessments
    .filter((a) => a.status !== 'done')
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  // Deadline intervention: overdue or due within 3 days.
  const urgent = openWork.find((a) => daysUntil(a.dueAt) <= 3 && (a.kind === 'assignment' || a.kind === 'project' || new Date(a.dueAt) > new Date()));
  // Exam preparation: next test/exam within 14 days (if it isn't already the urgent card).
  const exam = openWork.find((a) => (a.kind === 'exam' || a.kind === 'test') && new Date(a.dueAt) > new Date() && daysUntil(a.dueAt) <= 14 && a.id !== urgent?.id);

  // Modals for interactive actions

  if (!fontsLoaded) {
    return <View style={styles.container} />;
  }

  const upcoming = upcomingClasses(state.timetable);
  const nextOcc = upcoming[0];
  const nextClass = nextOcc?.slot;
  const nextCourse = state.courses.find((c) => c.id === nextClass?.courseId);
  const laterClasses = upcoming.slice(1, 3);

  // Post-lecture state: the most recent lecture recorded in the last 24 hours.
  const recentLecture = [...lectures]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .find((l) => Date.now() - new Date(l.createdAt).getTime() < 24 * 60 * 60 * 1000);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = state.studentName.trim().split(/\s+/)[0] ?? '';
  const todayCount = upcoming.filter((o) => o.start.toDateString() === now.toDateString()).length;
  const daySummary =
    todayCount === 0
      ? 'No more classes today. A good time to review your recent lectures.'
      : `You have ${todayCount} ${todayCount === 1 ? 'class' : 'classes'} left today.`;

  // Getting started checklist for students who haven't used the main features yet.
  const startSteps = [
    { label: 'Set up your timetable', done: state.timetable.length > 0, onPress: () => router.push('/onboarding/student-timetable' as Href) },
    { label: 'Record your first lecture', done: lectures.length > 0, onPress: () => handleStartRecording(nextClass?.courseId) },
    { label: 'Upload notes or past questions', done: materials.length > 0, onPress: () => router.push('/materials' as Href) },
    { label: 'Add an assignment or exam', done: assessments.some((a) => !a.id.startsWith('a_seed')), onPress: () => router.push('/assessment/edit' as Href) },
  ];
  const startDone = startSteps.filter((s) => s.done).length;
  const showStart = startDone < startSteps.length && !feed.isHidden('welcome');

  // Recommended review: the concept to revisit from your latest processed lecture.

  const handleStartRecording = (courseId?: string) => {
    const course = state.courses.find((c) => c.id === courseId);
    router.push({
      pathname: '/lecture-recording',
      params: course ? { courseId: course.id, courseCode: course.code, courseTitle: course.title } : {},
    } as any);
  };

  const openUpcoming = (slotId?: string) =>
    router.push({ pathname: '/upcoming-lecture', params: slotId ? { slotId } : {} } as any);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Top Navigation Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="school" size={24} color="#272e0a" />
          <Text style={styles.headerLogo}>LEXI</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Pressable
          style={styles.profileBtn}
          onPress={() => router.push('/notifications' as Href)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Notifications${feed.unread ? `, ${feed.unread} unread` : ''}`}
        >
          <Ionicons name="notifications-outline" size={24} color="#272e0a" />
          {feed.unread > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{feed.unread > 9 ? '9+' : feed.unread}</Text>
            </View>
          )}
        </Pressable>
        <Pressable
          style={styles.profileBtn}
          onPress={() => router.push('/(tabs)/you' as Href)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Account Profile"
        >
          <Ionicons name="person-circle-outline" size={28} color="#272e0a" />
        </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Post-lecture state */}
        {recentLecture && (
          <Pressable
            style={({ pressed }) => [styles.postLectureCard, pressed && styles.btnPressed]}
            onPress={() => router.push(`/lecture/${recentLecture.id}` as Href)}
          >
            <View style={styles.alertHeaderRow}>
              <Text style={styles.postLectureTag}>
                {recentLecture.status === 'ready'
                  ? 'YOUR NOTES ARE READY'
                  : recentLecture.status === 'failed'
                    ? 'NEEDS ATTENTION'
                    : recentLecture.status === 'waiting'
                      ? 'SAVED · WAITING FOR INTERNET'
                    : 'PROCESSING YOUR LECTURE'}
              </Text>
              <Ionicons
                name={recentLecture.status === 'ready' ? 'checkmark-circle' : recentLecture.status === 'failed' ? 'alert-circle' : 'sync'}
                size={18}
                color={recentLecture.status === 'failed' ? '#ba1a1a' : '#e9c349'}
              />
            </View>
            <Text style={styles.postLectureTitle}>
              {recentLecture.courseCode}: {lectureTitle(recentLecture)}
            </Text>
            <Text style={styles.postLectureMeta}>
              {recentLecture.status === 'ready' && recentLecture.analysis
                ? `${recentLecture.analysis.concepts.length} key concepts · ${recentLecture.analysis.questions.length} questions · ${recentLecture.analysis.flashcards.length} flashcards`
                : recentLecture.status === 'failed'
                  ? 'Processing stopped. Tap to try again.'
                  : recentLecture.status === 'waiting'
                    ? `${formatDuration(recentLecture.durationSeconds)} recorded · uploads when you’re back online`
                  : `${formatDuration(recentLecture.durationSeconds)} recorded · ${recentLecture.status === 'uploading' ? `uploading ${Math.round((recentLecture.progress ?? 0) * 100)}%` : 'preparing notes'}`}
            </Text>
            {recentLecture.status === 'ready' && (
              <View style={styles.postLectureActions}>
                <View style={styles.postLectureBtn}>
                  <Text style={styles.postLectureBtnText}>Review notes</Text>
                </View>
                <Pressable
                  style={styles.postLectureBtnGhost}
                  onPress={() =>
                    router.push({ pathname: '/lecture/[id]', params: { id: recentLecture.id, tab: 'questions' } } as any)
                  }
                >
                  <Text style={styles.postLectureBtnGhostText}>Take quiz</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        )}

        {/* New student: getting started */}
        {showStart && (
          <View style={styles.startCard}>
            <View style={styles.startHead}>
              <Text style={styles.startTitle}>Get started with your semester</Text>
              <Pressable onPress={() => feed.dismiss('welcome')} hitSlop={10} accessibilityLabel="Hide getting started">
                <Ionicons name="close" size={18} color="#77786c" />
              </Pressable>
            </View>
            <Text style={styles.startSub}>
              {startDone} of {startSteps.length} done
            </Text>
            {startSteps.map((st) => (
              <Pressable key={st.label} style={styles.startRow} onPress={st.onPress} disabled={st.done}>
                <Ionicons name={st.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={st.done ? '#2f6b3a' : '#77786c'} />
                <Text style={[styles.startText, st.done && styles.startTextDone]}>{st.label}</Text>
                {!st.done && <Ionicons name="chevron-forward" size={16} color="#77786c" />}
              </Pressable>
            ))}
          </View>
        )}

        {/* Deadline intervention */}
        {urgent && (
          <Pressable
            style={({ pressed }) => [styles.dueCard, new Date(urgent.dueAt) < new Date() && styles.dueCardLate, pressed && styles.btnPressed]}
            onPress={() => router.push(`/assessment/${urgent.id}` as Href)}
          >
            <View style={styles.dueIcon}>
              <Ionicons name={kindMeta(urgent.kind).icon} size={20} color="#7a4f12" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dueTag}>
                {urgent.courseCode} · {describeDue(urgent).toUpperCase()}
              </Text>
              <Text style={styles.dueTitle} numberOfLines={2}>
                {urgent.title}
              </Text>
              <Text style={styles.dueMeta}>
                {urgent.steps.filter((s) => s.done).length} of {urgent.steps.length} preparation steps done
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#7a4f12" />
          </Pressable>
        )}

        {/* Exam preparation */}
        {exam && (
          <Pressable
            style={({ pressed }) => [styles.examCard, pressed && styles.btnPressed]}
            onPress={() => router.push(`/assessment/${exam.id}` as Href)}
          >
            <View style={styles.examCount}>
              <Text style={styles.examDays}>{daysUntil(exam.dueAt)}</Text>
              <Text style={styles.examDaysLabel}>{daysUntil(exam.dueAt) === 1 ? 'day' : 'days'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.examTag}>
                {kindMeta(exam.kind).label.toUpperCase()} PREP · {exam.courseCode}
              </Text>
              <Text style={styles.examTitle} numberOfLines={2}>
                {exam.title}
              </Text>
              <Text style={styles.examMeta}>Open your revision plan and past questions</Text>
            </View>
          </Pressable>
        )}

        {/* Proactive Lecture Recording Alert Banner */}
        {nextOcc && (
        <View style={styles.proactiveAlertCard}>
          <View style={styles.alertHeaderRow}>
            <View style={styles.alertBadge}>
              <View style={styles.pulsingDot} />
              <Text style={styles.alertBadgeText}>{describeStart(nextOcc).toUpperCase()}</Text>
            </View>
            <Ionicons name="notifications" size={16} color="#c5832b" />
          </View>

          <Text style={styles.alertTitle}>Ready to capture {nextClass.courseCode}?</Text>
          <Text style={styles.alertSubtitle}>
            {nextOcc.inProgress ? 'Your class is on now' : 'Your next class'} at {nextClass.venue}. Record it to get a transcript, notes and questions afterwards.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.alertRecordBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={() => handleStartRecording(nextClass.courseId)}
          >
            <Ionicons name="mic" size={18} color="#ffffff" />
            <Text style={styles.alertRecordBtnText}>Start Recording Lecture</Text>
          </Pressable>
        </View>
        )}

        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingTitle}>
            {greeting}
            {firstName ? `,\n${firstName}.` : '.'}
          </Text>
          <Text style={styles.greetingSubtitle}>{daySummary}</Text>
        </View>

        {/* Timeline Structure */}
        <View style={styles.timelineContainer}>
          {/* Vertical Timeline Guide Line */}
          <View style={styles.timelineGuideLine} />

          {/* NEXT UP Section */}
          {nextOcc && (
          <View style={styles.timelineSection}>
            <View style={styles.milestoneDotGold} />

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.tagGold}>NEXT UP</Text>
              <Text style={styles.timeTagText}>
                {nextClass.startTime} — {nextClass.endTime}
              </Text>
            </View>

            <View style={styles.nextCard}>
              <View style={styles.cardGoldGlow} />

              <Text style={styles.nextCourseTitle}>
                {nextClass.courseCode}: {nextCourse?.title ?? 'Upcoming class'}
              </Text>

              <View style={styles.venueRow}>
                <Ionicons name="location-outline" size={16} color={LexiColors.onSurfaceVariant} />
                <Text style={styles.venueText}>{nextClass.venue}</Text>
              </View>

              <View style={styles.actionButtonsRow}>
                <Pressable
                  style={styles.primaryActionBtn}
                  onPress={() => router.push({ pathname: '/course/[id]', params: { id: nextClass.courseId, tab: 'materials' } } as any)}
                >
                  <Text style={styles.primaryActionBtnText}>Materials</Text>
                </Pressable>

                <Pressable
                  style={styles.secondaryActionBtn}
                  onPress={() => openUpcoming(nextClass.id)}
                >
                  <Text style={styles.secondaryActionBtnText}>Prepare</Text>
                </Pressable>

                <Pressable
                  style={styles.micQuickBtn}
                  onPress={() => handleStartRecording(nextClass.courseId)}
                  hitSlop={6}
                  accessibilityLabel="Record Lecture"
                >
                  <Ionicons name="mic-outline" size={18} color="#272e0a" />
                </Pressable>
              </View>
            </View>
          </View>

          )}

          {/* RECOMMENDED FOR YOU — the most important suggestion from the feed */}
          {feed.top && (
          <View style={styles.timelineSection}>
            <View style={styles.milestoneDotBulb}>
              <Ionicons name="bulb-outline" size={12} color="#272e0a" />
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.tagMuted}>RECOMMENDED FOR YOU</Text>
            </View>

            <Pressable style={styles.reviewCard} onPress={() => router.push(feed.top!.href as Href)}>
              <View style={styles.reviewCardTop}>
                <Text style={styles.reviewTopicTitle}>{feed.top.title}</Text>
                <Ionicons name={feed.top.icon} size={18} color="#c5832b" />
              </View>

              <Text style={styles.reviewDesc}>{feed.top.recommendation?.why ?? feed.top.body}</Text>

              <View style={styles.reviewLinkRow}>
                <Text style={styles.reviewLinkText}>See what to do</Text>
                <Ionicons name="arrow-forward" size={15} color="#c5832b" />
              </View>
            </Pressable>
          </View>
          )}

          {/* COMING UP Section */}
          {laterClasses.length > 0 && (
          <View style={styles.timelineSection}>
            <View style={styles.milestoneDotSmall} />

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.tagMuted}>COMING UP</Text>
            </View>

            <View style={styles.laterList}>
              {laterClasses.map((occ, i) => {
                const c = state.courses.find((x) => x.id === occ.slot.courseId);
                return (
                  <View key={occ.slot.id}>
                    {i > 0 && <View style={styles.laterDivider} />}
                    <Pressable style={styles.laterItem} onPress={() => openUpcoming(occ.slot.id)}>
                      <Text style={styles.laterTime}>{`${occ.slot.day}\n${occ.slot.startTime}`}</Text>
                      <View style={styles.laterDetails}>
                        <Text style={styles.laterTitle}>
                          {occ.slot.courseCode}: {c?.title ?? ''}
                        </Text>
                        <Text style={styles.laterVenue}>{occ.slot.venue}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={LexiColors.outline} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
          )}

          {/* QUICK ACTIONS Section */}
          <View style={styles.quickActionsSection}>
            <Text style={styles.tagMuted}>QUICK ACTIONS</Text>
            <View style={styles.quickActionsRow}>
              <Pressable
                style={styles.quickActionCard}
                onPress={() => router.push('/study' as Href)}
              >
                <Ionicons name="book-outline" size={20} color="#272e0a" />
                <Text style={styles.quickActionTitle}>Study session</Text>
              </Pressable>

              <Pressable style={styles.quickActionCard} onPress={() => router.push('/ask' as Href)}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#272e0a" />
                <Text style={styles.quickActionTitle}>Ask about your notes</Text>
              </Pressable>

              <Pressable style={styles.quickActionCard} onPress={() => router.push('/materials' as Href)}>
                <Ionicons name="folder-open-outline" size={20} color="#272e0a" />
                <Text style={styles.quickActionTitle}>Materials</Text>
              </Pressable>

              <Pressable
                style={styles.quickActionCard}
                onPress={() => router.push('/lectures' as Href)}
              >
                <Ionicons name="albums-outline" size={20} color="#272e0a" />
                <Text style={styles.quickActionTitle}>
                  Lecture Archive{lectures.length ? ` · ${lectures.length}` : ''}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ba1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: { fontFamily: LexiFonts.labelSmBold, fontSize: 10, color: '#ffffff' },
  startCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.4)',
    padding: 16,
    marginBottom: 14,
  },
  startHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  startTitle: { fontFamily: LexiFonts.headlineMd, fontSize: 18, color: '#272e0a', flex: 1 },
  startSub: { fontFamily: LexiFonts.labelSmBold, fontSize: 12, color: '#c5832b', marginTop: 2, marginBottom: 6 },
  startRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  startText: { flex: 1, fontFamily: LexiFonts.bodyMedium, fontSize: 14, color: '#272e0a' },
  startTextDone: { color: '#77786c', textDecorationLine: 'line-through' },
  dueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fdf1df',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f1d7ab',
    padding: 16,
    marginBottom: 14,
  },
  dueCardLate: { backgroundColor: '#fff1ef', borderColor: '#f6c9c2' },
  dueIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dueTag: { fontFamily: LexiFonts.labelSmBold, fontSize: 11, letterSpacing: 0.8, color: '#9a5b0b' },
  dueTitle: { fontFamily: LexiFonts.headlineMd, fontSize: 17, lineHeight: 22, color: '#272e0a', marginTop: 2 },
  dueMeta: { fontFamily: LexiFonts.bodyRegular, fontSize: 12, color: '#6b5a3a', marginTop: 3 },
  examCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.4)',
    padding: 16,
    marginBottom: 14,
  },
  examCount: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: '#272e0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  examDays: { fontFamily: LexiFonts.headlineMd, fontSize: 22, color: '#e9c349', lineHeight: 26 },
  examDaysLabel: { fontFamily: LexiFonts.labelSmBold, fontSize: 10, color: 'rgba(255,255,255,0.75)' },
  examTag: { fontFamily: LexiFonts.labelSmBold, fontSize: 11, letterSpacing: 0.8, color: '#c5832b' },
  examTitle: { fontFamily: LexiFonts.headlineMd, fontSize: 17, lineHeight: 22, color: '#272e0a', marginTop: 2 },
  examMeta: { fontFamily: LexiFonts.bodyRegular, fontSize: 12, color: '#77786c', marginTop: 3 },
  postLectureCard: {
    backgroundColor: '#272e0a',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  postLectureTag: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#e9c349',
  },
  postLectureTitle: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 20,
    lineHeight: 26,
    color: '#ffffff',
    marginTop: 10,
  },
  postLectureMeta: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
  postLectureActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  postLectureBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  postLectureBtnText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: '#272e0a',
  },
  postLectureBtnGhost: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  postLectureBtnGhostText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9f7f2', // surface-cream
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(199, 199, 185, 0.25)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 22,
    letterSpacing: -0.5,
    color: '#272e0a',
    fontWeight: '700',
  },
  profileBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  // Proactive Alert Banner
  proactiveAlertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#c5832b',
    marginBottom: 24,
    shadowColor: '#c5832b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(197, 131, 43, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ba1a1a',
  },
  alertBadgeText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 11,
    color: '#c5832b',
    letterSpacing: 0.5,
  },
  alertTitle: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 17,
    color: '#272e0a',
    fontWeight: '600',
    marginBottom: 4,
  },
  alertSubtitle: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 13,
    lineHeight: 18,
    color: LexiColors.onSurfaceVariant,
    marginBottom: 14,
  },
  alertRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#272e0a',
    paddingVertical: 12,
    borderRadius: 10,
  },
  alertRecordBtnText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: '#ffffff',
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  // Greeting
  greetingSection: {
    marginBottom: 24,
  },
  greetingTitle: {
    fontFamily: LexiFonts.headlineLgMobile,
    fontSize: 32,
    lineHeight: 38,
    color: '#272e0a',
    fontWeight: '700',
    marginBottom: 6,
  },
  greetingSubtitle: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 15,
    lineHeight: 22,
    color: LexiColors.onSurfaceVariant,
  },
  // Timeline
  timelineContainer: {
    position: 'relative',
    paddingLeft: 22,
  },
  timelineGuideLine: {
    position: 'absolute',
    top: 6,
    bottom: 40,
    left: 7,
    width: 1.5,
    backgroundColor: 'rgba(199, 199, 185, 0.4)',
  },
  timelineSection: {
    position: 'relative',
    marginBottom: 28,
  },
  milestoneDotGold: {
    position: 'absolute',
    left: -22,
    top: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#c5832b',
    backgroundColor: '#f9f7f2',
    zIndex: 2,
  },
  milestoneDotBulb: {
    position: 'absolute',
    left: -22,
    top: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#eae8e3',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  milestoneDotSmall: {
    position: 'absolute',
    left: -19,
    top: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: LexiColors.outlineVariant,
    zIndex: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tagGold: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 11,
    letterSpacing: 1,
    color: '#c5832b',
    fontWeight: '700',
  },
  tagMuted: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 11,
    letterSpacing: 1,
    color: LexiColors.outline,
    fontWeight: '700',
    marginBottom: 8,
  },
  timeTagText: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 13,
    color: LexiColors.onSurfaceVariant,
  },
  // Next Card
  nextCard: {
    position: 'relative',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(197, 131, 43, 0.25)',
    shadowColor: '#c5832b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
    overflow: 'hidden',
  },
  cardGoldGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 80,
    height: 80,
    backgroundColor: 'rgba(197, 131, 43, 0.04)',
    borderBottomLeftRadius: 80,
  },
  nextCourseTitle: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 19,
    color: '#272e0a',
    fontWeight: '600',
    marginBottom: 6,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  venueText: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 13,
    color: LexiColors.onSurfaceVariant,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryActionBtn: {
    backgroundColor: '#272e0a',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  primaryActionBtnText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: '#ffffff',
  },
  secondaryActionBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.6)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  secondaryActionBtnText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: '#272e0a',
  },
  micQuickBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#f5f3ee',
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  // Review Card
  reviewCard: {
    backgroundColor: '#f5f3ee',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#c5832b',
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.25)',
  },
  reviewCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reviewTopicTitle: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 17,
    color: '#272e0a',
    fontWeight: '600',
  },
  durationChip: {
    backgroundColor: '#eae8e3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationChipText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 10,
    color: LexiColors.primary,
  },
  reviewDesc: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 13,
    lineHeight: 18,
    color: LexiColors.onSurfaceVariant,
    marginBottom: 12,
  },
  reviewLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewLinkText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: '#c5832b',
  },
  // Later Today
  laterList: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.3)',
    overflow: 'hidden',
  },
  laterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  laterTime: {
    width: 68,
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: LexiColors.onSurfaceVariant,
  },
  laterDetails: {
    flex: 1,
  },
  laterTitle: {
    fontFamily: LexiFonts.bodyLg,
    fontSize: 14,
    fontWeight: '600',
    color: '#272e0a',
  },
  laterVenue: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 12,
    color: LexiColors.onSurfaceVariant,
    marginTop: 2,
  },
  laterDivider: {
    height: 1,
    backgroundColor: 'rgba(199, 199, 185, 0.25)',
    marginLeft: 82,
  },
  // Quick actions
  quickActionsSection: {
    marginTop: 6,
  },
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    flexBasis: '46%',
    flexGrow: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.3)',
    gap: 8,
  },
  quickActionTitle: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: '#272e0a',
  },
  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 18,
    color: '#272e0a',
    fontWeight: '700',
  },
  modalBodyText: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 14,
    lineHeight: 22,
    color: LexiColors.onSurface,
  },
  flashcardBox: {
    backgroundColor: '#f5f3ee',
    borderRadius: 12,
    padding: 16,
    marginVertical: 14,
  },
  flashcardQ: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 16,
    color: '#272e0a',
    fontWeight: '600',
    marginBottom: 8,
  },
  flashcardA: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 14,
    lineHeight: 20,
    color: LexiColors.onSurfaceVariant,
  },
  doneBtn: {
    backgroundColor: '#272e0a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  doneBtnText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 14,
    color: '#ffffff',
  },
});

import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useZuriFonts } from '@/hooks/use-zuri-fonts';
import { useAcademic } from '@/context/academic-context';
import { useLectures } from '@/context/lectures-context';
import { describeStart, upcomingClasses, formatDuration } from '@/utils/time';
import { lectureTitle } from '@/components/lecture/lecture-card';
import { usePlanner } from '@/context/planner-context';
import { useFeed } from '@/context/feed-context';
import { useMaterials } from '@/context/materials-context';
import { describeDue, daysUntil } from '@/utils/planner';
import { kindMeta } from '@/components/planner/assessment-card';
import { TodayFromZuri } from '@/components/academic/from-zuri';
import { MissingInfoPrompts } from '@/components/academic/missing-info';
import { makeStyles, useTheme } from '@/theme';

export default function AcademicHomeScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const [fontsLoaded] = useZuriFonts();
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
          <Ionicons name="school" size={24} color={colors.text} />
          <Text style={styles.headerLogo}>ZURI</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Pressable
          style={styles.profileBtn}
          onPress={() => router.push('/search' as Href)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Search"
        >
          <Ionicons name="search-outline" size={23} color={colors.text} />
        </Pressable>
        <Pressable
          style={styles.profileBtn}
          onPress={() => router.push('/notifications' as Href)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Notifications${feed.unread ? `, ${feed.unread} unread` : ''}`}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
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
          <Ionicons name="person-circle-outline" size={28} color={colors.text} />
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
                color={recentLecture.status === 'failed' ? colors.danger : colors.accent}
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

        {/* Today's cards from Zuri's academic service (hidden when there are none) */}
        <TodayFromZuri />

        {/* Missing class times / venues Zuri asks for (hidden when none) */}
        <MissingInfoPrompts />

        {/* New student: getting started */}
        {showStart && (
          <View style={styles.startCard}>
            <View style={styles.startHead}>
              <Text style={styles.startTitle}>Get started with your semester</Text>
              <Pressable onPress={() => feed.dismiss('welcome')} hitSlop={10} accessibilityLabel="Hide getting started">
                <Ionicons name="close" size={18} color={colors['text-subtle']} />
              </Pressable>
            </View>
            <Text style={styles.startSub}>
              {startDone} of {startSteps.length} done
            </Text>
            {startSteps.map((st) => (
              <Pressable key={st.label} style={styles.startRow} onPress={st.onPress} disabled={st.done}>
                <Ionicons name={st.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={st.done ? colors.success : colors['text-subtle']} />
                <Text style={[styles.startText, st.done && styles.startTextDone]}>{st.label}</Text>
                {!st.done && <Ionicons name="chevron-forward" size={16} color={colors['text-subtle']} />}
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
              <Ionicons name={kindMeta(urgent.kind).icon} size={20} color={colors.warning} />
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
            <Ionicons name="chevron-forward" size={18} color={colors.warning} />
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
            <Ionicons name="notifications" size={16} color={colors.warning} />
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
            <Ionicons name="mic" size={18} color={colors['on-primary']} />
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
                <Ionicons name="location-outline" size={16} color={colors['text-muted']} />
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
                  <Ionicons name="mic-outline" size={18} color={colors.text} />
                </Pressable>
              </View>
            </View>
          </View>

          )}

          {/* RECOMMENDED FOR YOU — the most important suggestion from the feed */}
          {feed.top && (
          <View style={styles.timelineSection}>
            <View style={styles.milestoneDotBulb}>
              <Ionicons name="bulb-outline" size={12} color={colors.text} />
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.tagMuted}>RECOMMENDED FOR YOU</Text>
            </View>

            <Pressable style={styles.reviewCard} onPress={() => router.push(feed.top!.href as Href)}>
              <View style={styles.reviewCardTop}>
                <Text style={styles.reviewTopicTitle}>{feed.top.title}</Text>
                <Ionicons name={feed.top.icon} size={18} color={colors.warning} />
              </View>

              <Text style={styles.reviewDesc}>{feed.top.recommendation?.why ?? feed.top.body}</Text>

              <View style={styles.reviewLinkRow}>
                <Text style={styles.reviewLinkText}>See what to do</Text>
                <Ionicons name="arrow-forward" size={15} color={colors.warning} />
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
                      <Ionicons name="chevron-forward" size={16} color={colors['text-subtle']} />
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
                <Ionicons name="book-outline" size={20} color={colors.text} />
                <Text style={styles.quickActionTitle}>Study session</Text>
              </Pressable>

              <Pressable style={styles.quickActionCard} onPress={() => router.push('/ask' as Href)}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.text} />
                <Text style={styles.quickActionTitle}>Ask about your notes</Text>
              </Pressable>

              <Pressable
                style={styles.quickActionCard}
                onPress={() => router.push('/classmates' as Href)}
                accessibilityRole="button"
                accessibilityLabel="Ask classmates for notes"
              >
                <Ionicons name="people-outline" size={20} color={colors.text} />
                <Text style={styles.quickActionTitle}>Ask classmates</Text>
              </Pressable>

              <Pressable style={styles.quickActionCard} onPress={() => router.push('/materials' as Href)}>
                <Ionicons name="folder-open-outline" size={20} color={colors.text} />
                <Text style={styles.quickActionTitle}>Materials</Text>
              </Pressable>

              <Pressable
                style={styles.quickActionCard}
                onPress={() => router.push('/lectures' as Href)}
              >
                <Ionicons name="albums-outline" size={20} color={colors.text} />
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

const useStyles = makeStyles((t) => ({
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: { ...t.type.caption, color: t.colors['on-primary'] },
  startCard: {
    backgroundColor: t.colors['surface-raised'],
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: 16,
    marginBottom: 14,
  },
  startHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  startTitle: { ...t.type['title-2'], color: t.colors.text, flex: 1 },
  startSub: { ...t.type.caption, color: t.colors['accent-text'], marginTop: 2, marginBottom: 6 },
  startRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  startText: { ...t.type.subhead, flex: 1, color: t.colors.text },
  startTextDone: { color: t.colors['text-subtle'], textDecorationLine: 'line-through' },
  dueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: t.colors['warning-container'],
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.warning,
    padding: 16,
    marginBottom: 14,
  },
  dueCardLate: { backgroundColor: t.colors['danger-container'], borderColor: t.colors.danger },
  dueIcon: {
    width: 40,
    height: 40,
    borderRadius: t.radius.md,
    backgroundColor: t.colors['surface-raised'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dueTag: { ...t.type.caption, letterSpacing: 0.8, color: t.colors.warning },
  dueTitle: { ...t.type['title-2'], color: t.colors.text, marginTop: 2 },
  dueMeta: { ...t.type.caption, color: t.colors.warning, marginTop: 3 },
  examCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: t.colors['surface-raised'],
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: 16,
    marginBottom: 14,
  },
  examCount: {
    width: 58,
    height: 58,
    borderRadius: t.radius.md,
    backgroundColor: t.colors['surface-inverse'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  examDays: { ...t.type['title-2'], color: t.colors.accent, },
  examDaysLabel: { ...t.type.caption, color: t.colors['text-on-inverse-muted'] },
  examTag: { ...t.type.caption, letterSpacing: 0.8, color: t.colors['accent-text'] },
  examTitle: { ...t.type['title-2'], color: t.colors.text, marginTop: 2 },
  examMeta: { ...t.type.caption, color: t.colors['text-subtle'], marginTop: 3 },
  postLectureCard: {
    backgroundColor: t.colors['surface-inverse'],
    borderRadius: t.radius.lg,
    padding: 20,
    marginBottom: 20,
  },
  postLectureTag: { ...t.type.eyebrow, color: t.colors.accent,
  },
  postLectureTitle: { ...t.type['title-2'], color: t.colors['text-on-inverse'],
    marginTop: 10,
  },
  postLectureMeta: { ...t.type.footnote, color: t.colors['text-on-inverse-muted'],
    marginTop: 6,
  },
  postLectureActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  postLectureBtn: {
    backgroundColor: t.colors['surface-raised'],
    borderRadius: t.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  postLectureBtnText: { ...t.type.subhead, color: t.colors.text,
  },
  postLectureBtnGhost: {
    borderWidth: 1,
    borderColor: t.colors['text-on-inverse-muted'],
    borderRadius: t.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  postLectureBtnGhostText: { ...t.type.subhead, color: t.colors['text-on-inverse'],
  },
  container: {
    flex: 1,
    backgroundColor: t.colors.surface, // surface-cream
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: { ...t.type['title-2'], letterSpacing: -0.5,
    color: t.colors.text,
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
    backgroundColor: t.colors['surface-raised'],
    borderRadius: t.radius.full,
    padding: 16,
    borderWidth: 1.5,
    borderColor: t.colors.accent,
    marginBottom: 24, boxShadow: t.shadows.card,},
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
    backgroundColor: t.colors['warning-container'],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: t.radius.sm,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.danger,
  },
  alertBadgeText: { ...t.type.caption, color: t.colors['accent-text'],
    letterSpacing: 0.5,
  },
  alertTitle: { ...t.type['title-2'], color: t.colors.text,
    marginBottom: 4,
  },
  alertSubtitle: { ...t.type.footnote, color: t.colors['text-muted'],
    marginBottom: 14,
  },
  alertRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: t.colors.primary,
    paddingVertical: 12,
    borderRadius: t.radius.md,
  },
  alertRecordBtnText: { ...t.type.subhead, color: t.colors['on-primary'],
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  // Greeting
  greetingSection: {
    marginBottom: 24,
  },
  greetingTitle: { ...t.type.display, color: t.colors.text,
    marginBottom: 6,
  },
  greetingSubtitle: { ...t.type.callout, color: t.colors['text-muted'],
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
    backgroundColor: t.colors.border,
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
    borderRadius: t.radius.full,
    borderWidth: 3,
    borderColor: t.colors.accent,
    backgroundColor: t.colors.surface,
    zIndex: 2,
  },
  milestoneDotBulb: {
    position: 'absolute',
    left: -22,
    top: 2,
    width: 16,
    height: 16,
    borderRadius: t.radius.full,
    backgroundColor: t.colors['surface-sunken'],
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
    borderRadius: t.radius.full,
    backgroundColor: t.colors.border,
    zIndex: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tagGold: { ...t.type.eyebrow, color: t.colors['accent-text'],
    },
  tagMuted: { ...t.type.eyebrow, color: t.colors['text-subtle'],
    marginBottom: 8,
  },
  timeTagText: { ...t.type.footnote, color: t.colors['text-muted'],
  },
  // Next Card
  nextCard: {
    position: 'relative',
    backgroundColor: t.colors['surface-raised'],
    borderRadius: t.radius.full,
    padding: 18,
    borderWidth: 1,
    borderColor: t.colors.warning,
    overflow: 'hidden', boxShadow: t.shadows.raised,},
  cardGoldGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 80,
    height: 80,
    backgroundColor: t.colors['warning-container'],
    borderBottomLeftRadius: t.radius.full,
  },
  nextCourseTitle: { ...t.type['title-2'], color: t.colors.text,
    marginBottom: 6,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  venueText: { ...t.type.footnote, color: t.colors['text-muted'],
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryActionBtn: {
    backgroundColor: t.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: t.radius.md,
  },
  primaryActionBtnText: { ...t.type.subhead, color: t.colors['on-primary'],
  },
  secondaryActionBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: t.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: t.radius.md,
  },
  secondaryActionBtnText: { ...t.type.subhead, color: t.colors.text,
  },
  micQuickBtn: {
    width: 38,
    height: 38,
    borderRadius: t.radius.md,
    backgroundColor: t.colors['surface-sunken'],
    borderWidth: 1,
    borderColor: t.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  // Review Card
  reviewCard: {
    backgroundColor: t.colors['surface-sunken'],
    borderRadius: t.radius.md,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: t.colors.accent,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  reviewCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reviewTopicTitle: { ...t.type['title-2'], color: t.colors.text,
    },
  durationChip: {
    backgroundColor: t.colors['surface-sunken'],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: t.radius.sm,
  },
  durationChipText: { ...t.type.caption, color: t.colors.text,
  },
  reviewDesc: { ...t.type.footnote, color: t.colors['text-muted'],
    marginBottom: 12,
  },
  reviewLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewLinkText: { ...t.type.subhead, color: t.colors['accent-text'],
  },
  // Later Today
  laterList: {
    backgroundColor: t.colors['surface-raised'],
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    overflow: 'hidden',
  },
  laterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: t.space[3],
  },
  laterTime: { ...t.type.footnote, fontFamily: t.type.subhead.fontFamily, width: 72,
    color: t.colors['text-muted'],
  },
  laterDetails: {
    flex: 1,
  },
  laterTitle: { ...t.type.callout, color: t.colors.text,
  },
  laterVenue: { ...t.type.caption, color: t.colors['text-muted'],
    marginTop: 2,
  },
  laterDivider: {
    height: 1,
    backgroundColor: t.colors.border,
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
    backgroundColor: t.colors['surface-raised'],
    borderRadius: t.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: t.colors.border,
    gap: 8,
  },
  quickActionTitle: { ...t.type.subhead, color: t.colors.text,
  },
  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: t.colors.scrim,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: t.colors['surface-raised'],
    borderTopLeftRadius: t.radius.lg,
    borderTopRightRadius: t.radius.lg,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { ...t.type['title-2'], color: t.colors.text,
    },
  modalBodyText: { ...t.type.callout, color: t.colors.text,
  },
  flashcardBox: {
    backgroundColor: t.colors['surface-sunken'],
    borderRadius: t.radius.md,
    padding: 16,
    marginVertical: 14,
  },
  flashcardQ: { ...t.type['title-2'], color: t.colors.text,
    marginBottom: 8,
  },
  flashcardA: { ...t.type.callout, color: t.colors['text-muted'],
  },
  doneBtn: {
    backgroundColor: t.colors.primary,
    paddingVertical: 12,
    borderRadius: t.radius.md,
    alignItems: 'center',
    marginTop: 8,
  },
  doneBtnText: { ...t.type.subhead, color: t.colors['on-primary'],
  },
}));

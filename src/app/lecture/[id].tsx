import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { useLexiFonts } from '@/hooks/use-lexi-fonts';
import { useLectures } from '@/context/lectures-context';
import { formatDuration, formatLectureDate } from '@/utils/time';
import { lectureTitle } from '@/components/lecture/lecture-card';
import { ProcessingView, FailedView, CompleteView, WaitingView } from '@/components/lecture/processing-view';
import { OverviewTab } from '@/components/lecture/overview-tab';
import { TranscriptTab } from '@/components/lecture/transcript-tab';
import { NotesTab } from '@/components/lecture/notes-tab';
import { QuizTab } from '@/components/lecture/quiz-tab';
import { AudioPlayerBar } from '@/components/lecture/audio-player-bar';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { useProgress } from '@/context/progress-context';
import { useSession } from '@/context/session-context';
import { useLecturer } from '@/context/lecturer-context';
import { ClassTab } from '@/components/lecture/class-tab';
import { conceptForQuestion } from '@/utils/mastery';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'transcript', label: 'Transcript' },
  { key: 'notes', label: 'Notes' },
  { key: 'questions', label: 'Questions' },
] as const;
type TabKey = (typeof TABS)[number]['key'] | 'class';

export default function LectureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; tab?: string; t?: string }>();
  const [fontsLoaded] = useLexiFonts();
  const { getLecture, loaded, updateLecture, retryProcessing, deleteLecture } = useLectures();
  const lecture = getLecture(params.id);

  const { role } = useSession();
  const lecturer = useLecturer();
  const isLecturer = role === 'lecturer';
  const tabs: { key: TabKey; label: string }[] = isLecturer ? [...TABS, { key: 'class', label: 'Class' }] : [...TABS];
  const initialTab = tabs.some((t) => t.key === params.tab) ? (params.tab as TabKey) : 'overview';
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const progress = useProgress();

  const player = useAudioPlayer(lecture?.audioUri ? { uri: lecture.audioUri } : null);
  const status = useAudioPlayerStatus(player);
  const canSeek = !!lecture?.audioUri && status.isLoaded;

  // Opened from a cited source: jump to that moment once the audio is ready.
  const jumped = useRef(false);
  useEffect(() => {
    if (!canSeek || jumped.current || !params.t) return;
    jumped.current = true;
    player.seekTo(Number(params.t) || 0);
  }, [canSeek, params.t]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as Href);
  };

  const seek = (seconds: number) => {
    if (!canSeek) return;
    player.seekTo(seconds);
    player.play();
    setTab('transcript');
  };

  if (!fontsLoaded || !loaded) {
    return <View style={styles.container} />;
  }

  if (!lecture) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Ionicons name="trash-outline" size={30} color={UI.muted} />
        <Text style={styles.missingText}>This lecture is no longer on your phone.</Text>
        <Pressable onPress={goBack} style={styles.missingBtn}>
          <Text style={styles.missingBtnText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const ready = lecture.status === 'ready' && lecture.analysis;
  const showComplete = ready && !lecture.seenAt;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={UI.ink} />
        </Pressable>
        <Text style={styles.topCourse}>{lecture.courseCode}</Text>
        <Pressable
          onPress={() => setConfirmDelete(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Delete lecture"
        >
          <Ionicons name="trash-outline" size={20} color={UI.inkSoft} />
        </Pressable>
      </View>

      {lecture.status === 'waiting' ? (
        <WaitingView lecture={lecture} />
      ) : lecture.status === 'uploading' || lecture.status === 'processing' ? (
        <ProcessingView lecture={lecture} />
      ) : lecture.status === 'failed' || !lecture.analysis ? (
        <FailedView
          lecture={lecture}
          onRetry={() => retryProcessing(lecture.id)}
          onDelete={() => setConfirmDelete(true)}
        />
      ) : showComplete ? (
        <CompleteView lecture={lecture} onOpen={() => updateLecture(lecture.id, { seenAt: new Date().toISOString() })} />
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>
              {lectureTitle(lecture)}
            </Text>
            <Text style={styles.meta}>
              {formatLectureDate(lecture.createdAt)} · {formatDuration(lecture.durationSeconds)} · {lecture.courseTitle}
            </Text>
          </View>

          {/* Tabs */}
          <View style={styles.tabs} accessibilityRole="tablist">
            {tabs.map((t) => (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={[styles.tab, tab === t.key && styles.tabOn]}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === t.key }}
              >
                <Text style={[styles.tabText, tab === t.key && styles.tabTextOn]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ flex: 1 }}>
            {tab === 'overview' && (
              <OverviewTab
                lecture={lecture}
                canSeek={canSeek}
                onSeek={seek}
                onOpenQuiz={() => setTab('questions')}
                onCard={(card, knew) =>
                  progress.log({
                    type: 'flashcard',
                    courseId: lecture.courseId,
                    courseCode: lecture.courseCode,
                    concept: conceptForQuestion(
                      { id: '', question: card.question, options: [card.answer], correctIndex: 0, explanation: '' },
                      lecture.analysis!.concepts
                    ),
                    correct: knew,
                    sourceId: lecture.id,
                    sourceKind: 'lecture',
                  })
                }
              />
            )}
            {tab === 'transcript' && (
              <TranscriptTab
                transcript={lecture.analysis.transcript}
                currentTime={status.currentTime}
                playing={status.playing}
                canSeek={canSeek}
                onSeek={seek}
              />
            )}
            {tab === 'notes' && <NotesTab notes={lecture.analysis.notes} />}
            {tab === 'class' && isLecturer && (
              <ClassTab
                lecture={lecture}
                courseId={lecture.courseId}
                cohortSize={lecturer.courses.find((c) => c.id === lecture.courseId)?.cohortSize || 60}
              />
            )}
            {tab === 'questions' && (
              <QuizTab
                questions={lecture.analysis.questions}
                onAnswer={(q, correct) =>
                  progress.log({
                    type: 'quiz-answer',
                    courseId: lecture.courseId,
                    courseCode: lecture.courseCode,
                    concept: conceptForQuestion(q, lecture.analysis!.concepts),
                    correct,
                    sourceId: lecture.id,
                    sourceKind: 'lecture',
                  })
                }
                best={lecture.quizBest}
                onFinish={(score, total) => {
                  if (!lecture.quizBest || score > lecture.quizBest.score) {
                    updateLecture(lecture.id, { quizBest: { score, total } });
                  }
                }}
              />
            )}
          </View>

          {canSeek && <AudioPlayerBar player={player} status={status} fallbackDuration={lecture.durationSeconds} />}
        </>
      )}

      <ConfirmSheet
        visible={confirmDelete}
        title="Delete this lecture?"
        message="The recording, transcript and notes will be removed from this phone. This can't be undone."
        confirmLabel="Delete lecture"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          player.pause();
          deleteLecture(lecture.id);
          goBack();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  missingText: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 15,
    color: UI.inkSoft,
    textAlign: 'center',
  },
  missingBtn: {
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  missingBtnText: {
    fontFamily: LexiFonts.labelSmBold,
    color: UI.ink,
  },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: UI.borderSoft,
  },
  topCourse: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 14,
    letterSpacing: 1,
    color: UI.ink,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontFamily: LexiFonts.headlineLg,
    fontSize: 26,
    lineHeight: 32,
    color: UI.ink,
  },
  meta: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 13,
    color: UI.muted,
    marginTop: 6,
  },
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
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  tabOn: {
    backgroundColor: UI.ink,
  },
  tabText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: UI.inkSoft,
  },
  tabTextOn: {
    color: '#fff',
  },
});

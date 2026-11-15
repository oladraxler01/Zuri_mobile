import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useNavigation, usePreventRemove } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  setAudioModeAsync,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  type RecordingOptions,
} from 'expo-audio';
import { LexiColors, LexiFonts, LexiSpacing } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { useLexiFonts } from '@/hooks/use-lexi-fonts';
import { useAcademic, type CourseItem } from '@/context/academic-context';
import { useSession } from '@/context/session-context';
import { useLecturer } from '@/context/lecturer-context';
import { teachingTimetable } from '@/utils/lecturer';
import { useLectures } from '@/context/lectures-context';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { PermissionState } from '@/components/states/state-view';
import { formatClock, formatDuration, upcomingClasses } from '@/utils/time';

/** Voice-optimised settings from AUDIO_PROCESSING_SPEC.md: 16 kHz mono AAC, 64 kbps. */
const LECTURE_RECORDING: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 64000,
  web: { mimeType: 'audio/webm', bitsPerSecond: 64000 },
};

const BAR_COUNT = 28;

type Phase = 'checking' | 'needs-permission' | 'denied' | 'ready' | 'recording' | 'paused' | 'completed' | 'error';

export default function LectureRecordingScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ courseId?: string; courseCode?: string; courseTitle?: string }>();
  const [fontsLoaded] = useLexiFonts();
  const { state } = useAcademic();
  const { role } = useSession();
  const lecturer = useLecturer();
  const isLecturer = role === 'lecturer';
  const courseList: CourseItem[] = isLecturer
    ? lecturer.courses.map((c) => ({ id: c.id, code: c.code, title: c.title, units: 0 }))
    : state.courses;
  const timetable = isLecturer ? teachingTimetable(lecturer.courses) : state.timetable;
  const { saveRecording } = useLectures();

  const recorder = useAudioRecorder(LECTURE_RECORDING);
  const recState = useAudioRecorderState(recorder, 200);

  const [phase, setPhase] = useState<Phase>('checking');
  const [errorMsg, setErrorMsg] = useState('');
  const [levels, setLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(0.08));
  const [finalSeconds, setFinalSeconds] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const allowLeave = useRef(false);
  const pendingLeave = useRef<any>(null);

  // ── Course selection ──
  const defaultCourse = useMemo<CourseItem | undefined>(() => {
    const byParam =
      courseList.find((c) => c.id === params.courseId) ??
      courseList.find((c) => c.code.toLowerCase() === params.courseCode?.toLowerCase());
    if (byParam) return byParam;
    const next = upcomingClasses(timetable)[0];
    return courseList.find((c) => c.id === next?.slot.courseId) ?? courseList[0];
  }, []);
  const [course, setCourse] = useState<CourseItem | undefined>(defaultCourse);
  const courseCode = course?.code ?? params.courseCode ?? 'Lecture';
  const courseTitle = course?.title ?? params.courseTitle ?? 'Untitled course';

  // ── Permission check on open ──
  useEffect(() => {
    (async () => {
      try {
        const perm = await getRecordingPermissionsAsync();
        if (perm.granted) setPhase('ready');
        else if (perm.canAskAgain === false) setPhase('denied');
        else setPhase('needs-permission');
      } catch {
        setPhase('needs-permission');
      }
    })();
  }, []);

  // ── Meter → waveform ──
  useEffect(() => {
    if (phase !== 'recording') return;
    const db = recState.metering;
    // dB is roughly -60 (silence) … 0 (loud). Fall back to gentle motion if unavailable.
    const level =
      typeof db === 'number' ? Math.max(0.06, Math.min(1, (db + 60) / 60)) : 0.25 + Math.random() * 0.5;
    setLevels((prev) => [...prev.slice(1), level]);
  }, [recState.durationMillis]);

  // ── Block accidental exits while recording ──
  const isActive = phase === 'recording' || phase === 'paused' || phase === 'completed';
  usePreventRemove(isActive, ({ data }) => {
    if (allowLeave.current) {
      navigation.dispatch(data.action);
      return;
    }
    pendingLeave.current = data.action;
    setConfirmLeave(true);
  });

  const requestPermission = async () => {
    const perm = await requestRecordingPermissionsAsync();
    if (perm.granted) setPhase('ready');
    else setPhase(perm.canAskAgain === false ? 'denied' : 'needs-permission');
  };

  const start = async () => {
    try {
      try {
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, allowsBackgroundRecording: true });
      } catch {
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase('recording');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'The microphone could not be started.');
      setPhase('error');
    }
  };

  const togglePause = () => {
    if (phase === 'recording') {
      recorder.pause();
      setPhase('paused');
    } else if (phase === 'paused') {
      recorder.record();
      setPhase('recording');
    }
  };

  const stop = async () => {
    const seconds = recState.durationMillis / 1000;
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      setFinalSeconds(seconds);
      setRecordingUri(recorder.uri);
      setPhase('completed');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'The recording could not be saved.');
      setPhase('error');
    }
  };

  const leave = () => {
    allowLeave.current = true;
    if (pendingLeave.current) navigation.dispatch(pendingLeave.current);
    else if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as Href);
  };

  const discard = async () => {
    if (phase === 'recording' || phase === 'paused') {
      await recorder.stop().catch(() => {});
    }
    leave();
  };

  const save = () => {
    if (!recordingUri) return;
    const id = saveRecording({
      courseId: course?.id,
      courseCode,
      courseTitle,
      durationSeconds: finalSeconds,
      recordingUri,
    });
    allowLeave.current = true;
    router.replace(`/lecture/${id}` as Href);
  };

  if (!fontsLoaded) return <View style={styles.container} />;

  const close = () => {
    if (isActive) setConfirmLeave(true);
    else leave();
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topBar}>
        <Pressable style={styles.closeBtn} onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="chevron-down" size={26} color={LexiColors.primary} />
        </Pressable>
        <Text style={styles.topBarTitle}>Lecture Capture</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {phase === 'checking' && null}

        {(phase === 'needs-permission' || phase === 'denied') && (
          <PermissionView denied={phase === 'denied'} onAllow={requestPermission} />
        )}

        {phase === 'error' && (
          <View style={styles.centerBlock}>
            <View style={[styles.bigIcon, { backgroundColor: UI.errorSoft }]}>
              <Ionicons name="mic-off-outline" size={30} color={UI.error} />
            </View>
            <Text style={styles.blockTitle}>Recording stopped</Text>
            <Text style={styles.blockText}>{errorMsg}</Text>
            <Pressable style={styles.primaryWide} onPress={() => setPhase('ready')}>
              <Text style={styles.primaryWideText}>Try again</Text>
            </Pressable>
          </View>
        )}

        {phase === 'ready' && (
          <>
            <Text style={styles.label}>RECORDING FOR</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.courseChips}>
              {courseList.map((c) => {
                const on = c.id === course?.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setCourse(c)}
                    style={[styles.courseChip, on && styles.courseChipOn]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                  >
                    <Text style={[styles.courseChipText, on && { color: '#fff' }]}>{c.code}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={styles.courseHeadline}>{courseTitle}</Text>

            <View style={styles.hubCard}>
              <Text style={styles.timerDisplay}>00:00</Text>
              <Pressable
                onPress={start}
                style={({ pressed }) => [styles.recordBtn, pressed && styles.btnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Start recording"
              >
                <View style={styles.recordDot} />
              </Pressable>
              <Text style={styles.hint}>Tap to start recording</Text>
            </View>

            <Tips />
          </>
        )}

        {(phase === 'recording' || phase === 'paused') && (
          <>
            <View style={styles.headerSection}>
              <Text style={styles.courseHeadline}>
                {courseCode}: {courseTitle}
              </Text>
              <View style={styles.statusBadgeRow}>
                <PulseDot paused={phase === 'paused'} />
                <Text style={styles.statusBadgeText}>{phase === 'paused' ? 'Paused' : 'Recording'}</Text>
              </View>
            </View>

            <View style={styles.hubCard}>
              <Text style={styles.timerDisplay}>{formatClock(recState.durationMillis / 1000)}</Text>

              <View style={styles.waveContainer} accessibilityElementsHidden>
                {levels.map((l, i) => (
                  <View
                    key={i}
                    style={[
                      styles.waveBar,
                      { height: 6 + l * 50, opacity: phase === 'paused' ? 0.3 : 0.35 + (i / BAR_COUNT) * 0.65 },
                    ]}
                  />
                ))}
              </View>

              <View style={styles.controlsRow}>
                <Pressable
                  style={({ pressed }) => [styles.pauseBtn, pressed && styles.btnPressed]}
                  onPress={togglePause}
                  accessibilityRole="button"
                  accessibilityLabel={phase === 'paused' ? 'Resume recording' : 'Pause recording'}
                >
                  <Ionicons name={phase === 'paused' ? 'play' : 'pause'} size={26} color={LexiColors.primary} />
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.stopBtn, pressed && styles.btnPressed]}
                  onPress={stop}
                  accessibilityRole="button"
                  accessibilityLabel="Stop recording"
                >
                  <Ionicons name="stop" size={20} color="#ffffff" />
                  <Text style={styles.stopBtnText}>Stop</Text>
                </Pressable>
              </View>
            </View>

            {phase === 'paused' && (
              <View style={styles.pausedNote}>
                <Ionicons name="pause-circle-outline" size={18} color={UI.amber} />
                <Text style={styles.pausedNoteText}>
                  Recording is paused. Nothing is being captured until you resume.
                </Text>
              </View>
            )}

            <Tips />
          </>
        )}

        {phase === 'completed' && (
          <View style={styles.centerBlock}>
            <View style={[styles.bigIcon, { backgroundColor: UI.successSoft }]}>
              <Ionicons name="checkmark" size={32} color={UI.success} />
            </View>
            <Text style={styles.blockTitle}>Recording complete</Text>
            <Text style={styles.blockText}>
              {formatDuration(finalSeconds)} recorded for {courseCode}. Save it to get a transcript, summary, notes and
              questions.
            </Text>

            <View style={styles.summaryCard}>
              <SummaryRow icon="school-outline" label="Course" value={`${courseCode} · ${courseTitle}`} />
              <SummaryRow icon="time-outline" label="Length" value={formatClock(finalSeconds)} />
              <SummaryRow icon="phone-portrait-outline" label="Saved to" value="This phone" />
            </View>

            <Pressable style={({ pressed }) => [styles.primaryWide, pressed && styles.btnPressed]} onPress={save}>
              <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
              <Text style={styles.primaryWideText}>Save & process</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.secondaryWide, pressed && styles.btnPressed]} onPress={() => setConfirmDiscard(true)}>
              <Text style={styles.secondaryWideText}>Discard</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <ConfirmSheet
        visible={confirmLeave}
        title={phase === 'completed' ? 'Leave without saving?' : 'End this recording?'}
        message={
          phase === 'completed'
            ? 'This recording hasn’t been saved. If you leave now it will be lost.'
            : 'Leaving now discards the recording. Tap Stop first if you want to keep it.'
        }
        confirmLabel="Discard recording"
        cancelLabel={phase === 'completed' ? 'Go back' : 'Keep recording'}
        destructive
        onCancel={() => {
          pendingLeave.current = null;
          setConfirmLeave(false);
        }}
        onConfirm={() => {
          setConfirmLeave(false);
          discard();
        }}
      />
      <ConfirmSheet
        visible={confirmDiscard}
        title="Discard this recording?"
        message="The audio will be deleted and can’t be recovered."
        confirmLabel="Discard"
        destructive
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          leave();
        }}
      />
    </SafeAreaView>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────

function PermissionView({ denied, onAllow }: { denied: boolean; onAllow: () => void }) {
  return (
    <PermissionState
      icon="mic-outline"
      title="Allow microphone access"
      message="The microphone is used only while you’re recording a lecture. Recordings stay on your phone until you choose to process them."
      deniedMessage="The microphone is turned off for this app. Turn it on in your phone’s settings, then come back."
      denied={denied}
      allowLabel="Allow microphone"
      onAllow={onAllow}
      points={[
        { icon: 'radio-button-on-outline', text: 'Only after you tap record' },
        { icon: 'lock-closed-outline', text: 'Saved on this phone first' },
        { icon: 'trash-outline', text: 'Delete any recording anytime' },
      ]}
    />
  );
}

function SummaryRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Ionicons name={icon} size={18} color={UI.inkSoft} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Tips() {
  return (
    <View style={styles.tipsCard}>
      <Text style={styles.tipsTitle}>FOR CLEARER AUDIO</Text>
      {[
        'Sit near the front, close to the lecturer.',
        'Place your phone face-up on the desk.',
        'Keep Zuri open while the lecture runs.',
      ].map((tip) => (
        <View key={tip} style={styles.tipRow}>
          <View style={styles.tipDot} />
          <Text style={styles.tipText}>{tip}</Text>
        </View>
      ))}
    </View>
  );
}

function PulseDot({ paused }: { paused: boolean }) {
  const s = useSharedValue(1);
  useEffect(() => {
    s.value = paused ? withTiming(1) : withRepeat(withTiming(1.35, { duration: 800, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [paused]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <Animated.View style={[styles.pulseDot, paused && styles.pulseDotPaused, style]} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LexiSpacing.containerPaddingH,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26, 28, 22, 0.08)',
  },
  closeBtn: {
    padding: 6,
    marginLeft: -6,
  },
  topBarTitle: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 14,
    color: LexiColors.primary,
    letterSpacing: 0.5,
  },
  spacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: LexiSpacing.containerPaddingH,
    paddingTop: 24,
    paddingBottom: 40,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  label: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: UI.muted,
    marginBottom: 10,
  },
  courseChips: {
    gap: 8,
    paddingBottom: 14,
  },
  courseChip: {
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: UI.card,
  },
  courseChipOn: {
    backgroundColor: UI.ink,
    borderColor: UI.ink,
  },
  courseChipText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: UI.ink,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  courseHeadline: {
    fontFamily: LexiFonts.headlineLgMobile,
    fontSize: 22,
    lineHeight: 28,
    color: LexiColors.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ba1a1a',
  },
  pulseDotPaused: {
    backgroundColor: LexiColors.outline,
  },
  statusBadgeText: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 14,
    color: LexiColors.onSurfaceVariant,
  },
  hubCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 22, 0.1)',
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  timerDisplay: {
    fontFamily: LexiFonts.headlineLgMobile,
    fontSize: 44,
    lineHeight: 50,
    color: LexiColors.primary,
    letterSpacing: -1,
    marginBottom: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  recordBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: 'rgba(186, 26, 26, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  recordDot: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ba1a1a',
  },
  hint: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 14,
    color: UI.muted,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 60,
    marginBottom: 28,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#272e0a',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pauseBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f5f3ee',
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 22, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 56,
    backgroundColor: LexiColors.primaryContainer,
    paddingHorizontal: 30,
    borderRadius: 28,
  },
  stopBtnText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 15,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  pausedNote: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: UI.amberSoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  pausedNoteText: {
    flex: 1,
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
    color: '#6b4511',
  },
  tipsCard: {
    backgroundColor: '#f5f3ee',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 22, 0.08)',
    gap: 8,
  },
  tipsTitle: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: LexiColors.onSurfaceVariant,
    marginBottom: 4,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  tipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: UI.amber,
  },
  tipText: {
    flex: 1,
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 14,
    color: UI.inkSoft,
  },
  centerBlock: {
    alignItems: 'center',
    paddingTop: 12,
  },
  bigIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  blockTitle: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 24,
    color: UI.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  blockText: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
    color: UI.inkSoft,
    textAlign: 'center',
    marginBottom: 20,
  },
  summaryCard: {
    alignSelf: 'stretch',
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  summaryLabel: {
    fontFamily: LexiFonts.bodyMedium,
    fontSize: 14,
    color: UI.muted,
    width: 64,
  },
  summaryValue: {
    flex: 1,
    fontFamily: LexiFonts.bodyMedium,
    fontSize: 14,
    color: UI.ink,
    textAlign: 'right',
  },
  primaryWide: {
    alignSelf: 'stretch',
    height: 54,
    borderRadius: 27,
    backgroundColor: UI.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  primaryWideText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 15,
    color: '#fff',
  },
  secondaryWide: {
    alignSelf: 'stretch',
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryWideText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 15,
    color: UI.error,
  },
});

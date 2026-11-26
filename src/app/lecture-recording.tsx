import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar, ActivityIndicator, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setRecordingBusy } from '@/services/recording/busy';
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
import { ZuriColors, ZuriFonts, ZuriSpacing } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useZuriFonts } from '@/hooks/use-zuri-fonts';
import { useAcademic, type CourseItem } from '@/context/academic-context';
import { useSession } from '@/context/session-context';
import { useLecturer } from '@/context/lecturer-context';
import { teachingTimetable } from '@/utils/lecturer';
import { useLectures } from '@/context/lectures-context';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { PermissionState } from '@/components/states/state-view';
import { formatClock, formatDuration, upcomingClasses } from '@/utils/time';
import { liveTranscriptionAvailable, useLiveTranscript } from '@/hooks/use-live-transcript';

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

type Phase = 'checking' | 'needs-permission' | 'denied' | 'ready' | 'recording' | 'paused' | 'completed' | 'saving' | 'error';

export default function LectureRecordingScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  // quick=1: the Record button. Starts at once; the course can be chosen now or later.
  const params = useLocalSearchParams<{ courseId?: string; courseCode?: string; courseTitle?: string; quick?: string }>();
  const quick = params.quick === '1';
  const [fontsLoaded] = useZuriFonts();
  const { state } = useAcademic();
  const { role } = useSession();
  const lecturer = useLecturer();
  const isLecturer = role === 'lecturer';
  const courseList: CourseItem[] = isLecturer
    ? lecturer.courses.map((c) => ({ id: c.id, code: c.code, title: c.title, units: 0 }))
    : state.courses;
  const timetable = isLecturer ? teachingTimetable(lecturer.courses) : state.timetable;
  const { saveRecording } = useLectures();

  const { state: academicState } = useAcademic();
  const recordingOptions = useMemo<RecordingOptions>(
    () =>
      academicState.preferences.recordingQuality === 'high'
        ? { ...LECTURE_RECORDING, sampleRate: 44100, bitRate: 128000, web: { mimeType: 'audio/webm', bitsPerSecond: 128000 } }
        : LECTURE_RECORDING,
    []
  );
  const recorder = useAudioRecorder(recordingOptions);
  const recState = useAudioRecorderState(recorder, 200);
  // Live transcription with the phone's speech recognition when available (the transcript
  // appears as the lecturer speaks); otherwise the plain audio recorder above.
  const [live] = useState(() => liveTranscriptionAvailable());

  const [phase, setPhase] = useState<Phase>('checking');
  const [errorMsg, setErrorMsg] = useState('');
  const [levels, setLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(0.08));
  const [finalSeconds, setFinalSeconds] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);
  const allowLeave = useRef(false);
  const pendingLeave = useRef<any>(null);

  // ── Course selection ──
  const defaultCourse = useMemo<CourseItem | undefined>(() => {
    const byParam =
      courseList.find((c) => c.id === params.courseId) ??
      courseList.find((c) => c.code.toLowerCase() === params.courseCode?.toLowerCase());
    if (byParam) return byParam;
    const next = upcomingClasses(timetable)[0];
    if (quick) {
      // Only a class that's on now (or starts within 15 minutes); otherwise sort it later.
      const soon = next && (next.inProgress || next.start.getTime() - Date.now() < 15 * 60 * 1000);
      return soon ? courseList.find((c) => c.id === next.slot.courseId) : undefined;
    }
    return courseList.find((c) => c.id === next?.slot.courseId) ?? courseList[0];
  }, []);
  const [course, setCourse] = useState<CourseItem | undefined>(defaultCourse);
  const courseCode = course?.code ?? params.courseCode ?? (quick ? 'Unsorted' : 'Lecture');
  const courseTitle = course?.title ?? params.courseTitle ?? (quick ? 'Quick recording' : 'Untitled course');
  const vocabulary = useMemo(() => [courseCode, ...courseTitle.split(/[\s&,]+/).filter((w) => w.length > 3)], [courseCode, courseTitle]);
  const lt = useLiveTranscript({ contextualStrings: vocabulary });
  const [liveSeconds, setLiveSeconds] = useState(0);
  const transcriptScroll = useRef<ScrollViewInstance>(null);

  // Live mode: tick the clock and the waveform from the recognizer's volume.
  useEffect(() => {
    if (!live || phase !== 'recording') return;
    const t = setInterval(() => {
      setLiveSeconds(lt.elapsed());
      setLevels((prev) => [...prev.slice(1), Math.max(0.06, lt.level || 0.06)]);
    }, 250);
    return () => clearInterval(t);
  }, [live, phase, lt]);

  // A problem the recognizer can't recover from (e.g. permission refused).
  useEffect(() => {
    if (live && lt.fatal && (phase === 'recording' || phase === 'paused')) {
      setErrorMsg(lt.fatal);
      setPhase('error');
    }
  }, [live, lt.fatal, phase]);

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
    if (phase !== 'recording' || live) return;
    const db = recState.metering;
    // dB is roughly -60 (silence) … 0 (loud). Fall back to gentle motion if unavailable.
    const level =
      typeof db === 'number' ? Math.max(0.06, Math.min(1, (db + 60) / 60)) : 0.25 + Math.random() * 0.5;
    setLevels((prev) => [...prev.slice(1), level]);
  }, [recState.durationMillis]);

  // ── Block accidental exits while recording ──
  const isActive = phase === 'recording' || phase === 'paused' || phase === 'completed';
  // App updates wait until the recording is saved or discarded.
  useEffect(() => {
    setRecordingBusy(isActive || phase === 'saving');
  }, [isActive, phase]);
  useEffect(() => () => setRecordingBusy(false), []);
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
    if (live) {
      try {
        const ok = await lt.start();
        if (!ok) {
          setErrorMsg('Zuri needs the microphone and speech recognition to transcribe. Allow them in Settings and try again.');
          setPhase('error');
          return;
        }
        setLiveSeconds(0);
        setPhase('recording');
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'Live transcription could not be started.');
        setPhase('error');
      }
      return;
    }
    try {
      try {
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, allowsBackgroundRecording: true });
      } catch (modeError) {
        // Background recording isn't allowed in Expo Go or without the background-audio capability.
        console.warn('[recording] background audio mode refused, recording in the foreground only', modeError);
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      }
      try {
        await recorder.prepareToRecordAsync();
      } catch (prepareError) {
        // Some iPhones refuse the 16 kHz / 64 kbps voice format ("Failed to prepare recorder").
        // Retry once with Expo's standard high-quality preset, which iOS always accepts.
        console.warn('[recording] voice format refused, retrying with HIGH_QUALITY', prepareError);
        await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
      }
      recorder.record();
      setPhase('recording');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'The microphone could not be started.');
      setPhase('error');
    }
  };

  // Quick record: start as soon as the microphone is allowed.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!quick || phase !== 'ready' || autoStarted.current) return;
    autoStarted.current = true;
    start();
  }, [quick, phase]);

  const togglePause = () => {
    if (live) {
      if (phase === 'recording') {
        lt.pause();
        setPhase('paused');
      } else if (phase === 'paused') {
        lt.resume();
        setPhase('recording');
      }
      return;
    }
    if (phase === 'recording') {
      recorder.pause();
      setPhase('paused');
    } else if (phase === 'paused') {
      recorder.record();
      setPhase('recording');
    }
  };

  const stop = async () => {
    if (live) {
      await lt.stop();
      setFinalSeconds(lt.elapsed());
      setPhase('completed');
      return;
    }
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
    if (live) {
      await lt.stop();
      leave();
      return;
    }
    if (phase === 'recording' || phase === 'paused') {
      await recorder.stop().catch(() => {});
    }
    leave();
  };

  /**
   * Save & process. Shows "Saving your lecture" first, waits until the audio is safely
   * moved into permanent storage, and only then opens the lecture (which plays and uploads
   * that file). The leave-guard is off while saving ('saving' isn't an active phase), so
   * switching to the lecture page can't be blocked half-way.
   */
  const save = async () => {
    if (phase === 'saving') return;
    if (!live && !recordingUri) return;
    setSaveError('');
    setPhase('saving');
    allowLeave.current = true;
    // Let the saving screen draw before the file work starts.
    await new Promise((r) => setTimeout(r, 60));
    try {
      const segments = live && lt.interim ? [...lt.segments, { start: finalSeconds, end: finalSeconds, text: lt.interim }] : lt.segments;
      const id = await saveRecording(
        live
          ? {
              courseId: course?.id,
              courseCode,
              courseTitle,
              durationSeconds: finalSeconds,
              recordingUri: lt.audioUris[0],
              extraAudioUris: lt.audioUris.slice(1),
              liveTranscript: segments,
            }
          : { courseId: course?.id, courseCode, courseTitle, durationSeconds: finalSeconds, recordingUri: recordingUri! }
      );
      setSavedId(id);
    } catch (e) {
      console.warn('[recording] save failed', e);
      allowLeave.current = false;
      setSaveError(
        `Your recording is still here, but it couldn’t be saved${e instanceof Error && e.message ? ` (${e.message})` : ''}. Try again.`
      );
      setPhase('completed');
    }
  };

  // Saved: open the lecture, where its progress shows.
  useEffect(() => {
    if (savedId) router.replace(`/lecture/${savedId}` as Href);
  }, [savedId]);

  if (!fontsLoaded) return <View style={styles.container} />;

  // Quick record: pick the course while recording or before saving, or leave it for later.
  const quickCoursePicker =
    quick && courseList.length ? (
      <View style={styles.quickPicker}>
        <Text style={styles.label}>WHICH CLASS IS THIS? (OPTIONAL)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.courseChips}>
          {[undefined, ...courseList].map((c) => {
            const on = c?.id === course?.id;
            return (
              <Pressable
                key={c?.id ?? 'later'}
                onPress={() => setCourse(c)}
                style={[styles.courseChip, on && styles.courseChipOn]}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={c ? c.code : 'Choose later'}
              >
                <Text style={[styles.courseChipText, on && { color: '#fff' }]}>{c ? c.code : 'Later'}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    ) : null;

  const close = () => {
    if (phase === 'saving') return; // nearly done: the lecture opens by itself
    if (isActive) setConfirmLeave(true);
    else leave();
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topBar}>
        <Pressable style={styles.closeBtn} onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="chevron-down" size={26} color={ZuriColors.primary} />
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
            {quickCoursePicker}

            <View style={styles.hubCard}>
              <Text style={styles.timerDisplay}>{formatClock(live ? liveSeconds : recState.durationMillis / 1000)}</Text>

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
                  <Ionicons name={phase === 'paused' ? 'play' : 'pause'} size={26} color={ZuriColors.primary} />
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

            {live && (
              <View style={styles.liveCard}>
                <View style={styles.liveHeader}>
                  <Text style={styles.liveLabel}>LIVE TRANSCRIPT</Text>
                  <Text style={styles.liveCount}>{lt.segments.length ? `${lt.segments.reduce((n, x) => n + x.text.split(/\s+/).length, 0)} words` : ''}</Text>
                </View>
                <ScrollView
                  ref={transcriptScroll}
                  style={styles.liveScroll}
                  nestedScrollEnabled
                  onContentSizeChange={() => transcriptScroll.current?.scrollToEnd({ animated: true })}
                >
                  {lt.segments.length === 0 && !lt.interim ? (
                    <Text style={styles.liveEmpty}>
                      {phase === 'paused' ? 'Paused.' : 'Listening… words appear here as the lecturer speaks.'}
                    </Text>
                  ) : (
                    <Text style={styles.liveText}>
                      {lt.segments.slice(-40).map((x) => x.text).join(' ')}
                      {lt.interim ? <Text style={styles.liveInterim}> {lt.interim}</Text> : null}
                    </Text>
                  )}
                </ScrollView>
                {!!lt.warning && <Text style={styles.liveWarning}>{lt.warning}</Text>}
              </View>
            )}

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

        {phase === 'saving' && (
          <View style={styles.centerBlock} accessibilityLiveRegion="polite">
            <ActivityIndicator size="large" color={ZuriColors.primary} />
            <Text style={styles.blockTitle}>Saving your lecture…</Text>
            <Text style={styles.blockText}>Keep Zuri open for a moment. Next you’ll see the transcript and notes being made.</Text>
          </View>
        )}

        {phase === 'completed' && (
          <View style={styles.centerBlock}>
            <View style={[styles.bigIcon, { backgroundColor: UI.successSoft }]}>
              <Ionicons name="checkmark" size={32} color={UI.success} />
            </View>
            <Text style={styles.blockTitle}>Recording complete</Text>
            <Text style={styles.blockText}>
              {live
                ? `${formatDuration(finalSeconds)} transcribed${course || !quick ? ` for ${courseCode}` : ''} (${lt.segments.reduce((n, x) => n + x.text.split(/\s+/).length, 0)} words). Save it to get a summary, key points and questions.`
                : `${formatDuration(finalSeconds)} recorded${course || !quick ? ` for ${courseCode}` : ''}. Save it to get a transcript, summary, notes and questions.`}
            </Text>

            {quickCoursePicker}
            <View style={styles.summaryCard}>
              <SummaryRow
                icon="school-outline"
                label="Course"
                value={course || !quick ? `${courseCode} · ${courseTitle}` : 'Not chosen yet. Choose it later from the lecture.'}
              />
              <SummaryRow icon="time-outline" label="Length" value={formatClock(finalSeconds)} />
              <SummaryRow icon="phone-portrait-outline" label="Saved to" value="This phone" />
            </View>

            {!!saveError && <Text style={[styles.blockText, { color: UI.error }]}>{saveError}</Text>}
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
  quickPicker: { alignSelf: 'stretch', marginBottom: 12 },
  liveCard: { marginTop: 16, backgroundColor: UI.card, borderRadius: 16, borderWidth: 1, borderColor: UI.border, padding: 16 },
  liveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  liveLabel: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, letterSpacing: 1.2, color: UI.muted },
  liveCount: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted },
  liveScroll: { maxHeight: 220 },
  liveEmpty: { fontFamily: ZuriFonts.bodyRegular, fontSize: 14, lineHeight: 21, color: UI.muted },
  liveText: { fontFamily: ZuriFonts.bodyRegular, fontSize: 15, lineHeight: 23, color: UI.ink },
  liveInterim: { color: UI.muted },
  liveWarning: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.amber, marginTop: 8 },
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ZuriSpacing.containerPaddingH,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26, 28, 22, 0.08)',
  },
  closeBtn: {
    padding: 6,
    marginLeft: -6,
  },
  topBarTitle: {
    fontFamily: ZuriFonts.labelSmBold,
    fontSize: 14,
    color: ZuriColors.primary,
    letterSpacing: 0.5,
  },
  spacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: ZuriSpacing.containerPaddingH,
    paddingTop: 24,
    paddingBottom: 40,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  label: {
    fontFamily: ZuriFonts.labelSmBold,
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
    fontFamily: ZuriFonts.labelSmBold,
    fontSize: 13,
    color: UI.ink,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  courseHeadline: {
    fontFamily: ZuriFonts.headlineLgMobile,
    fontSize: 22,
    lineHeight: 28,
    color: ZuriColors.primary,
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
    backgroundColor: ZuriColors.outline,
  },
  statusBadgeText: {
    fontFamily: ZuriFonts.bodyMd,
    fontSize: 14,
    color: ZuriColors.onSurfaceVariant,
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
    fontFamily: ZuriFonts.headlineLgMobile,
    fontSize: 44,
    lineHeight: 50,
    color: ZuriColors.primary,
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
    fontFamily: ZuriFonts.bodyRegular,
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
    backgroundColor: ZuriColors.primaryContainer,
    paddingHorizontal: 30,
    borderRadius: 28,
  },
  stopBtnText: {
    fontFamily: ZuriFonts.labelSmBold,
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
    fontFamily: ZuriFonts.bodyRegular,
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
    fontFamily: ZuriFonts.labelSmBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: ZuriColors.onSurfaceVariant,
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
    fontFamily: ZuriFonts.bodyRegular,
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
    fontFamily: ZuriFonts.headlineMd,
    fontSize: 24,
    color: UI.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  blockText: {
    fontFamily: ZuriFonts.bodyRegular,
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
    fontFamily: ZuriFonts.bodyMedium,
    fontSize: 14,
    color: UI.muted,
    width: 64,
  },
  summaryValue: {
    flex: 1,
    fontFamily: ZuriFonts.bodyMedium,
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
    fontFamily: ZuriFonts.labelSmBold,
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
    fontFamily: ZuriFonts.labelSmBold,
    fontSize: 15,
    color: UI.error,
  },
});

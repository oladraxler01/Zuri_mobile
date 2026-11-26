import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import type { Lecture } from '@/types/lecture';
import { formatDuration } from '@/utils/time';
import { isBackendConfigured } from '@/services/lecture-api';

type StepState = 'done' | 'active' | 'pending';

function Spinner() {
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.linear }), -1, false);
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value * 360}deg` }] }));
  return (
    <Animated.View style={style}>
      <Ionicons name="reload" size={14} color={UI.ink} />
    </Animated.View>
  );
}

function Step({
  state,
  title,
  desc,
  progress,
  last,
}: {
  state: StepState;
  title: string;
  desc: string;
  progress?: number;
  last?: boolean;
}) {
  return (
    <View style={[styles.step, state === 'pending' && { opacity: 0.5 }]}>
      <View style={styles.stepRail}>
        {state === 'done' ? (
          <View style={styles.iconDone}>
            <Ionicons name="checkmark" size={14} color={UI.success} />
          </View>
        ) : state === 'active' ? (
          <View style={styles.iconActive}>
            <Spinner />
          </View>
        ) : (
          <View style={styles.iconPending} />
        )}
        {!last && <View style={[styles.rail, state === 'done' && styles.railDone]} />}
      </View>
      <View style={styles.stepBody}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDesc}>{desc}</Text>
        {state === 'active' && progress !== undefined && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(Number(progress) * 100)}%` }]} />
          </View>
        )}
      </View>
    </View>
  );
}

/** Uploading + processing screen for a lecture. */
export function ProcessingView({ lecture }: { lecture: Lecture }) {
  const uploading = lecture.status === 'uploading';
  const p = lecture.progress;
  // When the real backend is used we don't get processing progress.
  const transcribing = !uploading && (p === undefined || p < 0.5);

  const words = lecture.liveTranscript?.reduce((n, s) => n + s.text.split(/\s+/).filter(Boolean).length, 0) ?? 0;
  // Transcribed live on the phone: the transcript is already done; only the notes are being made.
  const steps: { state: StepState; title: string; desc: string; progress?: number }[] = lecture.liveTranscript ? [
    {
      state: 'done',
      title: 'Saved on your phone',
      desc: `${formatDuration(lecture.durationSeconds)} recorded, kept safely even if you go offline.`,
    },
    {
      state: 'done',
      title: `Transcript ready · ${words.toLocaleString()} words`,
      desc: 'Written live while you recorded. You can read it as soon as the notes are done.',
    },
    {
      state: uploading ? 'active' : 'done',
      title: uploading ? 'Sending the transcript to Zuri' : 'Sent to Zuri',
      desc: 'So Zuri’s AI can make your notes.',
    },
    {
      state: uploading ? 'pending' : 'active',
      title: 'Preparing your study notes',
      desc: 'Summary, key concepts, questions and flashcards.',
    },
  ] : [
    {
      state: 'done',
      title: 'Saved on your phone',
      desc: `${formatDuration(lecture.durationSeconds)} of audio, kept safely even if you go offline.`,
    },
    {
      state: uploading ? 'active' : 'done',
      title: uploading ? `Uploading recording · ${Math.round((p ?? 0) * 100)}%` : 'Uploaded',
      desc: 'Sending the audio securely for transcription.',
      progress: uploading ? p ?? 0 : undefined,
    },
    {
      state: uploading ? 'pending' : transcribing ? 'active' : 'done',
      title: 'Transcribing the lecture',
      desc: 'Turning speech into a timestamped transcript.',
    },
    {
      state: uploading || transcribing ? 'pending' : 'active',
      title: 'Preparing your study notes',
      desc: 'Summary, key concepts, questions and flashcards.',
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.eyebrow}>{uploading ? 'UPLOADING' : 'PROCESSING'}</Text>
      <Text style={styles.heading}>Working on your {lecture.courseCode} lecture</Text>
      <Text style={styles.sub}>
        This usually takes under a minute. You can leave this screen; we'll keep going while the app is open.
      </Text>

      <View style={styles.card}>
        {steps.map((s, i) => (
          <Step key={s.title} {...s} last={i === steps.length - 1} />
        ))}
      </View>

      {!isBackendConfigured && (
        <Text style={styles.note}>
          Lecture processing is switched off in this build, so this recording is only saved on your phone.
        </Text>
      )}
    </ScrollView>
  );
}

/** Shown when processing failed. */
export function FailedView({
  lecture,
  onRetry,
  onDelete,
}: {
  lecture: Lecture;
  onRetry: () => void;
  onDelete: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={[styles.bigIcon, { backgroundColor: UI.errorSoft }]}>
        <Ionicons name="cloud-offline-outline" size={30} color={UI.error} />
      </View>
      <Text style={[styles.heading, { textAlign: 'center' }]}>We couldn't finish this lecture</Text>
      <Text style={[styles.sub, { textAlign: 'center' }]}>
        {lecture.error ?? 'Something went wrong.'} Your recording is still saved on this phone.
      </Text>
      <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]} onPress={onRetry}>
        <Ionicons name="refresh" size={18} color="#fff" />
        <Text style={styles.primaryText}>Try again</Text>
      </Pressable>
      <Pressable style={({ pressed }) => [styles.secondary, pressed && styles.pressed]} onPress={onDelete}>
        <Text style={styles.secondaryText}>Delete recording</Text>
      </Pressable>
    </ScrollView>
  );
}

/** "Lecture processing complete" screen, shown once per lecture. */
export function CompleteView({ lecture, onOpen }: { lecture: Lecture; onOpen: () => void }) {
  const pop = useSharedValue(0);
  const rise = useSharedValue(0);
  useEffect(() => {
    pop.value = withSpring(1, { damping: 10, stiffness: 160 });
    rise.value = withDelay(250, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, []);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const riseStyle = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [{ translateY: (1 - rise.value) * 24 }],
  }));

  const a = lecture.analysis;
  const stats = [
    { icon: 'document-text-outline' as const, value: formatDuration(lecture.durationSeconds), label: 'transcribed' },
    { icon: 'bulb-outline' as const, value: String(a?.concepts.length ?? 0), label: 'key concepts' },
    { icon: 'help-circle-outline' as const, value: String(a?.questions.length ?? 0), label: 'questions' },
    { icon: 'albums-outline' as const, value: String(a?.flashcards.length ?? 0), label: 'flashcards' },
  ];

  return (
    <ScrollView contentContainerStyle={[styles.wrap, { alignItems: 'center' }]}>
      <Animated.View style={[styles.bigIcon, { backgroundColor: UI.successSoft }, popStyle]}>
        <Ionicons name="checkmark" size={34} color={UI.success} />
      </Animated.View>
      <Animated.View style={[{ width: '100%', alignItems: 'center' }, riseStyle]}>
        <Text style={styles.eyebrow}>LECTURE READY</Text>
        <Text style={[styles.heading, { textAlign: 'center' }]}>{a?.title ?? `${lecture.courseCode} lecture`}</Text>
        <Text style={[styles.sub, { textAlign: 'center' }]}>
          {lecture.courseCode} · {lecture.courseTitle}
        </Text>
        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.stat}>
              <Ionicons name={s.icon} size={18} color={UI.amber} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
        <Pressable style={({ pressed }) => [styles.primary, { width: '100%' }, pressed && styles.pressed]} onPress={onOpen}>
          <Text style={styles.primaryText}>Open lecture</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 24,
    paddingBottom: 48,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  eyebrow: {
    fontFamily: ZuriFonts.labelSmBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: UI.amber,
    marginBottom: 8,
  },
  heading: {
    fontFamily: ZuriFonts.headlineMd,
    fontSize: 26,
    lineHeight: 32,
    color: UI.ink,
    marginBottom: 8,
  },
  sub: {
    fontFamily: ZuriFonts.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
    color: UI.inkSoft,
    marginBottom: 24,
  },
  card: {
    backgroundColor: UI.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 18,
  },
  step: {
    flexDirection: 'row',
    gap: 14,
  },
  stepRail: {
    alignItems: 'center',
    width: 26,
  },
  rail: {
    flex: 1,
    width: 2,
    backgroundColor: UI.borderSoft,
    marginVertical: 4,
    minHeight: 18,
  },
  railDone: {
    backgroundColor: UI.successSoft,
  },
  iconDone: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: UI.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: UI.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPending: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: UI.muted,
  },
  stepBody: {
    flex: 1,
    paddingBottom: 18,
  },
  stepTitle: {
    fontFamily: ZuriFonts.bodyMedium,
    fontSize: 15,
    color: UI.ink,
    marginTop: 3,
  },
  stepDesc: {
    fontFamily: ZuriFonts.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
    color: UI.muted,
    marginTop: 2,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: UI.cardMuted,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: UI.amber,
  },
  note: {
    fontFamily: ZuriFonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
    color: UI.muted,
    textAlign: 'center',
    marginTop: 18,
  },
  bigIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
    marginTop: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    marginBottom: 24,
  },
  stat: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 16,
    gap: 4,
  },
  statValue: {
    fontFamily: ZuriFonts.headlineMd,
    fontSize: 24,
    color: UI.ink,
    marginTop: 4,
  },
  statLabel: {
    fontFamily: ZuriFonts.bodyRegular,
    fontSize: 13,
    color: UI.muted,
  },
  primary: {
    height: 54,
    borderRadius: 27,
    backgroundColor: UI.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  primaryText: {
    fontFamily: ZuriFonts.labelSmBold,
    fontSize: 15,
    color: '#fff',
  },
  secondary: {
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontFamily: ZuriFonts.labelSmBold,
    fontSize: 15,
    color: UI.error,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
});

/** Saved on the phone but offline: uploads automatically when back online. */
export function WaitingView({ lecture }: { lecture: Lecture }) {
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={[styles.bigIcon, { backgroundColor: UI.cardMuted }]}>
        <Ionicons name="cloud-offline-outline" size={30} color={UI.inkSoft} />
      </View>
      <Text style={[styles.heading, { textAlign: 'center' }]}>Waiting for internet</Text>
      <Text style={[styles.sub, { textAlign: 'center' }]}>
        Your {formatDuration(lecture.durationSeconds)} {lecture.courseCode} recording is safe on this phone. It will upload
        and process automatically as soon as you’re back online.
      </Text>
    </ScrollView>
  );
}

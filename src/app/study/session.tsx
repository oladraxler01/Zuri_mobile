import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { useLectures } from '@/context/lectures-context';
import { useMaterials } from '@/context/materials-context';
import { useProgress } from '@/context/progress-context';
import { useAcademic } from '@/context/academic-context';
import { buildSession, type SessionItem, type SessionMode } from '@/utils/study-session';
import { courseMastery, LEVEL_LABEL, type MasteryLevel } from '@/utils/mastery';
import { searchTranscript } from '@/utils/transcript-search';
import { formatClock } from '@/utils/time';
import { StateView } from '@/components/states/state-view';

type Answer = { item: SessionItem; correct: boolean };

/** Personalised study session: questions + flashcards from your weakest topics, then a summary. */
export default function StudySessionScreen() {
  const params = useLocalSearchParams<{ courseId?: string; concept?: string; mode?: string }>();
  const { lectures } = useLectures();
  const { materials } = useMaterials();
  const progress = useProgress();
  const { state: academic } = useAcademic();

  const [items] = useState<SessionItem[]>(() =>
    buildSession(
      {
        courseId: params.courseId || undefined,
        concept: params.concept || undefined,
        mode: (params.mode as SessionMode) || 'mixed',
        size: academic.preferences.sessionSize || 8,
      },
      { lectures, materials, events: progress.events }
    )
  );
  // Mastery before the session, to show what moved.
  const before = useRef<Map<string, MasteryLevel>>(new Map());
  useEffect(() => {
    const ids = Array.from(new Set(items.map((i) => i.source.courseId).filter(Boolean))) as string[];
    ids.forEach((cid) =>
      courseMastery(cid, lectures, materials, progress.events).forEach((c) => before.current.set(c.concept.toLowerCase(), c.level))
    );
  }, []);

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [explain, setExplain] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [done, setDone] = useState(false);
  const startedAt = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [done]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/study' as Href));

  if (!items.length) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}>
        <StateView
          icon="book-outline"
          title="Nothing to practise yet"
          message="Study sessions use questions and flashcards from your processed lectures and materials. Record a lecture or upload notes first."
          primary={{ label: 'Record a lecture', icon: 'mic', onPress: () => router.replace('/lecture-recording' as Href) }}
          secondary={{ label: 'Go back', onPress: goBack }}
        />
      </SafeAreaView>
    );
  }

  const item = items[idx];
  const last = idx === items.length - 1;

  const record = (correct: boolean) => {
    progress.log({
      type: item.kind === 'question' ? 'quiz-answer' : 'flashcard',
      courseId: item.source.courseId,
      courseCode: item.source.courseCode,
      concept: item.concept,
      correct,
      sourceId: item.source.id,
      sourceKind: item.source.kind,
    });
    setAnswers((a) => [...a, { item, correct }]);
  };

  const finish = () => {
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    progress.log({
      type: 'study-session',
      courseId: params.courseId || undefined,
      courseCode: params.courseId ? item.source.courseCode : undefined,
      minutes,
      label: params.concept ? `Review: ${params.concept}` : params.mode === 'weak' ? 'Weak-topic review' : `${items.length}-item session`,
    });
    setDone(true);
  };

  const next = () => {
    setSelected(null);
    setChecked(false);
    setFlipped(false);
    setExplain(false);
    if (last) finish();
    else setIdx(idx + 1);
  };

  if (done) return <Completion answers={answers} seconds={elapsed} before={before.current} params={params} />;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <Pressable onPress={goBack} hitSlop={10} accessibilityLabel="End session">
          <Ionicons name="close" size={24} color={UI.ink} />
        </Pressable>
        <Text style={styles.timer}>{formatClock(elapsed)}</Text>
        <Text style={styles.count}>
          {idx + 1}/{items.length}
        </Text>
      </View>
      <View style={styles.progress}>
        <View style={[styles.progressFill, { width: `${((idx + (checked || flipped ? 1 : 0)) / items.length) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.eyebrow}>
          {item.source.courseCode ? `${item.source.courseCode} · ` : ''}
          {item.concept ?? (item.kind === 'question' ? 'QUESTION' : 'FLASHCARD')}
        </Text>

        {item.kind === 'question' ? (
          <>
            <Text style={styles.question}>{item.q.question}</Text>
            <View style={{ gap: 10 }}>
              {item.q.options.map((o, i) => {
                const isSel = selected === i;
                const right = checked && i === item.q.correctIndex;
                const wrong = checked && isSel && i !== item.q.correctIndex;
                return (
                  <Pressable
                    key={o}
                    disabled={checked}
                    onPress={() => setSelected(i)}
                    style={[styles.option, isSel && styles.optionSel, right && styles.optionRight, wrong && styles.optionWrong]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSel }}
                  >
                    <Text style={styles.optionText}>{o}</Text>
                    {right && <Ionicons name="checkmark-circle" size={20} color={UI.success} />}
                    {wrong && <Ionicons name="close-circle" size={20} color={UI.error} />}
                  </Pressable>
                );
              })}
            </View>
            {checked && (
              <View style={[styles.feedback, { backgroundColor: selected === item.q.correctIndex ? '#eef5e0' : '#fff1ef' }]}>
                <Text style={[styles.feedbackTitle, { color: selected === item.q.correctIndex ? UI.success : UI.error }]}>
                  {selected === item.q.correctIndex ? 'Correct' : 'Not quite'}
                </Text>
                <Text style={styles.feedbackText}>{item.q.explanation}</Text>
                {selected !== item.q.correctIndex && !explain && (
                  <Pressable onPress={() => setExplain(true)} style={styles.explainBtn}>
                    <Ionicons name="school-outline" size={16} color={UI.ink} />
                    <Text style={styles.explainText}>Explain it</Text>
                  </Pressable>
                )}
                {explain && <Tutor item={item} lectures={lectures} />}
              </View>
            )}
          </>
        ) : (
          <>
            <Pressable style={[styles.card, flipped && styles.cardFlipped]} onPress={() => setFlipped(true)} accessibilityRole="button" accessibilityHint="Tap to reveal the answer">
              <Text style={[styles.cardTag, flipped && { color: '#e9c349' }]}>{flipped ? 'ANSWER' : 'TAP TO REVEAL'}</Text>
              <Text style={[styles.cardText, flipped && { color: '#fff' }]}>{flipped ? item.card.answer : item.card.question}</Text>
            </Pressable>
            {flipped && <Text style={styles.rateHint}>How did you do?</Text>}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {item.kind === 'question' ? (
          <Pressable
            style={[styles.primary, selected === null && { opacity: 0.4 }]}
            disabled={selected === null}
            onPress={() => {
              if (!checked) {
                setChecked(true);
                record(selected === item.q.correctIndex);
              } else next();
            }}
          >
            <Text style={styles.primaryText}>{!checked ? 'Check' : last ? 'Finish' : 'Next'}</Text>
          </Pressable>
        ) : flipped ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              style={[styles.secondary, { flex: 1 }]}
              onPress={() => {
                record(false);
                next();
              }}
            >
              <Text style={styles.secondaryText}>Still learning</Text>
            </Pressable>
            <Pressable
              style={[styles.primary, { flex: 1 }]}
              onPress={() => {
                record(true);
                next();
              }}
            >
              <Text style={styles.primaryText}>Got it</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.primary} onPress={() => setFlipped(true)}>
            <Text style={styles.primaryText}>Show answer</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

/** Step-by-step help after a wrong answer: the explanation + where it was taught in the lecture. */
function Tutor({ item, lectures }: { item: Extract<SessionItem, { kind: 'question' }>; lectures: ReturnType<typeof useLectures>['lectures'] }) {
  const lecture = item.source.kind === 'lecture' ? lectures.find((l) => l.id === item.source.id) : undefined;
  const moments = lecture?.analysis ? searchTranscript(lecture.analysis.transcript, item.concept ?? item.q.question, 2) : [];
  const concept = lecture?.analysis?.concepts.find((c) => c.title === item.concept);
  return (
    <View style={styles.tutor}>
      <Text style={styles.tutorStep}>1. The right answer is “{item.q.options[item.q.correctIndex]}”.</Text>
      {concept && (
        <Text style={styles.tutorStep}>
          2. {concept.title}: {concept.summary}
        </Text>
      )}
      {moments.map((m) => (
        <Pressable
          key={m.start}
          style={styles.moment}
          onPress={() => router.push({ pathname: '/lecture/[id]', params: { id: lecture!.id, tab: 'transcript', t: String(m.start) } } as any)}
        >
          <Ionicons name="play-circle-outline" size={16} color={UI.amber} />
          <Text style={styles.momentText} numberOfLines={3}>
            {formatClock(m.start)} “{m.text}”
          </Text>
        </Pressable>
      ))}
      <Pressable onPress={() => router.push({ pathname: '/ask', params: { courseId: item.source.courseId ?? '', q: item.concept ?? item.q.question } } as any)}>
        <Text style={styles.askMore}>Ask more about this →</Text>
      </Pressable>
    </View>
  );
}

function Completion({
  answers,
  seconds,
  before,
  params,
}: {
  answers: Answer[];
  seconds: number;
  before: Map<string, MasteryLevel>;
  params: { courseId?: string; concept?: string; mode?: string };
}) {
  const { lectures } = useLectures();
  const { materials } = useMaterials();
  const { events } = useProgress();
  const qs = answers.filter((a) => a.item.kind === 'question');
  const cards = answers.filter((a) => a.item.kind === 'card');
  const right = qs.filter((a) => a.correct).length;
  const known = cards.filter((a) => a.correct).length;

  const after = useMemo(() => {
    const m = new Map<string, MasteryLevel>();
    const ids = Array.from(new Set(answers.map((a) => a.item.source.courseId).filter(Boolean))) as string[];
    ids.forEach((cid) => courseMastery(cid, lectures, materials, events).forEach((c) => m.set(c.concept.toLowerCase(), c.level)));
    return m;
  }, [events]);
  const practised = Array.from(new Set(answers.map((a) => a.item.concept).filter(Boolean))) as string[];
  const rank: Record<MasteryLevel, number> = { new: 0, weak: 1, developing: 2, strong: 3 };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: 40 }]}>
        <View style={styles.doneBadge}>
          <Ionicons name="trophy-outline" size={32} color={UI.amber} />
        </View>
        <Text style={styles.doneTitle}>Session complete</Text>
        <Text style={styles.doneSub}>{formatClock(seconds)} · {answers.length} items</Text>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statN}>
              {right}/{qs.length}
            </Text>
            <Text style={styles.statL}>questions right</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statN}>
              {known}/{cards.length}
            </Text>
            <Text style={styles.statL}>flashcards known</Text>
          </View>
        </View>

        {practised.length > 0 && (
          <>
            <Text style={styles.section}>Topics practised</Text>
            <View style={styles.cardList}>
              {practised.map((c, i) => {
                const b = before.get(c.toLowerCase()) ?? 'new';
                const a = after.get(c.toLowerCase()) ?? 'new';
                const up = rank[a] > rank[b];
                const down = rank[a] < rank[b];
                return (
                  <View key={c} style={[styles.topicRow, i > 0 && styles.topicBorder]}>
                    <Text style={styles.topicName}>{c}</Text>
                    <Text style={styles.topicLevel}>
                      {b === a ? LEVEL_LABEL[a] : `${LEVEL_LABEL[b]} → ${LEVEL_LABEL[a]}`}
                    </Text>
                    {up && <Ionicons name="arrow-up-circle" size={18} color={UI.success} accessibilityLabel="Improved" />}
                    {down && <Ionicons name="arrow-down-circle" size={18} color={UI.error} accessibilityLabel="Dropped" />}
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={{ gap: 10, marginTop: 24 }}>
          <Pressable
            style={styles.primary}
            onPress={() => router.replace({ pathname: '/study/session', params: { courseId: params.courseId ?? '', mode: 'weak' } } as any)}
          >
            <Text style={styles.primaryText}>Review weak topics</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => router.replace('/study' as Href)}>
            <Text style={styles.secondaryText}>Back to study</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },
  topBar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  timer: { fontFamily: LexiFonts.labelSmBold, fontSize: 14, color: UI.ink, fontVariant: ['tabular-nums'] },
  count: { fontFamily: LexiFonts.labelSmBold, fontSize: 13, color: UI.muted, minWidth: 24, textAlign: 'right' },
  progress: { height: 4, backgroundColor: UI.cardMuted, marginHorizontal: 20, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: UI.amber },
  scroll: { padding: 20, paddingBottom: 32, maxWidth: 600, width: '100%', alignSelf: 'center' },
  eyebrow: { fontFamily: LexiFonts.labelSmBold, fontSize: 11, letterSpacing: 1, color: UI.amber, marginBottom: 8, marginTop: 8 },
  question: { fontFamily: LexiFonts.headlineMd, fontSize: 21, lineHeight: 29, color: UI.ink, marginBottom: 18 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: UI.card, borderRadius: 14, borderWidth: 1.5, borderColor: UI.border, padding: 14 },
  optionSel: { borderColor: UI.ink },
  optionRight: { borderColor: UI.success, backgroundColor: '#f3f8ea' },
  optionWrong: { borderColor: UI.error, backgroundColor: '#fff6f5' },
  optionText: { flex: 1, fontFamily: LexiFonts.bodyMedium, fontSize: 15, color: UI.ink },
  feedback: { borderRadius: 14, padding: 14, marginTop: 16 },
  feedbackTitle: { fontFamily: LexiFonts.labelSmBold, fontSize: 14, marginBottom: 4 },
  feedbackText: { fontFamily: LexiFonts.bodyRegular, fontSize: 14, lineHeight: 20, color: UI.inkSoft },
  explainBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 10, backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
  explainText: { fontFamily: LexiFonts.labelSmBold, fontSize: 13, color: UI.ink },
  tutor: { marginTop: 12, gap: 8 },
  tutorStep: { fontFamily: LexiFonts.bodyRegular, fontSize: 14, lineHeight: 20, color: UI.ink },
  moment: { flexDirection: 'row', gap: 8, backgroundColor: '#fff', borderRadius: 10, padding: 10 },
  momentText: { flex: 1, fontFamily: LexiFonts.bodyRegular, fontSize: 13, lineHeight: 18, color: UI.inkSoft, fontStyle: 'italic' },
  askMore: { fontFamily: LexiFonts.labelSmBold, fontSize: 13, color: UI.amber, marginTop: 2 },
  card: { minHeight: 240, borderRadius: 20, backgroundColor: UI.card, borderWidth: 1, borderColor: UI.border, padding: 24, justifyContent: 'center' },
  cardFlipped: { backgroundColor: UI.ink, borderColor: UI.ink },
  cardTag: { fontFamily: LexiFonts.labelSmBold, fontSize: 11, letterSpacing: 1.2, color: UI.muted, marginBottom: 12 },
  cardText: { fontFamily: LexiFonts.headlineMd, fontSize: 20, lineHeight: 28, color: UI.ink },
  rateHint: { fontFamily: LexiFonts.bodyMedium, fontSize: 14, color: UI.muted, textAlign: 'center', marginTop: 14 },
  footer: { padding: 16, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: UI.borderSoft },
  primary: { height: 52, borderRadius: 26, backgroundColor: UI.ink, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: LexiFonts.labelSmBold, fontSize: 15, color: '#fff' },
  secondary: { height: 52, borderRadius: 26, borderWidth: 1, borderColor: UI.border, alignItems: 'center', justifyContent: 'center', backgroundColor: UI.card },
  secondaryText: { fontFamily: LexiFonts.labelSmBold, fontSize: 15, color: UI.ink },
  doneBadge: { width: 72, height: 72, borderRadius: 36, backgroundColor: UI.amberSoft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 14 },
  doneTitle: { fontFamily: LexiFonts.headlineLg, fontSize: 28, color: UI.ink, textAlign: 'center' },
  doneSub: { fontFamily: LexiFonts.bodyRegular, fontSize: 14, color: UI.muted, textAlign: 'center', marginTop: 4 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 22 },
  stat: { flex: 1, backgroundColor: UI.card, borderRadius: 16, borderWidth: 1, borderColor: UI.border, padding: 16, alignItems: 'center' },
  statN: { fontFamily: LexiFonts.headlineLg, fontSize: 28, color: UI.ink },
  statL: { fontFamily: LexiFonts.bodyRegular, fontSize: 12, color: UI.muted },
  section: { fontFamily: LexiFonts.headlineMd, fontSize: 18, color: UI.ink, marginTop: 24, marginBottom: 8 },
  cardList: { backgroundColor: UI.card, borderRadius: 16, borderWidth: 1, borderColor: UI.border, paddingHorizontal: 14 },
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  topicBorder: { borderTopWidth: 1, borderTopColor: UI.borderSoft },
  topicName: { flex: 1, fontFamily: LexiFonts.bodyMedium, fontSize: 14, color: UI.ink },
  topicLevel: { fontFamily: LexiFonts.labelSmBold, fontSize: 12, color: UI.inkSoft },
});

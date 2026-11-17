import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { QuizTab } from '@/components/lecture/quiz-tab';
import { Segmented } from '@/components/ui/chip';
import { StateView } from '@/components/states/state-view';
import {
  generateMaterialExamQuestions,
  generateMaterialFlashcards,
  generateMaterialQuiz,
  saveDeckToServer,
  saveQuizToServer,
  submitQuizAttempt,
} from '@/services/ai-api';
import type { LectureQuestion } from '@/types/lecture';
import type { MaterialAnalysis } from '@/types/material';

type Mode = 'quiz' | 'flashcards' | 'exam';

const MODES: { key: Mode; label: string; title: string; blurb: string; button: string }[] = [
  {
    key: 'quiz',
    label: 'Quiz',
    title: 'Multiple-choice quiz',
    blurb: '5 quick questions to check you understood this document.',
    button: 'Create quiz',
  },
  {
    key: 'flashcards',
    label: 'Flashcards',
    title: 'Flashcards',
    blurb: '10 cards with the key facts and definitions to memorise.',
    button: 'Create flashcards',
  },
  {
    key: 'exam',
    label: 'Exam-style',
    title: 'Exam-style questions',
    blurb:
      'Theory and applied questions with real-world scenarios, the way your lecturer might set them in a test or exam. Each comes with a model answer and marking guide.',
    button: 'Create exam questions',
  },
];

interface Props {
  analysis: MaterialAnalysis;
  /** The material's id on the server; without it nothing can be generated. */
  serverId?: string;
  onSave: (patch: Partial<MaterialAnalysis>) => void;
  onAnswer: (q: LectureQuestion, correct: boolean) => void;
  onCard: (card: { front: string; back: string }, knew: boolean) => void;
}

export function PracticeTab({ analysis, serverId, onSave, onAnswer, onCard }: Props) {
  const [mode, setMode] = useState<Mode>('quiz');
  const [busy, setBusy] = useState<Mode | null>(null);
  const [error, setError] = useState<Partial<Record<Mode, string>>>({});
  const [result, setResult] = useState('');
  const chosen = useRef(new Map<string, number>()); // question id → chosen option index
  const info = MODES.find((m) => m.key === mode)!;
  const title = analysis.title || 'Practice';

  /** Make sure the quiz exists on the server (older quizzes were only on the phone). */
  const ensureServerQuiz = async () => {
    if (analysis.serverQuiz || !serverId) return analysis.serverQuiz;
    const saved = await saveQuizToServer(`${title} – quiz`, serverId, analysis.questions);
    onSave({ serverQuiz: saved });
    return saved;
  };

  /** Quiz finished: the server grades it (POST /quizzes/:id/submit) and records it in your progress. */
  const finishQuiz = async () => {
    setResult('');
    try {
      const sq = await ensureServerQuiz();
      if (!sq || sq.questionIds.length !== analysis.questions.length) return;
      const answers = analysis.questions
        .map((q, i) => ({ q, i, pick: chosen.current.get(q.id) }))
        .filter((x) => x.pick !== undefined)
        .map((x) => ({ question_id: sq.questionIds[x.i], answer: x.q.options[x.pick!] }));
      if (!answers.length) return;
      const graded = await submitQuizAttempt(sq.id, answers);
      onSave({
        lastAttempt: { score: graded.score, maxScore: graded.max_score, percentage: graded.percentage, at: new Date().toISOString() },
      });
      setResult(`Saved to your progress: ${graded.score}/${graded.max_score} (${Math.round(graded.percentage)}%).`);
    } catch (e) {
      setResult(`Your score wasn’t saved to your account (${e instanceof Error ? e.message : 'try again later'}).`);
    } finally {
      chosen.current.clear();
    }
  };

  const has =
    mode === 'quiz'
      ? analysis.questions.length > 0
      : mode === 'flashcards'
        ? !!analysis.flashcards?.length
        : !!analysis.examQuestions?.length;

  const create = async (which: Mode) => {
    if (!serverId) return;
    setBusy(which);
    setError((e) => ({ ...e, [which]: '' }));
    try {
      if (which === 'quiz') {
        const questions = await generateMaterialQuiz(serverId);
        onSave({ questions, serverQuiz: undefined, lastAttempt: undefined });
        // Also keep it in the account, so it's graded there and counts towards progress.
        saveQuizToServer(`${title} – quiz`, serverId, questions)
          .then((serverQuiz) => onSave({ questions, serverQuiz }))
          .catch((e) => console.warn('[practice] quiz not saved to the server', e));
      }
      if (which === 'flashcards') {
        const flashcards = await generateMaterialFlashcards(serverId);
        onSave({ flashcards });
        saveDeckToServer(`${title} – flashcards`, serverId, flashcards)
          .then((serverDeckId) => onSave({ flashcards, serverDeckId }))
          .catch((e) => console.warn('[practice] deck not saved to the server', e));
      }
      if (which === 'exam') onSave({ examQuestions: await generateMaterialExamQuestions(serverId) });
    } catch (e) {
      setError((prev) => ({ ...prev, [which]: e instanceof Error ? e.message : 'Something went wrong. Please try again.' }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View>
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <Segmented<Mode> options={MODES.map((m) => ({ key: m.key, label: m.label }))} value={mode} onChange={setMode} />
      </View>

      {busy === mode ? (
        <View style={styles.busy}>
          <ActivityIndicator color={UI.ink} />
          <Text style={styles.body}>Zuri is writing your {info.title.toLowerCase()} from this document…</Text>
        </View>
      ) : !has ? (
        serverId && analysis.source === 'server' ? (
          <StateView
            compact
            icon={mode === 'flashcards' ? 'albums-outline' : mode === 'exam' ? 'school-outline' : 'help-circle-outline'}
            title={info.title}
            message={error[mode] || info.blurb}
            primary={{ label: error[mode] ? 'Try again' : info.button, onPress: () => create(mode) }}
          />
        ) : (
          <StateView compact icon="help-circle-outline" title="Not available" message="Upload this file again so Zuri can write practice from it." />
        )
      ) : mode === 'quiz' ? (
        <View>
          <QuizTab
            questions={analysis.questions}
            best={analysis.lastAttempt ? { score: analysis.lastAttempt.score, total: analysis.lastAttempt.maxScore } : undefined}
            onFinish={finishQuiz}
            onAnswer={(q, correct, pick) => {
              chosen.current.set(q.id, pick);
              onAnswer(q, correct);
            }}
          />
          {!!result && <Text style={[styles.body, { paddingHorizontal: 20, marginTop: 8 }]}>{result}</Text>}
        </View>
      ) : mode === 'flashcards' ? (
        <FlashcardDeck cards={analysis.flashcards!} onCard={onCard} />
      ) : (
        <ExamList questions={analysis.examQuestions!} />
      )}
    </View>
  );
}

function FlashcardDeck({ cards, onCard }: { cards: NonNullable<MaterialAnalysis['flashcards']>; onCard: Props['onCard'] }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const done = i >= cards.length;

  if (done) {
    return (
      <StateView
        compact
        icon="checkmark-circle-outline"
        title="Deck finished"
        message={`You knew ${known} of ${cards.length} cards.`}
        primary={{ label: 'Go again', onPress: () => { setI(0); setKnown(0); setFlipped(false); } }}
      />
    );
  }

  const card = cards[i];
  const answer = (knew: boolean) => {
    onCard(card, knew);
    if (knew) setKnown((k) => k + 1);
    setFlipped(false);
    setI((n) => n + 1);
  };

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <Text style={styles.counter}>
        Card {i + 1} of {cards.length}
        {card.topic ? ` · ${card.topic}` : ''}
      </Text>
      <Pressable
        onPress={() => setFlipped((f) => !f)}
        style={[styles.card, flipped && styles.cardBack]}
        accessibilityRole="button"
        accessibilityLabel={flipped ? 'Show the question' : 'Show the answer'}
      >
        <Text style={styles.cardKicker}>{flipped ? 'ANSWER' : 'QUESTION'}</Text>
        <Text style={styles.cardText}>{flipped ? card.back : card.front}</Text>
        {!flipped && <Text style={styles.hint}>Tap to see the answer</Text>}
      </Pressable>
      {flipped && (
        <View style={styles.row}>
          <Pressable style={[styles.btn, styles.btnSoft]} onPress={() => answer(false)}>
            <Text style={styles.btnSoftText}>Still learning</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnInk]} onPress={() => answer(true)}>
            <Text style={styles.btnInkText}>Got it</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function ExamList({ questions }: { questions: NonNullable<MaterialAnalysis['examQuestions']> }) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const toggle = (n: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });

  return (
    <View style={{ paddingHorizontal: 20, gap: 12 }}>
      <Text style={styles.body}>Write your answer on paper first, then compare it with the model answer.</Text>
      {questions.map((q, n) => (
        <View key={n} style={styles.examCard}>
          <View style={styles.examHead}>
            <Text style={styles.examNum}>Question {n + 1}</Text>
            {q.marks > 0 && <Text style={styles.marks}>{q.marks} marks</Text>}
          </View>
          <Text style={styles.examQ}>{q.question}</Text>
          {q.topic && <Text style={styles.topic}>{q.topic}</Text>}
          <Pressable onPress={() => toggle(n)} style={styles.reveal} accessibilityRole="button">
            <Ionicons name={open.has(n) ? 'chevron-up' : 'chevron-down'} size={16} color={UI.ink} />
            <Text style={styles.revealText}>{open.has(n) ? 'Hide model answer' : 'Show model answer'}</Text>
          </Pressable>
          {open.has(n) && (
            <View style={{ gap: 8 }}>
              <Text style={styles.body}>{q.modelAnswer || 'No model answer was given.'}</Text>
              {q.markingGuide.length > 0 && (
                <View style={styles.guide}>
                  <Text style={styles.guideTitle}>Marking guide</Text>
                  {q.markingGuide.map((g, k) => (
                    <Text key={k} style={styles.body}>• {g}</Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  busy: { alignItems: 'center', paddingVertical: 32, gap: 10, paddingHorizontal: 20 },
  body: { fontFamily: ZuriFonts.bodyRegular, fontSize: 14, lineHeight: 21, color: UI.inkSoft },
  counter: { fontFamily: ZuriFonts.labelSm, fontSize: 12, color: UI.muted, marginBottom: 8 },
  card: {
    minHeight: 200,
    borderRadius: 18,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 20,
    justifyContent: 'center',
    gap: 10,
  },
  cardBack: { backgroundColor: UI.cardMuted },
  cardKicker: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, letterSpacing: 1, color: UI.muted },
  cardText: { fontFamily: ZuriFonts.headlineMd, fontSize: 19, lineHeight: 26, color: UI.ink },
  hint: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { flex: 1, borderRadius: 24, paddingVertical: 12, alignItems: 'center' },
  btnSoft: { backgroundColor: UI.cardMuted, borderWidth: 1, borderColor: UI.border },
  btnSoftText: { fontFamily: ZuriFonts.bodyMedium, color: UI.ink },
  btnInk: { backgroundColor: UI.ink },
  btnInkText: { fontFamily: ZuriFonts.bodyMedium, color: '#fff' },
  examCard: { backgroundColor: UI.card, borderRadius: 16, borderWidth: 1, borderColor: UI.border, padding: 16, gap: 8 },
  examHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  examNum: { fontFamily: ZuriFonts.labelSmBold, fontSize: 12, color: UI.muted },
  marks: { fontFamily: ZuriFonts.labelSmBold, fontSize: 12, color: UI.amber },
  examQ: { fontFamily: ZuriFonts.bodyMedium, fontSize: 15, lineHeight: 22, color: UI.ink },
  topic: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted },
  reveal: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  revealText: { fontFamily: ZuriFonts.bodyMedium, fontSize: 13, color: UI.ink },
  guide: { backgroundColor: UI.cardMuted, borderRadius: 12, padding: 12, gap: 4 },
  guideTitle: { fontFamily: ZuriFonts.labelSmBold, fontSize: 12, color: UI.ink },
});

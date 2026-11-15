import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import type { LectureQuestion } from '@/types/lecture';
import { tabStyles as t } from './tab-styles';

interface Props {
  questions: LectureQuestion[];
  best?: { score: number; total: number };
  onFinish: (score: number, total: number) => void;
}

/** One question at a time → instant feedback → results with review. */
export function QuizTab({ questions, best, onFinish }: Props) {
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [done, setDone] = useState(false);

  if (!questions.length) {
    return (
      <View style={t.empty}>
        <Ionicons name="help-circle-outline" size={28} color={UI.muted} />
        <Text style={t.emptyText}>No questions for this lecture yet.</Text>
      </View>
    );
  }

  const restart = () => {
    setStarted(true);
    setIdx(0);
    setSelected(null);
    setChecked(false);
    setAnswers([]);
    setDone(false);
  };

  // ── Intro ──
  if (!started) {
    return (
      <ScrollView contentContainerStyle={t.scroll}>
        <View style={[t.card, { alignItems: 'center', paddingVertical: 28 }]}>
          <View style={styles.introIcon}>
            <Ionicons name="help" size={26} color={UI.ink} />
          </View>
          <Text style={styles.introTitle}>Check what you remember</Text>
          <Text style={[t.body, { textAlign: 'center', marginBottom: 18 }]}>
            {questions.length} questions from this lecture. About {Math.max(1, Math.round(questions.length * 0.75))}{' '}
            minutes.
          </Text>
          {best && (
            <Text style={styles.best}>
              Your best: {best.score}/{best.total}
            </Text>
          )}
          <Pressable style={({ pressed }) => [t.primaryBtn, { alignSelf: 'stretch' }, pressed && t.pressed]} onPress={restart}>
            <Text style={t.primaryBtnText}>{best ? 'Retake quiz' : 'Start quiz'}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ── Results ──
  if (done) {
    const score = answers.filter((a, i) => a === questions[i].correctIndex).length;
    const pct = Math.round((score / questions.length) * 100);
    const message =
      pct === 100 ? 'Perfect score.' : pct >= 70 ? 'Solid. Review the ones you missed.' : 'Worth another look at the notes.';
    return (
      <ScrollView contentContainerStyle={t.scroll}>
        <View style={[t.card, { alignItems: 'center', paddingVertical: 24 }]}>
          <Text style={styles.scoreBig}>
            {score}
            <Text style={styles.scoreOf}>/{questions.length}</Text>
          </Text>
          <Text style={[t.body, { marginTop: 4 }]}>{message}</Text>
        </View>

        <Text style={[t.sectionHeading, { marginTop: 24 }]}>Review</Text>
        <View style={{ gap: 10 }}>
          {questions.map((q, i) => {
            const right = answers[i] === q.correctIndex;
            return (
              <View key={q.id} style={t.card}>
                <View style={styles.reviewTop}>
                  <Ionicons
                    name={right ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={right ? UI.success : UI.error}
                  />
                  <Text style={styles.reviewQ}>{q.question}</Text>
                </View>
                {!right && (
                  <Text style={styles.reviewLine}>
                    You said: <Text style={{ color: UI.error }}>{q.options[answers[i]]}</Text>
                  </Text>
                )}
                <Text style={styles.reviewLine}>
                  Answer: <Text style={{ color: UI.success }}>{q.options[q.correctIndex]}</Text>
                </Text>
                <Text style={styles.reviewExplain}>{q.explanation}</Text>
              </View>
            );
          })}
        </View>

        <Pressable style={({ pressed }) => [t.primaryBtn, { marginTop: 20 }, pressed && t.pressed]} onPress={restart}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={t.primaryBtnText}>Retake quiz</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ── Question ──
  const q = questions[idx];
  const isLast = idx === questions.length - 1;
  const correct = selected === q.correctIndex;

  const onPrimary = () => {
    if (selected === null) return;
    if (!checked) {
      setChecked(true);
      return;
    }
    const nextAnswers = [...answers, selected];
    setAnswers(nextAnswers);
    if (isLast) {
      const score = nextAnswers.filter((a, i) => a === questions[i].correctIndex).length;
      onFinish(score, questions.length);
      setDone(true);
    } else {
      setIdx(idx + 1);
      setSelected(null);
      setChecked(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={t.scroll}>
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          Question {idx + 1} of {questions.length}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((idx + (checked ? 1 : 0)) / questions.length) * 100}%` }]} />
        </View>
      </View>

      <Text style={styles.question}>{q.question}</Text>

      <View style={{ gap: 10 }}>
        {q.options.map((opt, i) => {
          const isSel = selected === i;
          const showRight = checked && i === q.correctIndex;
          const showWrong = checked && isSel && !correct;
          return (
            <Pressable
              key={opt}
              disabled={checked}
              onPress={() => setSelected(i)}
              style={[
                styles.option,
                isSel && styles.optionSel,
                showRight && styles.optionRight,
                showWrong && styles.optionWrong,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSel }}
            >
              <View style={[styles.letter, isSel && !checked && styles.letterSel]}>
                <Text style={[styles.letterText, isSel && !checked && { color: '#fff' }]}>
                  {String.fromCharCode(65 + i)}
                </Text>
              </View>
              <Text style={styles.optionText}>{opt}</Text>
              {showRight && <Ionicons name="checkmark-circle" size={20} color={UI.success} />}
              {showWrong && <Ionicons name="close-circle" size={20} color={UI.error} />}
            </Pressable>
          );
        })}
      </View>

      {checked && (
        <View style={[styles.feedback, { backgroundColor: correct ? '#eef5e0' : '#fff1ef' }]}>
          <Text style={[styles.feedbackTitle, { color: correct ? UI.success : UI.error }]}>
            {correct ? 'Correct' : 'Not quite'}
          </Text>
          <Text style={styles.feedbackText}>{q.explanation}</Text>
        </View>
      )}

      <Pressable
        style={({ pressed }) => [t.primaryBtn, { marginTop: 20 }, selected === null && { opacity: 0.4 }, pressed && t.pressed]}
        disabled={selected === null}
        onPress={onPrimary}
      >
        <Text style={t.primaryBtnText}>{!checked ? 'Check answer' : isLast ? 'See results' : 'Next question'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  introIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: UI.amberSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  introTitle: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 22,
    color: UI.ink,
    marginBottom: 6,
  },
  best: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: UI.amber,
    marginBottom: 14,
  },
  progressRow: {
    gap: 8,
    marginBottom: 18,
  },
  progressText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 12,
    color: UI.muted,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: UI.cardMuted,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: UI.amber,
  },
  question: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 21,
    lineHeight: 29,
    color: UI.ink,
    marginBottom: 18,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: UI.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: UI.border,
    padding: 14,
  },
  optionSel: {
    borderColor: UI.ink,
  },
  optionRight: {
    borderColor: UI.success,
    backgroundColor: '#f3f8ea',
  },
  optionWrong: {
    borderColor: UI.error,
    backgroundColor: '#fff6f5',
  },
  letter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterSel: {
    backgroundColor: UI.ink,
    borderColor: UI.ink,
  },
  letterText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: UI.ink,
  },
  optionText: {
    flex: 1,
    fontFamily: LexiFonts.bodyMedium,
    fontSize: 15,
    color: UI.ink,
  },
  feedback: {
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  feedbackTitle: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 14,
    marginBottom: 4,
  },
  feedbackText: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 14,
    lineHeight: 20,
    color: UI.inkSoft,
  },
  scoreBig: {
    fontFamily: LexiFonts.headlineLg,
    fontSize: 56,
    color: UI.ink,
  },
  scoreOf: {
    fontSize: 28,
    color: UI.muted,
  },
  reviewTop: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  reviewQ: {
    flex: 1,
    fontFamily: LexiFonts.bodyMedium,
    fontSize: 15,
    lineHeight: 21,
    color: UI.ink,
  },
  reviewLine: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 13,
    color: UI.inkSoft,
    marginLeft: 30,
    marginTop: 2,
  },
  reviewExplain: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
    color: UI.muted,
    marginLeft: 30,
    marginTop: 6,
  },
});

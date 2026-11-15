import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { useLecturer } from '@/context/lecturer-context';
import { ScreenShell, Panel, StatusBadge } from '@/components/dashboard';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { EmptyState } from '@/components/states/state-view';

/** Review a generated quiz: rename, keep or drop questions, see answers, publish. */
export default function QuizReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { quizzes, courses, saveQuiz, deleteQuiz } = useLecturer();
  const quiz = quizzes.find((q) => q.id === id);
  const [title, setTitle] = useState(quiz?.title ?? '');
  const [kept, setKept] = useState<Set<string>>(new Set(quiz?.questions.map((q) => q.id)));
  const [open, setOpen] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!quiz) {
    return (
      <ScreenShell back title="Quiz">
        <EmptyState icon="help-circle-outline" title="Quiz not found" message="It may have been deleted." />
      </ScreenShell>
    );
  }

  const course = courses.find((c) => c.id === quiz.courseId);
  const toggle = (qid: string) =>
    setKept((s) => {
      const n = new Set(s);
      n.has(qid) ? n.delete(qid) : n.add(qid);
      return n;
    });

  const save = (status: 'draft' | 'published') => {
    saveQuiz({ ...quiz, title: title.trim() || quiz.title, questions: quiz.questions.filter((q) => kept.has(q.id)), status });
    router.back();
  };

  return (
    <ScreenShell back eyebrow={`${course?.code ?? ''} · REVIEW QUIZ`} title="Review questions" edges={['top', 'bottom']}>
      <Panel>
        <Text style={styles.label}>QUIZ TITLE</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor={UI.muted} />
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{quiz.source}</Text>
          <StatusBadge status={quiz.status === 'published' ? 'good' : 'warning'} label={quiz.status === 'published' ? 'Published' : 'Draft'} />
        </View>
      </Panel>

      <Text style={styles.count}>
        {kept.size} of {quiz.questions.length} questions included · tap a question to see the answer
      </Text>

      {quiz.questions.map((q, idx) => {
        const on = kept.has(q.id);
        return (
          <View key={q.id} style={[styles.q, !on && styles.qOff]}>
            <View style={styles.qHead}>
              <Pressable
                onPress={() => toggle(q.id)}
                hitSlop={8}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`Include question ${idx + 1}`}
              >
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? UI.success : UI.muted} />
              </Pressable>
              <Pressable style={{ flex: 1 }} onPress={() => setOpen(open === q.id ? null : q.id)}>
                <Text style={styles.qText}>
                  {idx + 1}. {q.question}
                </Text>
              </Pressable>
            </View>
            {open === q.id && (
              <View style={styles.answers}>
                {q.options.map((o, oi) => (
                  <View key={o} style={styles.opt}>
                    <Ionicons
                      name={oi === q.correctIndex ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={oi === q.correctIndex ? UI.success : UI.muted}
                    />
                    <Text style={[styles.optText, oi === q.correctIndex && { color: UI.ink, fontFamily: LexiFonts.labelSmBold }]}>{o}</Text>
                  </View>
                ))}
                {!!q.explanation && <Text style={styles.explain}>{q.explanation}</Text>}
              </View>
            )}
          </View>
        );
      })}

      <View style={styles.actions}>
        <Pressable style={[styles.primary, kept.size === 0 && { opacity: 0.4 }]} disabled={kept.size === 0} onPress={() => save('published')}>
          <Ionicons name="paper-plane-outline" size={18} color="#fff" />
          <Text style={styles.primaryText}>{quiz.status === 'published' ? 'Update published quiz' : 'Publish to students'}</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => save('draft')}>
          <Text style={styles.secondaryText}>Save as draft</Text>
        </Pressable>
        <Pressable onPress={() => setConfirmDelete(true)} style={{ alignSelf: 'center', padding: 8 }}>
          <Text style={styles.delete}>Delete quiz</Text>
        </Pressable>
      </View>
      <Text style={styles.note}>Publishing makes it available to students once the backend delivers it to their app.</Text>

      <ConfirmSheet
        visible={confirmDelete}
        title="Delete this quiz?"
        message="This removes the quiz. The lecture or material it came from is kept."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          deleteQuiz(quiz.id);
          router.back();
        }}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: LexiFonts.labelSmBold, fontSize: 11, letterSpacing: 1.2, color: UI.muted, marginBottom: 8 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.bg,
    paddingHorizontal: 14,
    fontFamily: LexiFonts.bodyMedium,
    fontSize: 15,
    color: UI.ink,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  meta: { flex: 1, fontFamily: LexiFonts.bodyRegular, fontSize: 12, color: UI.muted },
  count: { fontFamily: LexiFonts.labelSmBold, fontSize: 12, color: UI.muted },
  q: { backgroundColor: UI.card, borderRadius: 14, borderWidth: 1, borderColor: UI.border, padding: 14 },
  qOff: { opacity: 0.55 },
  qHead: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  qText: { fontFamily: LexiFonts.bodyMedium, fontSize: 15, lineHeight: 21, color: UI.ink },
  answers: { marginTop: 10, marginLeft: 34, gap: 6 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optText: { flex: 1, fontFamily: LexiFonts.bodyRegular, fontSize: 14, color: UI.inkSoft },
  explain: { fontFamily: LexiFonts.bodyRegular, fontSize: 13, lineHeight: 19, color: UI.muted, marginTop: 4 },
  actions: { gap: 10, marginTop: 8 },
  primary: { height: 52, borderRadius: 26, backgroundColor: UI.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { fontFamily: LexiFonts.labelSmBold, fontSize: 15, color: '#fff' },
  secondary: { height: 52, borderRadius: 26, borderWidth: 1, borderColor: UI.border, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontFamily: LexiFonts.labelSmBold, fontSize: 15, color: UI.ink },
  delete: { fontFamily: LexiFonts.labelSmBold, fontSize: 14, color: UI.error },
  note: { fontFamily: LexiFonts.bodyRegular, fontSize: 12, color: UI.muted, textAlign: 'center' },
});

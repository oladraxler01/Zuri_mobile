import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { useLecturer } from '@/context/lecturer-context';
import { useLectures } from '@/context/lectures-context';
import { ScreenShell, Panel, StatusBadge } from '@/components/dashboard';
import { Chip } from '@/components/ui/chip';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { EmptyState } from '@/components/states/state-view';
import { insightsFor } from '@/utils/lecturer';
import type { NoteSection } from '@/types/lecture';

/**
 * Revision material. /teach/revision/new?courseId= builds a pack from the
 * course's lectures and the class's weak topics; /teach/revision/<id> opens one.
 */
export default function RevisionPackScreen() {
  const params = useLocalSearchParams<{ id: string; courseId?: string }>();
  const { courses, packs, savePack, deletePack } = useLecturer();
  const { lectures } = useLectures();
  const existing = params.id !== 'new' ? packs.find((p) => p.id === params.id) : undefined;
  const [courseId, setCourseId] = useState(existing?.courseId ?? params.courseId ?? courses[0]?.id);
  const course = courses.find((c) => c.id === courseId);

  const generated = useMemo<NoteSection[]>(() => {
    if (!course) return [];
    const ready = lectures.filter((l) => l.courseId === course.id && l.analysis);
    const i = insightsFor(course, lectures);
    const sections: NoteSection[] = [];
    if (ready.length)
      sections.push({ heading: 'Key ideas from recent lectures', points: ready.slice(0, 4).map((l) => `${l.analysis!.title}: ${l.analysis!.summary}`) });
    const concepts = ready.flatMap((l) => l.analysis!.concepts).slice(0, 6);
    if (concepts.length) sections.push({ heading: 'Concepts to know', points: concepts.map((c) => `${c.title}: ${c.summary}`) });
    sections.push({
      heading: 'Focus areas for this class',
      points: i.topics.slice(0, 3).map((t) => {
        const m = i.misconceptions.find((x) => x.topic === t.topic);
        return `${t.topic} (${t.mastery}% mastery)${m ? `: watch out, many students ${m.statement.charAt(0).toLowerCase() + m.statement.slice(1)}` : ''}.`;
      }),
    });
    const cards = ready.flatMap((l) => l.analysis!.flashcards).slice(0, 6);
    if (cards.length) sections.push({ heading: 'Practice questions', points: cards.map((f) => `${f.question} Answer: ${f.answer.replace(/\n/g, ' ')}`) });
    return sections;
  }, [course, lectures]);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const sections = existing ? existing.sections : generated;
  const kept = sections.filter((_, i) => !removed.has(i));

  if (!course) {
    return (
      <ScreenShell back title="Revision material">
        <EmptyState icon="layers-outline" title="Add a course first" message="Revision packs are built from a course's lectures." />
      </ScreenShell>
    );
  }

  const save = (published: boolean) => {
    savePack({
      id: existing?.id,
      courseId: course.id,
      title: title.trim() || `${course.code} revision pack`,
      sections: kept,
      published,
    });
    router.back();
  };

  return (
    <ScreenShell back eyebrow={existing ? `${course.code} · REVISION PACK` : 'REVISION MATERIAL'} title={existing ? existing.title : 'New revision pack'} edges={['top', 'bottom']}>
      {!existing && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {courses.map((c) => (
            <Chip
              key={c.id}
              label={c.code}
              on={c.id === courseId}
              onPress={() => {
                setCourseId(c.id);
                setRemoved(new Set());
              }}
            />
          ))}
        </ScrollView>
      )}

      <Panel>
        <Text style={styles.label}>TITLE</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder={`${course.code} revision pack`}
          placeholderTextColor={UI.muted}
        />
        {existing && (
          <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
            <StatusBadge status={existing.published ? 'good' : 'warning'} label={existing.published ? 'Shared with class' : 'Draft'} />
          </View>
        )}
      </Panel>

      {!lectures.some((l) => l.courseId === course.id && l.analysis) && !existing && (
        <Text style={styles.hint}>Record {course.code} lectures to add key ideas, concepts and practice questions automatically.</Text>
      )}

      {sections.map((s, i) =>
        removed.has(i) ? null : (
          <Panel key={s.heading + i}>
            <View style={styles.secHead}>
              <Text style={styles.secTitle}>{s.heading}</Text>
              {!existing && (
                <Pressable
                  onPress={() => setRemoved((r) => new Set(r).add(i))}
                  hitSlop={10}
                  accessibilityLabel={`Remove section ${s.heading}`}
                >
                  <Ionicons name="close-circle-outline" size={20} color={UI.muted} />
                </Pressable>
              )}
            </View>
            {s.points.map((p) => (
              <View key={p} style={styles.point}>
                <View style={styles.dot} />
                <Text style={styles.pointText}>{p}</Text>
              </View>
            ))}
          </Panel>
        )
      )}

      <View style={{ gap: 10 }}>
        <Pressable style={[styles.primary, !kept.length && { opacity: 0.4 }]} disabled={!kept.length} onPress={() => save(true)}>
          <Ionicons name="share-social-outline" size={18} color="#fff" />
          <Text style={styles.primaryText}>Share with {course.code}</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => save(false)}>
          <Text style={styles.secondaryText}>Save as draft</Text>
        </Pressable>
        {existing && (
          <Pressable onPress={() => setConfirmDelete(true)} style={{ alignSelf: 'center', padding: 8 }}>
            <Text style={styles.delete}>Delete pack</Text>
          </Pressable>
        )}
      </View>

      <ConfirmSheet
        visible={confirmDelete}
        title="Delete this revision pack?"
        message="Students who already have it keep their copy once sharing is live."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          if (existing) deletePack(existing.id);
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
  hint: { fontFamily: LexiFonts.bodyRegular, fontSize: 13, color: UI.muted },
  secHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  secTitle: { flex: 1, fontFamily: LexiFonts.headlineMd, fontSize: 17, color: UI.ink },
  point: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: UI.amber, marginTop: 8 },
  pointText: { flex: 1, fontFamily: LexiFonts.bodyRegular, fontSize: 14, lineHeight: 21, color: UI.inkSoft },
  primary: { height: 52, borderRadius: 26, backgroundColor: UI.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { fontFamily: LexiFonts.labelSmBold, fontSize: 15, color: '#fff' },
  secondary: { height: 52, borderRadius: 26, borderWidth: 1, borderColor: UI.border, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontFamily: LexiFonts.labelSmBold, fontSize: 15, color: UI.ink },
  delete: { fontFamily: LexiFonts.labelSmBold, fontSize: 14, color: UI.error },
});

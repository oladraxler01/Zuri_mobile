import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useLecturer } from '@/context/lecturer-context';
import { useLectures } from '@/context/lectures-context';
import { useMaterials } from '@/context/materials-context';
import { ScreenShell, Panel, ListRow, Divider } from '@/components/dashboard';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/states/state-view';

/** Generate a quiz: pick a lecture or material; its questions become a draft to review. */
export default function NewQuizScreen() {
  const params = useLocalSearchParams<{ courseId?: string }>();
  const { courses, saveQuiz } = useLecturer();
  const { lectures } = useLectures();
  const { materials } = useMaterials();
  const [courseId, setCourseId] = useState(params.courseId ?? courses[0]?.id);
  const course = courses.find((c) => c.id === courseId);

  const sourceLectures = lectures.filter((l) => l.courseId === courseId && l.analysis?.questions.length);
  const sourceMaterials = materials.filter((m) => m.courseId === courseId && m.analysis?.questions.length);

  const create = (title: string, source: string, questions: any[]) => {
    const id = saveQuiz({ courseId: courseId!, title, source, questions, status: 'draft' });
    router.replace(`/teach/quiz/${id}` as Href);
  };

  return (
    <ScreenShell back eyebrow="GENERATE QUIZ" title="Choose a source" edges={['top', 'bottom']}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {courses.map((c) => (
          <Chip key={c.id} label={c.code} on={c.id === courseId} onPress={() => setCourseId(c.id)} />
        ))}
      </ScrollView>

      {!sourceLectures.length && !sourceMaterials.length ? (
        <EmptyState
          icon="help-circle-outline"
          title="Nothing to build from yet"
          message={`Record a ${course?.code ?? ''} lecture or upload a material; its questions appear here to turn into a quiz.`}
        />
      ) : (
        <>
          {sourceLectures.length > 0 && (
            <Panel title="From your lectures">
              {sourceLectures.map((l, i) => (
                <View key={l.id}>
                  {i > 0 && <Divider />}
                  <ListRow
                    icon="mic-outline"
                    title={l.analysis!.title}
                    subtitle={`${l.analysis!.questions.length} questions · ${new Date(l.createdAt).toLocaleDateString()}`}
                    onPress={() => create(`${l.analysis!.title} check`, `Lecture · ${l.analysis!.title}`, l.analysis!.questions)}
                  />
                </View>
              ))}
            </Panel>
          )}
          {sourceMaterials.length > 0 && (
            <Panel title="From materials">
              {sourceMaterials.map((m, i) => (
                <View key={m.id}>
                  {i > 0 && <Divider />}
                  <ListRow
                    icon="document-text-outline"
                    title={m.analysis!.title}
                    subtitle={`${m.analysis!.questions.length} questions`}
                    onPress={() => create(`${m.analysis!.title} quiz`, `Material · ${m.analysis!.title}`, m.analysis!.questions)}
                  />
                </View>
              ))}
            </Panel>
          )}
          <Text style={styles.note}>You'll review every question before anything is shared with students.</Text>
        </>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  note: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted, textAlign: 'center' },
});

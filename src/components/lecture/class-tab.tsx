import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { HBarList, SampleBanner } from '@/components/dashboard';
import { lectureResponse } from '@/data/sample-class-insights';
import type { Lecture } from '@/types/lecture';
import { tabStyles as t } from './tab-styles';

/** Lecturer-only: how the class responded to this lecture's questions, and its misconceptions. */
export function ClassTab({ lecture, cohortSize, courseId }: { lecture: Lecture; cohortSize: number; courseId?: string }) {
  const r = lectureResponse(lecture, cohortSize);
  const hardest = [...r.questions].sort((a, b) => a.correct - b.correct)[0];

  return (
    <ScrollView contentContainerStyle={t.scroll}>
      <Text style={t.sectionHeading}>Class response</Text>
      <Text style={t.body}>
        {r.responded} of {cohortSize} students answered this lecture’s questions.
        {hardest ? ` The hardest was “${hardest.question}” (${hardest.correct}% correct).` : ''}
      </Text>

      {r.questions.length > 0 && (
        <>
          <Text style={[t.sectionHeading, { marginTop: 24 }]}>Question by question</Text>
          <HBarList rows={r.questions.map((q) => ({ label: q.question, value: q.correct, sub: q.commonWrong ? `Most common wrong answer: “${q.commonWrong}” (${q.commonWrongShare}%)` : undefined }))} warnBelow={50} />
        </>
      )}

      {r.misconceptions.length > 0 && (
        <>
          <Text style={[t.sectionHeading, { marginTop: 24 }]}>Lecture misconceptions</Text>
          {r.misconceptions.map((m) => (
            <View key={m.concept} style={styles.misc}>
              <View style={styles.miscHead}>
                <Text style={styles.miscConcept}>{m.concept}</Text>
                <Text style={styles.miscShare}>{m.share}% of class</Text>
              </View>
              <Text style={t.body}>Students {m.statement}.</Text>
            </View>
          ))}
          <Pressable
            style={({ pressed }) => [t.primaryBtn, { marginTop: 16 }, pressed && t.pressed]}
            onPress={() => router.push({ pathname: '/teach/revision/[id]', params: { id: 'new', courseId: courseId ?? '' } } as any)}
          >
            <Text style={t.primaryBtnText}>Address these in a revision pack</Text>
          </Pressable>
        </>
      )}
      <View style={{ marginTop: 18 }}>
        <SampleBanner text="Sample class responses. Real answers appear once your students use Zuri for this course." />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  misc: { backgroundColor: UI.card, borderRadius: 14, borderWidth: 1, borderColor: UI.border, padding: 14, marginBottom: 10, gap: 4 },
  miscHead: { flexDirection: 'row', justifyContent: 'space-between' },
  miscConcept: { fontFamily: ZuriFonts.labelSmBold, fontSize: 14, color: UI.ink },
  miscShare: { fontFamily: ZuriFonts.labelSmBold, fontSize: 12, color: UI.error },
});

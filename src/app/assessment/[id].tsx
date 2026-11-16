import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, StatusBar, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useAcademic } from '@/context/academic-context';
import { usePlanner } from '@/context/planner-context';
import { useLectures } from '@/context/lectures-context';
import { useMaterials } from '@/context/materials-context';
import { kindMeta, urgencyColor } from '@/components/planner/assessment-card';
import { LectureCard } from '@/components/lecture/lecture-card';
import { MaterialCard } from '@/components/materials/material-card';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { StateView } from '@/components/states/state-view';
import { buildStudyPlan, describeDue, formatDue } from '@/utils/planner';
import { formatDuration } from '@/utils/time';

export default function AssessmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useAcademic();
  const planner = usePlanner();
  const { lectures } = useLectures();
  const { materials } = useMaterials();
  const a = planner.getAssessment(id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newStep, setNewStep] = useState('');

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/plan' as Href));

  const plan = useMemo(
    () => buildStudyPlan(planner.assessments, state.preferences.weeklyStudyHours, 14).filter((b) => b.assessmentId === id),
    [planner.assessments, state.preferences.weeklyStudyHours, id]
  );

  if (!a) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}>
        <StateView icon="trash-outline" title="Not found" message="This item was deleted." primary={{ label: 'Go back', onPress: goBack }} />
      </SafeAreaView>
    );
  }

  const meta = kindMeta(a.kind);
  const timed = a.kind === 'exam' || a.kind === 'test';
  const course = state.courses.find((c) => c.id === a.courseId);
  const courseLectures = lectures
    .filter((l) => l.courseId === a.courseId && l.status === 'ready')
    .sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  const courseMaterials = materials
    .filter((m) => m.courseId === a.courseId)
    .sort((x, y) => (timed && x.category === 'past-questions' ? -1 : timed && y.category === 'past-questions' ? 1 : 0));
  const topics = Array.from(
    new Map(courseLectures.flatMap((l) => l.analysis?.concepts ?? []).map((c) => [c.title.toLowerCase(), c.title])).values()
  );
  const gaps = courseLectures.map((l) => l.analysis?.knowledgeGap).filter(Boolean);
  const done = a.steps.filter((s) => s.done).length;
  const color = urgencyColor(a);

  const addStep = () => {
    const text = newStep.trim();
    if (!text) return;
    planner.updateAssessment(a.id, {
      steps: [...a.steps, { id: `s_${Date.now().toString(36)}`, text, done: false }],
      status: a.status === 'done' ? 'in-progress' : a.status,
    });
    setNewStep('');
  };

  const toggleDone = () => {
    const markDone = a.status !== 'done';
    planner.updateAssessment(a.id, {
      status: markDone ? 'done' : 'todo',
      steps: a.steps.map((s) => ({ ...s, done: markDone })),
    });
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <Pressable onPress={goBack} hitSlop={10} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={UI.ink} />
        </Pressable>
        <View style={styles.topActions}>
          <Pressable
            onPress={() => router.push({ pathname: '/assessment/edit', params: { id: a.id } } as any)}
            hitSlop={10}
            accessibilityLabel="Edit"
          >
            <Ionicons name="create-outline" size={21} color={UI.inkSoft} />
          </Pressable>
          <Pressable onPress={() => setConfirmDelete(true)} hitSlop={10} accessibilityLabel="Delete">
            <Ionicons name="trash-outline" size={20} color={UI.inkSoft} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>
            {a.courseCode} · {meta.label.toUpperCase()}
            {a.weight ? ` · ${a.weight}% OF GRADE` : ''}
          </Text>
          <Text style={styles.heroTitle}>{a.title}</Text>
          <View style={styles.facts}>
            <View style={[styles.dueBadge, { borderColor: color }]}>
              <Ionicons name="time-outline" size={14} color={color} />
              <Text style={[styles.dueText, { color }]}>{a.status === 'done' ? 'Completed' : describeDue(a)}</Text>
            </View>
          </View>
          <Text style={styles.heroMeta}>{formatDue(a.dueAt)}</Text>
          {!!a.venue && (
            <View style={styles.venueRow}>
              <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.75)" />
              <Text style={styles.heroMeta}>{a.venue}</Text>
            </View>
          )}
          {course?.lecturer && <Text style={styles.heroMeta}>{course.lecturer}</Text>}
        </View>

        {!!a.notes && (
          <>
            <Text style={styles.section}>Details</Text>
            <Text style={styles.body}>{a.notes}</Text>
          </>
        )}

        {/* Preparation checklist */}
        <View style={styles.sectionRow}>
          <Text style={styles.section}>Preparation</Text>
          <Text style={styles.count}>
            {done}/{a.steps.length} done
          </Text>
        </View>
        <View style={styles.card}>
          {a.steps.map((s) => (
            <Pressable
              key={s.id}
              style={styles.step}
              onPress={() => planner.toggleStep(a.id, s.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: s.done }}
            >
              <Ionicons name={s.done ? 'checkbox' : 'square-outline'} size={22} color={s.done ? UI.success : UI.muted} />
              <Text style={[styles.stepText, s.done && styles.stepDone]}>{s.text}</Text>
            </Pressable>
          ))}
          <View style={styles.addStepRow}>
            <TextInput
              style={styles.addStepInput}
              value={newStep}
              onChangeText={setNewStep}
              placeholder="Add a step"
              placeholderTextColor={UI.muted}
              onSubmitEditing={addStep}
              returnKeyType="done"
            />
            <Pressable onPress={addStep} hitSlop={8} accessibilityLabel="Add step">
              <Ionicons name="add-circle" size={26} color={UI.ink} />
            </Pressable>
          </View>
        </View>
        <Pressable style={({ pressed }) => [styles.doneBtn, a.status === 'done' && styles.doneBtnOn, pressed && { opacity: 0.88 }]} onPress={toggleDone}>
          <Ionicons name={a.status === 'done' ? 'refresh' : 'checkmark-done'} size={18} color={a.status === 'done' ? UI.ink : '#fff'} />
          <Text style={[styles.doneText, a.status === 'done' && { color: UI.ink }]}>
            {a.status === 'done' ? 'Mark as not done' : timed ? 'Mark as sat' : 'Mark as submitted'}
          </Text>
        </Pressable>

        {/* Study plan */}
        {a.status !== 'done' && plan.length > 0 && (
          <>
            <Text style={styles.section}>Your study sessions</Text>
            <View style={styles.card}>
              {plan.map((b) => (
                <View key={b.date} style={styles.planRow}>
                  <Text style={styles.planDate}>
                    {new Date(`${b.date}T00:00:00`).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
                  </Text>
                  <Text style={styles.planMins}>{formatDuration(b.minutes * 60)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Exam prep: topics + weak spots */}
        {timed && (topics.length > 0 || gaps.length > 0) && (
          <>
            <Text style={styles.section}>Topics to revise</Text>
            <View style={styles.topicWrap}>
              {topics.map((t) => (
                <View key={t} style={styles.topic}>
                  <Text style={styles.topicText}>{t}</Text>
                </View>
              ))}
            </View>
            {gaps.map((g) => (
              <View key={g!.concept} style={styles.gap}>
                <Ionicons name="flag" size={14} color={UI.error} />
                <Text style={styles.gapText}>
                  <Text style={{ fontFamily: ZuriFonts.labelSmBold }}>{g!.concept}: </Text>
                  {g!.reason}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Related materials */}
        <View style={styles.sectionRow}>
          <Text style={styles.section}>{timed ? 'Past questions & materials' : 'Course materials'}</Text>
          <Pressable onPress={() => router.push({ pathname: '/materials', params: { courseId: a.courseId, upload: '1' } } as any)}>
            <Text style={styles.link}>Upload</Text>
          </Pressable>
        </View>
        {courseMaterials.length ? (
          <View style={{ gap: 10 }}>
            {courseMaterials.slice(0, 4).map((m) => (
              <MaterialCard key={m.id} m={m} showCourse={false} />
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>No materials for {a.courseCode} yet. Upload notes or past questions to study from them here.</Text>
        )}

        {/* Related lectures */}
        <Text style={styles.section}>From your lectures</Text>
        {courseLectures.length ? (
          <View style={{ gap: 10 }}>
            {courseLectures.slice(0, 3).map((l) => (
              <LectureCard key={l.id} lecture={l} showCourse={false} />
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>No processed {a.courseCode} lectures yet.</Text>
        )}

        <Pressable
          style={({ pressed }) => [styles.askBtn, pressed && { opacity: 0.88 }]}
          onPress={() => router.push({ pathname: '/ask', params: { courseId: a.courseId, q: a.title } } as any)}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#7a4f12" />
          <Text style={styles.askText}>Ask about this {meta.label.toLowerCase()}</Text>
        </Pressable>
      </ScrollView>

      <ConfirmSheet
        visible={confirmDelete}
        title={`Delete this ${meta.label.toLowerCase()}?`}
        message="Its checklist and reminders will be removed."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          planner.deleteAssessment(a.id);
          goBack();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },
  topBar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  topActions: { flexDirection: 'row', gap: 20 },
  scroll: { padding: 20, paddingTop: 4, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  hero: { backgroundColor: UI.ink, borderRadius: 22, padding: 22, gap: 4 },
  heroEyebrow: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, letterSpacing: 1.2, color: '#e9c349' },
  heroTitle: { fontFamily: ZuriFonts.headlineLg, fontSize: 26, lineHeight: 32, color: '#fff', marginTop: 4, marginBottom: 8 },
  facts: { flexDirection: 'row', marginBottom: 6 },
  dueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dueText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 12 },
  heroMeta: { fontFamily: ZuriFonts.bodyRegular, fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  venueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  section: { fontFamily: ZuriFonts.headlineMd, fontSize: 19, color: UI.ink, marginTop: 26, marginBottom: 10 },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  count: { fontFamily: ZuriFonts.labelSmBold, fontSize: 12, color: UI.muted },
  link: { fontFamily: ZuriFonts.labelSmBold, fontSize: 13, color: UI.amber },
  body: { fontFamily: ZuriFonts.bodyRegular, fontSize: 15, lineHeight: 22, color: UI.inkSoft },
  muted: { fontFamily: ZuriFonts.bodyRegular, fontSize: 14, lineHeight: 20, color: UI.muted },
  card: { backgroundColor: UI.card, borderRadius: 16, borderWidth: 1, borderColor: UI.border, paddingHorizontal: 14, paddingVertical: 4 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: UI.borderSoft },
  stepText: { flex: 1, fontFamily: ZuriFonts.bodyRegular, fontSize: 15, color: UI.ink },
  stepDone: { color: UI.muted, textDecorationLine: 'line-through' },
  addStepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  addStepInput: { flex: 1, height: 40, fontFamily: ZuriFonts.bodyRegular, fontSize: 15, color: UI.ink },
  doneBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: UI.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  doneBtnOn: { backgroundColor: UI.card, borderWidth: 1, borderColor: UI.border },
  doneText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 14, color: '#fff' },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: UI.borderSoft },
  planDate: { fontFamily: ZuriFonts.bodyMedium, fontSize: 14, color: UI.ink },
  planMins: { fontFamily: ZuriFonts.labelSmBold, fontSize: 13, color: UI.success },
  topicWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topic: { backgroundColor: UI.cardMuted, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  topicText: { fontFamily: ZuriFonts.bodyMedium, fontSize: 13, color: UI.ink },
  gap: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#fff8f6', borderRadius: 12, padding: 12, marginTop: 10 },
  gapText: { flex: 1, fontFamily: ZuriFonts.bodyRegular, fontSize: 13, lineHeight: 19, color: UI.inkSoft },
  askBtn: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: UI.amber,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
  },
  askText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 15, color: '#7a4f12' },
});

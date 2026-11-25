import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, StatusBar, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useAcademic } from '@/context/academic-context';
import { usePlanner, defaultSteps } from '@/context/planner-context';
import { Chip } from '@/components/ui/chip';
import { DateTimeField } from '@/components/ui/date-time-field';
import { ASSESSMENT_KINDS, type AssessmentKind } from '@/types/planner';

/** Add a new assignment/test/exam/project, or edit one (?id=). */
export default function EditAssessmentScreen() {
  const params = useLocalSearchParams<{ id?: string; courseId?: string; kind?: string }>();
  const { state } = useAcademic();
  const { getAssessment, addAssessment, updateAssessment } = usePlanner();
  const existing = params.id ? getAssessment(params.id) : undefined;

  const defaultDue = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 0, 0);
    return d;
  };

  const [kind, setKind] = useState<AssessmentKind>(
    existing?.kind ?? (ASSESSMENT_KINDS.some((k) => k.key === params.kind) ? (params.kind as AssessmentKind) : 'assignment')
  );
  const [courseId, setCourseId] = useState(existing?.courseId ?? params.courseId ?? state.courses[0]?.id ?? '');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [due, setDue] = useState<Date>(existing ? new Date(existing.dueAt) : defaultDue());
  const [venue, setVenue] = useState(existing?.venue ?? '');
  const [weight, setWeight] = useState(existing?.weight ? String(existing.weight) : '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState('');

  const isTimed = kind === 'exam' || kind === 'test';
  const course = state.courses.find((c) => c.id === courseId);

  const save = () => {
    if (!course) return setError('Choose a course.');
    if (!title.trim()) return setError('Give it a title.');
    const data = {
      kind,
      courseId: course.id,
      courseCode: course.code,
      title: title.trim(),
      dueAt: due.toISOString(),
      venue: isTimed ? venue.trim() || undefined : undefined,
      weight: weight ? Math.max(0, Math.min(100, parseInt(weight, 10) || 0)) || undefined : undefined,
      notes: notes.trim() || undefined,
    };
    if (existing) {
      updateAssessment(existing.id, {
        ...data,
        // Changing the type swaps in that type's checklist if none was ticked yet.
        steps: existing.kind !== kind && !existing.steps.some((s) => s.done) ? defaultSteps(kind) : existing.steps,
      });
      router.back();
    } else {
      const id = addAssessment(data);
      router.replace(`/assessment/${id}` as Href);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Cancel">
          <Ionicons name="close" size={24} color={UI.ink} />
        </Pressable>
        <Text style={styles.topTitle}>{existing ? 'Edit' : 'New deadline'}</Text>
        <Pressable onPress={save} hitSlop={10} accessibilityRole="button">
          <Text style={styles.save}>Save</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>TYPE</Text>
          <View style={styles.wrap}>
            {ASSESSMENT_KINDS.map((k) => (
              <Chip key={k.key} label={k.label} icon={k.icon} on={kind === k.key} onPress={() => setKind(k.key)} />
            ))}
          </View>

          <Text style={styles.label}>COURSE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {state.courses.map((c) => (
              <Chip key={c.id} label={c.code} on={courseId === c.id} onPress={() => setCourseId(c.id)} />
            ))}
          </ScrollView>

          <Text style={styles.label}>TITLE</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              setError('');
            }}
            placeholder={isTimed ? 'e.g. Mid-semester exam' : 'e.g. Linked list implementation'}
            placeholderTextColor={UI.muted}
          />

          <Text style={styles.label}>{isTimed ? 'DATE & START TIME' : 'DUE'}</Text>
          <DateTimeField value={due} onChange={setDue} />

          {isTimed && (
            <>
              <Text style={styles.label}>VENUE</Text>
              <TextInput
                style={styles.input}
                value={venue}
                onChangeText={setVenue}
                placeholder="e.g. Auditorium 1"
                placeholderTextColor={UI.muted}
              />
            </>
          )}

          <Text style={styles.label}>WEIGHT (% OF FINAL GRADE, OPTIONAL)</Text>
          <TextInput
            style={[styles.input, { width: 120 }]}
            value={weight}
            onChangeText={(t) => setWeight(t.replace(/[^0-9]/g, '').slice(0, 3))}
            keyboardType="number-pad"
            placeholder="e.g. 15"
            placeholderTextColor={UI.muted}
          />

          <Text style={styles.label}>NOTES</Text>
          <TextInput
            style={[styles.input, styles.notes]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Instructions, topics covered, submission link…"
            placeholderTextColor={UI.muted}
            multiline
            textAlignVertical="top"
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={({ pressed }) => [styles.primary, pressed && { opacity: 0.88 }]} onPress={save}>
            <Text style={styles.primaryText}>{existing ? 'Save changes' : `Add ${ASSESSMENT_KINDS.find((k) => k.key === kind)?.label.toLowerCase()}`}</Text>
          </Pressable>
          {!existing && (
            <Text style={styles.hint}>A preparation checklist and study sessions are added automatically. You can edit both later.</Text>
          )}
        </KeyboardAwareScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: UI.borderSoft,
  },
  topTitle: { fontFamily: ZuriFonts.labelSmBold, fontSize: 15, color: UI.ink },
  save: { fontFamily: ZuriFonts.labelSmBold, fontSize: 15, color: UI.amber },
  scroll: { padding: 20, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  label: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, letterSpacing: 1.2, color: UI.muted, marginTop: 20, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.card,
    paddingHorizontal: 14,
    fontFamily: ZuriFonts.bodyRegular,
    fontSize: 15,
    color: UI.ink,
  },
  notes: { height: 110, paddingTop: 12 },
  error: { fontFamily: ZuriFonts.bodyMedium, fontSize: 14, color: UI.error, marginTop: 14 },
  primary: {
    height: 54,
    borderRadius: 27,
    backgroundColor: UI.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  primaryText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 15, color: '#fff' },
  hint: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted, textAlign: 'center', marginTop: 10 },
});

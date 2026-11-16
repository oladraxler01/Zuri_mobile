import React, { useState } from 'react';
import { Text, TextInput, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useLecturer } from '@/context/lecturer-context';
import { ScreenShell } from '@/components/dashboard';
import { Chip } from '@/components/ui/chip';
import { DateTimeField } from '@/components/ui/date-time-field';
import { ASSESSMENT_KINDS, type AssessmentKind } from '@/types/planner';

/** Create an assessment for a course; students receive it on their Plan once delivered. */
export default function CreateAssessmentScreen() {
  const params = useLocalSearchParams<{ courseId?: string }>();
  const { courses, addAssessment } = useLecturer();
  const [courseId, setCourseId] = useState(params.courseId ?? courses[0]?.id ?? '');
  const [kind, setKind] = useState<AssessmentKind>('assignment');
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 0, 0);
    return d;
  });
  const [venue, setVenue] = useState('');
  const [weight, setWeight] = useState('');
  const [instructions, setInstructions] = useState('');
  const [error, setError] = useState('');
  const timed = kind === 'exam' || kind === 'test';

  const save = () => {
    if (!courseId) return setError('Choose a course.');
    if (!title.trim()) return setError('Give it a title.');
    addAssessment({
      courseId,
      kind,
      title: title.trim(),
      dueAt: due.toISOString(),
      venue: timed ? venue.trim() || undefined : undefined,
      weight: parseInt(weight, 10) || undefined,
      instructions: instructions.trim() || undefined,
    });
    router.back();
  };

  return (
    <ScreenShell back eyebrow="CREATE ASSESSMENT" title="New assessment" edges={['top', 'bottom']}>
      <View>
        <Text style={styles.label}>COURSE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {courses.map((c) => (
            <Chip key={c.id} label={c.code} on={c.id === courseId} onPress={() => setCourseId(c.id)} />
          ))}
        </ScrollView>
        <Text style={styles.label}>TYPE</Text>
        <View style={styles.wrap}>
          {ASSESSMENT_KINDS.map((k) => (
            <Chip key={k.key} label={k.label} icon={k.icon} on={kind === k.key} onPress={() => setKind(k.key)} />
          ))}
        </View>
        <Text style={styles.label}>TITLE</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Recursion problem set" placeholderTextColor={UI.muted} />
        <Text style={styles.label}>{timed ? 'DATE & START TIME' : 'DUE'}</Text>
        <DateTimeField value={due} onChange={setDue} />
        {timed && (
          <>
            <Text style={styles.label}>VENUE</Text>
            <TextInput style={styles.input} value={venue} onChangeText={setVenue} placeholder="e.g. Auditorium 1" placeholderTextColor={UI.muted} />
          </>
        )}
        <Text style={styles.label}>WEIGHT (% OF FINAL GRADE)</Text>
        <TextInput
          style={[styles.input, { width: 120 }]}
          value={weight}
          onChangeText={(t) => setWeight(t.replace(/\D/g, '').slice(0, 3))}
          keyboardType="number-pad"
          placeholder="e.g. 10"
          placeholderTextColor={UI.muted}
        />
        <Text style={styles.label}>INSTRUCTIONS FOR STUDENTS</Text>
        <TextInput
          style={[styles.input, { height: 110, paddingTop: 12 }]}
          value={instructions}
          onChangeText={setInstructions}
          multiline
          textAlignVertical="top"
          placeholder="What to submit, format, how it's marked…"
          placeholderTextColor={UI.muted}
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Pressable style={styles.primary} onPress={save}>
          <Text style={styles.primaryText}>Create assessment</Text>
        </Pressable>
        <Text style={styles.note}>Students get it on their Plan with reminders once their app is connected to yours.</Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, letterSpacing: 1.2, color: UI.muted, marginTop: 18, marginBottom: 8 },
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
  error: { fontFamily: ZuriFonts.bodyMedium, fontSize: 14, color: UI.error, marginTop: 14 },
  primary: { height: 54, borderRadius: 27, backgroundColor: UI.ink, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  primaryText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 15, color: '#fff' },
  note: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted, textAlign: 'center', marginTop: 10 },
});

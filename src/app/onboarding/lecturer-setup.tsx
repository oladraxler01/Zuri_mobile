import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StatusBar, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLecturer, type TaughtCourse } from '@/context/lecturer-context';
import { useSession } from '@/context/session-context';
import { Chip } from '@/components/ui/chip';
import { StateView } from '@/components/states/state-view';
import type { TimetableSlot } from '@/context/academic-context';
import { makeStyles, useTheme } from '@/theme';

const TITLES = ['Dr.', 'Prof.', 'Engr.', 'Mr.', 'Mrs.', 'Ms.'];
const DAYS: TimetableSlot['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Lecturer onboarding: profile → courses taught → done. */
export default function LecturerSetupScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const lecturer = useLecturer();
  const { setRole } = useSession();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState('');

  // Step 1
  const [title, setTitle] = useState(lecturer.profile.title || 'Dr.');
  const [fullName, setFullName] = useState(lecturer.profile.fullName);
  const [staffId, setStaffId] = useState(lecturer.profile.staffId);
  const [department, setDepartment] = useState(lecturer.profile.department);

  // Step 2
  const [courses, setCourses] = useState<TaughtCourse[]>(lecturer.courses);
  const [adding, setAdding] = useState(false);
  const [nc, setNc] = useState({ code: '', title: '', level: '200L', cohort: '', day: 'Mon' as TimetableSlot['day'], start: '09:00 AM', end: '11:00 AM', venue: '' });

  const next = () => {
    setError('');
    if (step === 1) {
      if (!fullName.trim()) return setError('Enter your name as students know it.');
      if (!department.trim()) return setError('Enter your department.');
      lecturer.updateProfile({ title, fullName: fullName.trim(), staffId: staffId.trim(), department: department.trim() });
      setStep(2);
    } else if (step === 2) {
      if (!courses.length) return setError('Add at least one course you teach.');
      lecturer.setCourses(courses);
      setStep(3);
    }
  };

  const addCourse = () => {
    if (!nc.code.trim() || !nc.title.trim()) return setError('Course code and title are required.');
    setCourses((cs) => [
      ...cs,
      {
        id: `lc_${Date.now().toString(36)}`,
        code: nc.code.trim().toUpperCase(),
        title: nc.title.trim(),
        level: nc.level,
        cohortSize: parseInt(nc.cohort, 10) || 0,
        slots: nc.venue.trim()
          ? [{ id: `t_${Date.now().toString(36)}`, day: nc.day, startTime: nc.start, endTime: nc.end, venue: nc.venue.trim() }]
          : [],
      },
    ]);
    setNc({ ...nc, code: '', title: '', cohort: '', venue: '' });
    setAdding(false);
    setError('');
  };

  const finish = () => {
    lecturer.updateProfile({ onboarded: true });
    setRole('lecturer');
    router.replace('/lecturer' as Href);
  };

  if (step === 3) {
    const slots = courses.reduce((n, c) => n + c.slots.length, 0);
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}>
        <StateView
          tone="success"
          icon="checkmark"
          title={`You’re set up, ${title} ${fullName.split(' ').slice(-1)[0]}`}
          message={`${courses.length} ${courses.length === 1 ? 'course' : 'courses'} and ${slots} weekly ${slots === 1 ? 'class' : 'classes'} added. Record a lecture and your students get its transcript, notes and questions; you see how the class is doing.`}
          primary={{ label: 'Open my dashboard', icon: 'arrow-forward', onPress: finish }}
        >
          {!staffId.trim() && (
            <Text style={styles.verifyNote}>Add your staff ID in Profile to get verified by your university.</Text>
          )}
        </StateView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <Pressable
          onPress={() => (step === 1 ? router.back() : setStep(1))}
          hitSlop={10}
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.stepText}>Step {step} of 2</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.progress}>
        <View style={[styles.progressFill, { width: step === 1 ? '50%' : '100%' }]} />
      </View>

      <View style={{ flex: 1 }}>
        <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {step === 1 ? (
            <>
              <Text style={styles.h1}>Your teaching profile</Text>
              <Text style={styles.lead}>This is how students and your department will see you.</Text>

              <Text style={styles.label}>TITLE</Text>
              <View style={styles.wrap}>
                {TITLES.map((t) => (
                  <Chip key={t} label={t} on={title === t} onPress={() => setTitle(t)} />
                ))}
              </View>
              <Text style={styles.label}>FULL NAME</Text>
              <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="e.g. Folake Adeyemi" placeholderTextColor={colors['text-subtle']} />
              <Text style={styles.label}>DEPARTMENT</Text>
              <TextInput style={styles.input} value={department} onChangeText={setDepartment} placeholder="e.g. Computer Science" placeholderTextColor={colors['text-subtle']} />
              <Text style={styles.label}>STAFF ID (FOR VERIFICATION)</Text>
              <TextInput
                style={styles.input}
                value={staffId}
                onChangeText={setStaffId}
                placeholder="e.g. VU/STF/1042"
                placeholderTextColor={colors['text-subtle']}
                autoCapitalize="characters"
              />
              <Text style={styles.hint}>Your university confirms this before your courses go live to students.</Text>
            </>
          ) : (
            <>
              <Text style={styles.h1}>Courses you teach</Text>
              <Text style={styles.lead}>Add each course with its class size and weekly lecture time.</Text>

              <View style={{ gap: 10, marginTop: 16 }}>
                {courses.map((c) => (
                  <View key={c.id} style={styles.courseCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.courseCode}>
                        {c.code} · {c.level}
                      </Text>
                      <Text style={styles.courseTitle}>{c.title}</Text>
                      <Text style={styles.courseMeta}>
                        {c.cohortSize ? `${c.cohortSize} students` : 'Class size not set'}
                        {c.slots.length ? ` · ${c.slots.map((s) => `${s.day} ${s.startTime}`).join(', ')}` : ''}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setCourses((cs) => cs.filter((x) => x.id !== c.id))}
                      hitSlop={10}
                      accessibilityLabel={`Remove ${c.code}`}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors['text-muted']} />
                    </Pressable>
                  </View>
                ))}
              </View>

              {adding ? (
                <View style={styles.addCard}>
                  <View style={styles.row2}>
                    <TextInput style={[styles.input, { flex: 0.8 }]} value={nc.code} onChangeText={(v) => setNc({ ...nc, code: v })} placeholder="Code e.g. CSC 305" placeholderTextColor={colors['text-subtle']} autoCapitalize="characters" />
                    <TextInput style={[styles.input, { flex: 0.6 }]} value={nc.cohort} onChangeText={(v) => setNc({ ...nc, cohort: v.replace(/\D/g, '') })} placeholder="Students" placeholderTextColor={colors['text-subtle']} keyboardType="number-pad" />
                  </View>
                  <TextInput style={styles.input} value={nc.title} onChangeText={(v) => setNc({ ...nc, title: v })} placeholder="Course title" placeholderTextColor={colors['text-subtle']} />
                  <View style={styles.wrap}>
                    {['100L', '200L', '300L', '400L', '500L'].map((l) => (
                      <Chip key={l} label={l} on={nc.level === l} onPress={() => setNc({ ...nc, level: l })} />
                    ))}
                  </View>
                  <Text style={styles.subLabel}>WEEKLY LECTURE (OPTIONAL)</Text>
                  <View style={styles.wrap}>
                    {DAYS.map((d) => (
                      <Chip key={d} label={d} on={nc.day === d} onPress={() => setNc({ ...nc, day: d })} />
                    ))}
                  </View>
                  <View style={styles.row2}>
                    <TextInput style={[styles.input, { flex: 1 }]} value={nc.start} onChangeText={(v) => setNc({ ...nc, start: v })} placeholder="09:00 AM" placeholderTextColor={colors['text-subtle']} />
                    <TextInput style={[styles.input, { flex: 1 }]} value={nc.end} onChangeText={(v) => setNc({ ...nc, end: v })} placeholder="11:00 AM" placeholderTextColor={colors['text-subtle']} />
                  </View>
                  <TextInput style={styles.input} value={nc.venue} onChangeText={(v) => setNc({ ...nc, venue: v })} placeholder="Venue e.g. LT B" placeholderTextColor={colors['text-subtle']} />
                  <View style={styles.row2}>
                    <Pressable style={[styles.secondary, { flex: 1 }]} onPress={() => setAdding(false)}>
                      <Text style={styles.secondaryText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={[styles.primarySm, { flex: 1 }]} onPress={addCourse}>
                      <Text style={styles.primaryText}>Add course</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable style={styles.addBtn} onPress={() => setAdding(true)}>
                  <Ionicons name="add" size={18} color={colors.text} />
                  <Text style={styles.addText}>Add a course</Text>
                </Pressable>
              )}
            </>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={({ pressed }) => [styles.primary, pressed && { opacity: 0.88 }]} onPress={next}>
            <Text style={styles.primaryText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={colors['on-primary']} />
          </Pressable>
        </KeyboardAwareScrollView>
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.surface },
  topBar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  stepText: { ...t.type.subhead, color: t.colors['text-subtle'] },
  progress: { height: 3, backgroundColor: t.colors['surface-sunken'], marginHorizontal: 20, borderRadius: t.radius.full },
  progressFill: { height: '100%', backgroundColor: t.colors.accent, borderRadius: t.radius.sm },
  scroll: { padding: 20, paddingBottom: 48, maxWidth: 560, width: '100%', alignSelf: 'center' },
  h1: { ...t.type['title-1'], color: t.colors.text, marginTop: 8 },
  lead: { ...t.type.callout, color: t.colors['text-muted'], marginTop: 6 },
  label: { ...t.type.eyebrow, color: t.colors['text-subtle'], marginTop: 20, marginBottom: 8 },
  subLabel: { ...t.type.eyebrow, color: t.colors['text-subtle'], marginTop: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { ...t.type.callout, height: 50,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors['surface-raised'],
    paddingHorizontal: 14,
    color: t.colors.text,
  },
  hint: { ...t.type.caption, color: t.colors['text-subtle'], marginTop: 6 },
  courseCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.colors['surface-raised'], borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, padding: 14 },
  courseCode: { ...t.type.caption, letterSpacing: 0.8, color: t.colors['accent-text'] },
  courseTitle: { ...t.type.subhead, color: t.colors.text, marginTop: 2 },
  courseMeta: { ...t.type.caption, color: t.colors['text-subtle'], marginTop: 2 },
  addCard: { gap: 10, backgroundColor: t.colors['surface-raised'], borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, padding: 14, marginTop: 12 },
  row2: { flexDirection: 'row', gap: 10 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: t.radius.full,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.colors.border,
    marginTop: 12,
  },
  addText: { ...t.type.subhead, color: t.colors.text },
  error: { ...t.type.subhead, color: t.colors.danger, marginTop: 14 },
  primary: {
    height: 54,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
  },
  primarySm: { height: 46, borderRadius: t.radius.full, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { ...t.type.subhead, color: t.colors['on-primary'] },
  secondary: { height: 46, borderRadius: t.radius.full, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { ...t.type.subhead, color: t.colors.text },
  verifyNote: { ...t.type.footnote, color: t.colors['text-subtle'], textAlign: 'center', marginBottom: 16 },
}));

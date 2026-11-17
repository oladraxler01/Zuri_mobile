import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useAcademic } from '@/context/academic-context';
import { ScreenShell, Panel, StatusBadge } from '@/components/dashboard';
import { Chip } from '@/components/ui/chip';
import { FACULTY_OPTIONS } from '@/constants/course-catalogue';
import { looksLikeMatric } from '@/utils/validation';
import { useSession } from '@/context/session-context';
import { updateProfile } from '@/services/auth-api';

const LEVELS = ['100L', '200L', '300L', '400L', '500L'];

/** Edit academic identity: name, matric number (verification), faculty, department, level, semester. */
export default function AcademicProfileScreen() {
  const { state, setAcademicInfo } = useAcademic();
  const [name, setName] = useState(state.studentName);
  const [matric, setMatric] = useState(state.matricNumber);
  const [faculty, setFaculty] = useState(state.faculty);
  const [department, setDepartment] = useState(state.department);
  const [level, setLevel] = useState(state.level);
  const [semester, setSemester] = useState(state.semester);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { user } = useSession();

  const save = async () => {
    if (saving) return;
    if (!name.trim()) return setError('Enter your name.');
    if (matric.trim() && !looksLikeMatric(matric)) return setError('That doesn’t look like a matric number.');
    const matricChanged = matric.trim() !== state.matricNumber;
    setAcademicInfo({
      studentName: name.trim(),
      matricNumber: matric.trim(),
      verification: !matric.trim() ? 'unverified' : matricChanged ? 'pending' : state.verification,
      faculty,
      department: department.trim(),
      level,
      semester,
    });

    // Also save to the Zuri account (PUT /users/me). Matric number, faculty and
    // semester have no server field yet (BACKEND_REQUESTS #13), so they stay on the phone.
    if (user) {
      setSaving(true);
      setError('');
      const [first, ...rest] = name.trim().split(/\s+/);
      try {
        await updateProfile({
          first_name: first,
          last_name: rest.join(' '),
          school: state.university,
          department: department.trim(),
          academic_level: level,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      } catch (e) {
        setSaving(false);
        return setError(
          `Saved on this phone, but not to your account: ${e instanceof Error ? e.message : 'please try again.'}`
        );
      }
      setSaving(false);
    }
    router.back();
  };

  return (
    <ScreenShell back eyebrow="PROFILE" title="Academic profile" edges={['top', 'bottom']}>
      <Panel>
        <Field label="FULL NAME" value={name} onChange={setName} />
        <Text style={styles.label}>MATRIC NUMBER</Text>
        <TextInput style={styles.input} value={matric} onChangeText={(v) => setMatric(v.toUpperCase())} autoCapitalize="characters" placeholder="e.g. VUG/CSC/21/1234" placeholderTextColor={UI.muted} />
        <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
          <StatusBadge
            status={state.verification === 'verified' ? 'good' : state.verification === 'pending' ? 'warning' : 'critical'}
            label={state.verification === 'verified' ? 'Verified' : state.verification === 'pending' ? 'Verification pending' : 'Not verified'}
          />
        </View>
        <Text style={styles.hint}>Your university confirms the matric number once your account is connected to its records.</Text>
      </Panel>

      <Panel>
        <Text style={[styles.label, { marginTop: 0 }]}>UNIVERSITY</Text>
        <Text style={styles.value}>{state.university}</Text>
        <Text style={styles.label}>FACULTY</Text>
        <View style={styles.wrap}>
          {FACULTY_OPTIONS.map((f) => (
            <Chip key={f} label={f.replace('Faculty of ', '')} on={faculty === f} onPress={() => setFaculty(f)} />
          ))}
        </View>
        <Field label="DEPARTMENT" value={department} onChange={setDepartment} />
        <Text style={styles.label}>LEVEL</Text>
        <View style={styles.wrap}>
          {LEVELS.map((l) => (
            <Chip key={l} label={l} on={level === l} onPress={() => setLevel(l)} />
          ))}
        </View>
        <Text style={styles.label}>SEMESTER</Text>
        <View style={styles.wrap}>
          {(['First Semester', 'Second Semester'] as const).map((s) => (
            <Chip key={s} label={s} on={semester === s} onPress={() => setSemester(s)} />
          ))}
        </View>
      </Panel>

      {!!error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={[styles.primary, saving && { opacity: 0.7 }]} onPress={save} disabled={saving}>
        <Ionicons name={saving ? 'sync' : 'checkmark'} size={18} color="#fff" />
        <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Save changes'}</Text>
      </Pressable>
    </ScreenShell>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChange} placeholderTextColor={UI.muted} />
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, letterSpacing: 1.2, color: UI.muted, marginTop: 14, marginBottom: 8 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: UI.border, backgroundColor: UI.bg, paddingHorizontal: 14, fontFamily: ZuriFonts.bodyRegular, fontSize: 15, color: UI.ink },
  value: { fontFamily: ZuriFonts.bodyMedium, fontSize: 15, color: UI.ink },
  hint: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  error: { fontFamily: ZuriFonts.bodyMedium, fontSize: 14, color: UI.error },
  primary: { height: 52, borderRadius: 26, backgroundColor: UI.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 15, color: '#fff' },
});

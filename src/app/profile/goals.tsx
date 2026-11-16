import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { useAcademic } from '@/context/academic-context';
import { ScreenShell, Panel } from '@/components/dashboard';
import { Chip } from '@/components/ui/chip';

const GPA_TARGETS = ['4.50+ (First Class)', '3.50–4.49 (Second Class Upper)', '2.40–3.49 (Second Class Lower)', 'Just pass every course'];

/** Goals: target GPA, weekly study hours and the student's own semester goals. */
export default function GoalsScreen() {
  const { state, updatePreferences, setAcademicInfo } = useAcademic();
  const p = state.preferences;
  const [text, setText] = useState('');

  const add = () => {
    if (!text.trim()) return;
    setAcademicInfo({ goals: [...state.goals, { id: `g_${Date.now().toString(36)}`, text: text.trim(), done: false }] });
    setText('');
  };
  const toggle = (id: string) => setAcademicInfo({ goals: state.goals.map((g) => (g.id === id ? { ...g, done: !g.done } : g)) });
  const remove = (id: string) => setAcademicInfo({ goals: state.goals.filter((g) => g.id !== id) });

  return (
    <ScreenShell back eyebrow="PROFILE" title="Goals" edges={['top', 'bottom']}>
      <Panel title="Target result">
        <View style={styles.wrap}>
          {GPA_TARGETS.map((g) => (
            <Chip key={g} label={g} on={p.targetGpa === g} onPress={() => updatePreferences({ targetGpa: g })} />
          ))}
        </View>
      </Panel>

      <Panel title="Weekly study time" subtitle="Your study plan spreads sessions within this">
        <View style={styles.stepper}>
          <Pressable style={styles.step} onPress={() => updatePreferences({ weeklyStudyHours: Math.max(2, p.weeklyStudyHours - 2) })} accessibilityLabel="Less">
            <Ionicons name="remove" size={20} color={UI.ink} />
          </Pressable>
          <Text style={styles.hours}>{p.weeklyStudyHours} h</Text>
          <Pressable style={styles.step} onPress={() => updatePreferences({ weeklyStudyHours: Math.min(40, p.weeklyStudyHours + 2) })} accessibilityLabel="More">
            <Ionicons name="add" size={20} color={UI.ink} />
          </Pressable>
        </View>
        <Text style={styles.muted}>About {Math.round((p.weeklyStudyHours * 60) / 7)} minutes a day.</Text>
      </Panel>

      <Panel title="Semester goals" subtitle={`${state.goals.filter((g) => g.done).length} of ${state.goals.length} done`}>
        {state.goals.map((g) => (
          <View key={g.id} style={styles.goal}>
            <Pressable onPress={() => toggle(g.id)} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: g.done }}>
              <Ionicons name={g.done ? 'checkbox' : 'square-outline'} size={22} color={g.done ? UI.success : UI.muted} />
            </Pressable>
            <Text style={[styles.goalText, g.done && styles.goalDone]}>{g.text}</Text>
            <Pressable onPress={() => remove(g.id)} hitSlop={8} accessibilityLabel="Remove goal">
              <Ionicons name="close" size={18} color={UI.muted} />
            </Pressable>
          </View>
        ))}
        <View style={styles.addRow}>
          <TextInput style={styles.input} value={text} onChangeText={setText} onSubmitEditing={add} placeholder="e.g. Finish every lecture quiz the same day" placeholderTextColor={UI.muted} returnKeyType="done" />
          <Pressable style={[styles.addBtn, !text.trim() && { opacity: 0.4 }]} disabled={!text.trim()} onPress={add} accessibilityLabel="Add goal">
            <Ionicons name="add" size={20} color="#fff" />
          </Pressable>
        </View>
      </Panel>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 6 },
  step: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: UI.border, alignItems: 'center', justifyContent: 'center' },
  hours: { fontFamily: LexiFonts.headlineLg, fontSize: 30, color: UI.ink, minWidth: 70, textAlign: 'center' },
  muted: { fontFamily: LexiFonts.bodyRegular, fontSize: 13, color: UI.muted },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: UI.borderSoft },
  goalText: { flex: 1, fontFamily: LexiFonts.bodyRegular, fontSize: 15, color: UI.ink },
  goalDone: { color: UI.muted, textDecorationLine: 'line-through' },
  addRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  input: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: UI.border, backgroundColor: UI.bg, paddingHorizontal: 14, fontFamily: LexiFonts.bodyRegular, fontSize: 14, color: UI.ink },
  addBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: UI.ink, alignItems: 'center', justifyContent: 'center' },
});

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useAcademic } from '@/context/academic-context';
import { ScreenShell, Panel } from '@/components/dashboard';
import { Chip } from '@/components/ui/chip';
import { useSession } from '@/context/session-context';
import { completeGoal, createGoal, deleteGoal, listGoals } from '@/services/progress-api';

const GPA_TARGETS = ['4.50+ (First Class)', '3.50–4.49 (Second Class Upper)', '2.40–3.49 (Second Class Lower)', 'Just pass every course'];

/** Goals: target GPA, weekly study hours and the student's own semester goals. */
export default function GoalsScreen() {
  const { state, updatePreferences, setAcademicInfo } = useAcademic();
  const p = state.preferences;
  const [text, setText] = useState('');
  const [syncNote, setSyncNote] = useState('');
  const { user } = useSession();
  const goalsRef = useRef(state.goals);
  goalsRef.current = state.goals;

  // Goals live in the account too (/analytics/goals): pull them in, and push any made offline.
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const server = await listGoals();
        let goals = [...goalsRef.current];
        const known = new Set(goals.map((g) => g.serverId).filter(Boolean));
        server
          .filter((s) => !known.has(s.id))
          .forEach((s) => goals.push({ id: `g_${s.id}`, serverId: s.id, text: s.title, done: s.is_completed }));
        goals = goals.map((g) => {
          const s = server.find((x) => x.id === g.serverId);
          return s && s.is_completed && !g.done ? { ...g, done: true } : g;
        });
        for (const g of goals.filter((x) => !x.serverId)) {
          const created = await createGoal(g.text);
          if (g.done) await completeGoal(created.id).catch(() => {});
          goals = goals.map((x) => (x.id === g.id ? { ...x, serverId: created.id } : x));
        }
        setAcademicInfo({ goals });
        setSyncNote('');
      } catch (e) {
        setSyncNote('Couldn’t sync your goals with your account right now.');
      }
    })();
  }, [user]);

  const add = async () => {
    if (!text.trim()) return;
    const goal = { id: `g_${Date.now().toString(36)}`, text: text.trim(), done: false };
    setAcademicInfo({ goals: [...state.goals, goal] });
    setText('');
    if (user) {
      try {
        const created = await createGoal(goal.text);
        setAcademicInfo({ goals: goalsRef.current.map((g) => (g.id === goal.id ? { ...g, serverId: created.id } : g)) });
      } catch {
        setSyncNote('Saved on this phone. It will be added to your account next time.');
      }
    }
  };
  const toggle = (id: string) => {
    const g = state.goals.find((x) => x.id === id);
    setAcademicInfo({ goals: state.goals.map((x) => (x.id === id ? { ...x, done: !x.done } : x)) });
    // The account can mark a goal complete but not undo it.
    if (user && g?.serverId && !g.done) completeGoal(g.serverId).catch(() => setSyncNote('Couldn’t update your account right now.'));
  };
  const remove = (id: string) => {
    const g = state.goals.find((x) => x.id === id);
    setAcademicInfo({ goals: state.goals.filter((x) => x.id !== id) });
    if (user && g?.serverId) deleteGoal(g.serverId).catch(() => setSyncNote('Couldn’t remove it from your account right now.'));
  };

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
        {!!syncNote && <Text style={styles.muted}>{syncNote}</Text>}
      </Panel>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 6 },
  step: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: UI.border, alignItems: 'center', justifyContent: 'center' },
  hours: { fontFamily: ZuriFonts.headlineLg, fontSize: 30, color: UI.ink, minWidth: 70, textAlign: 'center' },
  muted: { fontFamily: ZuriFonts.bodyRegular, fontSize: 13, color: UI.muted },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: UI.borderSoft },
  goalText: { flex: 1, fontFamily: ZuriFonts.bodyRegular, fontSize: 15, color: UI.ink },
  goalDone: { color: UI.muted, textDecorationLine: 'line-through' },
  addRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  input: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: UI.border, backgroundColor: UI.bg, paddingHorizontal: 14, fontFamily: ZuriFonts.bodyRegular, fontSize: 14, color: UI.ink },
  addBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: UI.ink, alignItems: 'center', justifyContent: 'center' },
});

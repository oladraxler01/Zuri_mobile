import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { useInstitution, type InstSlot } from '@/context/institution-context';
import { ScreenShell, Panel, Grid, StatTile, BarChart, HBarList, SampleBanner, StatusBadge, Divider } from '@/components/dashboard';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/states/state-view';
import { classInsights } from '@/data/sample-class-insights';

const DAYS: InstSlot['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const toMin = (t: string) => {
  const [h, m] = t.split(':').map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
};

/** Course management for administrators: performance, enrollment, timetable, archive. */
export default function AdminCourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const inst = useInstitution();
  const c = inst.courses.find((x) => x.id === id);
  const [day, setDay] = useState<InstSlot['day']>('Mon');
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('10:00');
  const [venue, setVenue] = useState('');
  const [slotError, setSlotError] = useState('');

  if (!c) {
    return (
      <ScreenShell back title="Course">
        <EmptyState icon="library-outline" title="Course not found" />
      </ScreenShell>
    );
  }
  const i = classInsights(c);
  const slots = inst.slots?.[c.id] ?? [];
  const over = c.enrolled > c.capacity;

  // Another course in the same venue at an overlapping time on the same day.
  const clashesFor = (s: Omit<InstSlot, 'id'>, ignoreId?: string) =>
    inst.courses
      .filter((o) => !o.archived)
      .flatMap((o) => (inst.slots?.[o.id] ?? []).map((sl) => ({ o, sl })))
      .filter(
        ({ o, sl }) =>
          sl.id !== ignoreId &&
          !(o.id === c.id && sl.id === ignoreId) &&
          sl.day === s.day &&
          sl.venue.trim().toLowerCase() === s.venue.trim().toLowerCase() &&
          toMin(sl.start) < toMin(s.end) &&
          toMin(s.start) < toMin(sl.end)
      );

  const addSlot = () => {
    if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || toMin(end) <= toMin(start)) return setSlotError('Use 24-hour times like 08:00 and 10:00, ending after the start.');
    if (!venue.trim()) return setSlotError('Add a venue.');
    const clash = clashesFor({ day, start, end, venue });
    if (clash.length) return setSlotError(`${venue} is already booked by ${clash.map((x) => x.o.code).join(', ')} at that time.`);
    inst.addSlot(c.id, { day, start, end, venue: venue.trim() });
    setVenue('');
    setSlotError('');
  };

  return (
    <ScreenShell back eyebrow={`${c.code} · ${c.department.toUpperCase()}`} title={c.title} edges={['top', 'bottom']}>
      <View style={styles.row}>
        <Text style={styles.lecturer}>{c.lecturer}</Text>
        {c.archived ? <StatusBadge status="warning" label="Archived" /> : c.custom ? <StatusBadge status="good" label="Added by admin" /> : null}
      </View>

      <Grid min={150}>
        <StatTile label="Enrolled" value={`${c.enrolled}`} delta={{ text: `capacity ${c.capacity}`, up: !over }} icon="people-outline" />
        <StatTile label="Lectures captured" value={`${c.lecturesCaptured}`} icon="mic-outline" />
        <StatTile label="Average mastery" value={c.custom ? '—' : `${c.mastery}%`} icon="school-outline" />
        <StatTile label="Active this week" value={c.custom ? '—' : `${c.engagement}%`} icon="pulse-outline" />
      </Grid>

      <Panel title="Enrollment management" subtitle="Adjust after add/drop; the student records sync overwrites this when connected">
        <Stepper label="Enrolled students" value={c.enrolled} onChange={(n) => inst.setEnrollment(c.id, n)} step={5} />
        <Divider />
        <Stepper label="Capacity" value={c.capacity} onChange={(n) => inst.setCapacity(c.id, n)} step={10} />
        {over && (
          <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
            <StatusBadge status="critical" label={`Over capacity by ${c.enrolled - c.capacity}`} />
          </View>
        )}
      </Panel>

      <Panel title="Timetable" subtitle="Weekly class times; clashes with other courses in the same venue are blocked">
        {slots.map((s, k) => (
          <View key={s.id}>
            {k > 0 && <Divider />}
            <View style={styles.slot}>
              <Ionicons name="time-outline" size={18} color={UI.inkSoft} />
              <Text style={styles.slotText}>
                {s.day} {s.start}–{s.end} · {s.venue}
              </Text>
              <Pressable onPress={() => inst.removeSlot(c.id, s.id)} hitSlop={10} accessibilityLabel="Remove class time">
                <Ionicons name="trash-outline" size={17} color={UI.muted} />
              </Pressable>
            </View>
          </View>
        ))}
        {!slots.length && <Text style={styles.muted}>No class times yet.</Text>}
        <View style={styles.addSlot}>
          <View style={styles.wrap}>
            {DAYS.map((d) => (
              <Chip key={d} label={d} on={day === d} onPress={() => setDay(d)} />
            ))}
          </View>
          <View style={styles.inputs}>
            <TextInput style={[styles.input, { width: 80 }]} value={start} onChangeText={setStart} placeholder="08:00" placeholderTextColor={UI.muted} />
            <Text style={styles.muted}>to</Text>
            <TextInput style={[styles.input, { width: 80 }]} value={end} onChangeText={setEnd} placeholder="10:00" placeholderTextColor={UI.muted} />
            <TextInput style={[styles.input, { flex: 1 }]} value={venue} onChangeText={setVenue} placeholder="Venue" placeholderTextColor={UI.muted} />
          </View>
          {!!slotError && <Text style={styles.error}>{slotError}</Text>}
          <Pressable style={styles.btn} onPress={addSlot}>
            <Text style={styles.btnText}>Add class time</Text>
          </Pressable>
        </View>
      </Panel>

      {!c.custom && (
        <Grid min={320}>
          <Panel title="Engagement" subtitle="% of class active each week">
            <BarChart data={i.weeklyEngagement.map((v, k) => ({ label: k === 7 ? 'Now' : `W${k + 1}`, value: v }))} max={100} format={(v) => `${v}%`} label="Weekly engagement" />
          </Panel>
          <Panel title="Topic mastery">
            <HBarList rows={i.topics.map((t) => ({ label: t.topic, value: t.mastery }))} warnBelow={50} />
          </Panel>
        </Grid>
      )}

      <Pressable style={styles.archive} onPress={() => inst.setArchived(c.id, !c.archived)}>
        <Ionicons name={c.archived ? 'refresh' : 'archive-outline'} size={16} color={UI.ink} />
        <Text style={styles.archiveText}>{c.archived ? 'Restore course' : 'Archive course'}</Text>
      </Pressable>
      <SampleBanner text="Sample performance data; enrollment, capacity and timetable changes are saved and logged in the audit trail." />
    </ScreenShell>
  );
}

function Stepper({ label, value, onChange, step }: { label: string; value: number; onChange: (n: number) => void; step: number }) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepLabel}>{label}</Text>
      <Pressable style={styles.stepBtn} onPress={() => onChange(value - step)} accessibilityLabel={`Decrease ${label}`}>
        <Ionicons name="remove" size={18} color={UI.ink} />
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable style={styles.stepBtn} onPress={() => onChange(value + step)} accessibilityLabel={`Increase ${label}`}>
        <Ionicons name="add" size={18} color={UI.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lecturer: { fontFamily: LexiFonts.bodyMedium, fontSize: 15, color: UI.inkSoft },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  stepLabel: { flex: 1, fontFamily: LexiFonts.bodyMedium, fontSize: 15, color: UI.ink },
  stepBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: UI.border, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontFamily: LexiFonts.headlineMd, fontSize: 20, color: UI.ink, minWidth: 48, textAlign: 'center' },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  slotText: { flex: 1, fontFamily: LexiFonts.bodyMedium, fontSize: 14, color: UI.ink },
  muted: { fontFamily: LexiFonts.bodyRegular, fontSize: 13, color: UI.muted },
  addSlot: { gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: UI.borderSoft },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  inputs: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { height: 44, borderRadius: 10, borderWidth: 1, borderColor: UI.border, backgroundColor: UI.bg, paddingHorizontal: 10, fontFamily: LexiFonts.bodyRegular, fontSize: 14, color: UI.ink },
  error: { fontFamily: LexiFonts.bodyMedium, fontSize: 13, color: UI.error },
  btn: { height: 44, borderRadius: 22, backgroundColor: UI.ink, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: LexiFonts.labelSmBold, fontSize: 14, color: '#fff' },
  archive: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 24, borderWidth: 1, borderColor: UI.border },
  archiveText: { fontFamily: LexiFonts.labelSmBold, fontSize: 14, color: UI.ink },
});

import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Chip, Text, TextField, makeStyles } from '@/theme';
import type { CourseItem, TimetableSlot } from '@/context/academic-context';
import { useFlag } from '@/services/feature-flags';
import { createTimetableException, deleteTimetableException } from '@/services/academic-api';

const TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const label12 = (t: string) => {
  const h = parseInt(t, 10);
  return `${h % 12 === 0 ? 12 : h % 12}${h >= 12 ? ' PM' : ' AM'}`;
};
const plus2 = (t: string) => `${String((parseInt(t, 10) + 2) % 24).padStart(2, '0')}:00`;

/**
 * Upcoming class: tell Zuri this meeting is cancelled or moved
 * (POST /academic/timetable/exceptions). The server's reminders and "next class"
 * follow it. Only when Zuri sends reminders from the server ("proactive_worker")
 * and the class is on the server. Also links to "Ask classmates" if you missed it.
 */
export function ClassChangeCard({ slot, course, date }: { slot: TimetableSlot; course?: CourseItem; date: Date }) {
  const styles = useStyles();
  const enabled = useFlag('proactive_worker') && !!slot.serverId;
  const [mode, setMode] = useState<'idle' | 'moving'>('idle');
  const [done, setDone] = useState<{ id: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(date);
    d.setDate(d.getDate() + i);
    return d;
  });
  const [newDay, setNewDay] = useState(ymd(date));
  const [newStart, setNewStart] = useState('10:00');
  const [newVenue, setNewVenue] = useState('');

  if (!enabled) return null;

  const send = async (kind: 'cancelled' | 'moved') => {
    setBusy(true);
    setError('');
    try {
      const ex = await createTimetableException({
        kind,
        date: ymd(date),
        slot_id: slot.serverId,
        ...(kind === 'moved'
          ? { new_date: newDay, new_start_time: newStart, new_end_time: plus2(newStart), ...(newVenue.trim() ? { new_venue: newVenue.trim() } : {}) }
          : {}),
      });
      setDone({
        id: ex.id,
        text:
          kind === 'cancelled'
            ? `Marked as cancelled. Zuri won’t remind you about this ${slot.courseCode} class.`
            : `Moved to ${new Date(newDay).toLocaleDateString(undefined, { weekday: 'long' })} at ${label12(newStart)}. Reminders follow the new time.`,
      });
      setMode('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t save that. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const undo = async () => {
    if (!done) return;
    setBusy(true);
    try {
      await deleteTimetableException(done.id);
      setDone(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t undo that.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card eyebrow="CLASS CHANGED?" style={styles.card}>
      {done ? (
        <View style={styles.stack}>
          <Text variant="footnote">{done.text}</Text>
          <Button size="sm" variant="text" label="Undo" loading={busy} onPress={undo} />
        </View>
      ) : mode === 'moving' ? (
        <View style={styles.stack}>
          <Text variant="subhead">New day</Text>
          <View style={styles.chips}>
            {days.map((d) => (
              <Chip
                key={ymd(d)}
                label={d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                selected={newDay === ymd(d)}
                role="radio"
                onPress={() => setNewDay(ymd(d))}
              />
            ))}
          </View>
          <Text variant="subhead">New start time</Text>
          <View style={styles.chips}>
            {TIMES.map((t) => (
              <Chip key={t} label={label12(t)} selected={newStart === t} role="radio" onPress={() => setNewStart(t)} />
            ))}
          </View>
          <TextField label="New venue (optional)" value={newVenue} onChangeText={setNewVenue} placeholder={slot.venue || 'e.g. LT B'} />
          <View style={styles.row}>
            <Button size="sm" label="Save new time" loading={busy} onPress={() => send('moved')} />
            <Button size="sm" variant="text" label="Cancel" onPress={() => setMode('idle')} />
          </View>
        </View>
      ) : (
        <View style={styles.stack}>
          <Text variant="footnote" color="text-muted">
            Tell Zuri if this {slot.courseCode} class isn’t holding as usual, so reminders stay right.
          </Text>
          <View style={styles.row}>
            <Button size="sm" variant="secondary" icon="close-circle-outline" label="Cancelled" loading={busy} onPress={() => send('cancelled')} />
            <Button size="sm" variant="secondary" icon="swap-horizontal-outline" label="Moved" onPress={() => setMode('moving')} />
          </View>
          <Button
            size="sm"
            variant="text"
            icon="people-outline"
            label="Missed it? Ask classmates"
            onPress={() => router.push({ pathname: '/classmates/new', params: { courseId: course?.id ?? '' } } as any)}
          />
        </View>
      )}
      {!!error && (
        <Text variant="footnote" color="danger">
          {error}
        </Text>
      )}
    </Card>
  );
}

const useStyles = makeStyles(({ space }) => ({
  card: { marginTop: space[4] },
  stack: { gap: space[3] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
}));

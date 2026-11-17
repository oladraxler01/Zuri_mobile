import React, { useEffect, useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chip, Text, makeStyles, useTheme } from '@/theme';
import { useSession } from '@/context/session-context';
import { useAcademic, type TimetableSlot } from '@/context/academic-context';
import { getContextGaps, resolveContextGap, type ContextGapDTO } from '@/services/academic-api';

const DAYS: TimetableSlot['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIMES = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];

/** "10:00 AM" + 2 h → "12:00 PM". */
function plusTwoHours(t: string): string {
  const m = t.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/);
  if (!m) return t;
  let h = (Number(m[1]) % 12) + (m[3] === 'PM' ? 12 : 0) + 2;
  h %= 24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${m[2]} ${suffix}`;
}

/**
 * Home: Zuri asks for missing course details it needs (GET /academic/context-gaps):
 * a class's venue (answered here, POST …/resolve) or its day and time (answered by
 * adding the class to the timetable, which syncs to the server). Hidden when nothing is missing.
 */
export function MissingInfoPrompts() {
  const styles = useStyles();
  const { user } = useSession();
  const { state } = useAcademic();
  const [gaps, setGaps] = useState<ContextGapDTO[]>([]);

  useEffect(() => {
    if (!user) return;
    getContextGaps()
      .then((list) => setGaps(list.filter((g) => !g.is_resolved)))
      .catch(() => setGaps([]));
  }, [user]);

  const open = gaps
    .map((g) => ({ gap: g, course: state.courses.find((c) => c.serverId === g.course_id) }))
    // A class-time prompt is already answered once the course has a class on this phone.
    .filter(({ gap, course }) => !(gap.gap_type === 'missing_class_time' && course && state.timetable.some((s) => s.courseId === course.id)))
    .slice(0, 2);
  if (!open.length) return null;

  return (
    <View style={styles.list}>
      {open.map(({ gap, course }) => (
        <GapCard key={gap.id} gap={gap} courseId={course?.id} courseCode={course?.code} onDone={() => setGaps((all) => all.filter((x) => x.id !== gap.id))} />
      ))}
    </View>
  );
}

function GapCard({
  gap,
  courseId,
  courseCode,
  onDone,
}: {
  gap: ContextGapDTO;
  courseId?: string;
  courseCode?: string;
  onDone: () => void;
}) {
  const styles = useStyles();
  const { colors, size } = useTheme();
  const { addTimetableSlot } = useAcademic();
  const [venue, setVenue] = useState('');
  const [day, setDay] = useState<TimetableSlot['day']>('Mon');
  const [start, setStart] = useState('09:00 AM');
  const [classVenue, setClassVenue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isVenue = gap.gap_type === 'missing_venue';

  const saveVenue = async () => {
    if (!venue.trim()) return setError('Type where the class holds.');
    setBusy(true);
    setError('');
    try {
      await resolveContextGap(gap.id, venue.trim());
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t save that. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const saveClass = () => {
    if (!courseId || !courseCode) return setError('Add this course on your Courses page first.');
    addTimetableSlot({ courseId, courseCode, day, startTime: start, endTime: plusTwoHours(start), venue: classVenue.trim() || 'Venue to be confirmed' });
    onDone();
  };

  return (
    <Card>
      <View style={styles.head}>
        <Ionicons name="help-circle-outline" size={size['icon-md']} color={colors['accent-text']} />
        <Text variant="eyebrow" color="accent-text">
          ZURI NEEDS ONE DETAIL
        </Text>
      </View>
      <Text variant="subhead" style={styles.question}>
        {gap.prompt_question}
      </Text>

      {isVenue ? (
        <TextInput
          style={styles.input}
          value={venue}
          onChangeText={setVenue}
          placeholder="e.g. Lecture Theatre B"
          placeholderTextColor={colors['text-subtle']}
          returnKeyType="done"
          onSubmitEditing={saveVenue}
          accessibilityLabel="Venue"
        />
      ) : (
        <View style={styles.form}>
          <View style={styles.chips}>
            {DAYS.map((d) => (
              <Chip key={d} label={d} selected={day === d} role="radio" onPress={() => setDay(d)} />
            ))}
          </View>
          <View style={styles.chips}>
            {TIMES.map((t) => (
              <Chip key={t} label={t.replace(':00', '')} selected={start === t} role="radio" onPress={() => setStart(t)} />
            ))}
          </View>
          <Text variant="caption" color="text-subtle">
            {day}, {start} – {plusTwoHours(start)}
          </Text>
          <TextInput
            style={styles.input}
            value={classVenue}
            onChangeText={setClassVenue}
            placeholder="Venue (optional)"
            placeholderTextColor={colors['text-subtle']}
            accessibilityLabel="Venue"
          />
        </View>
      )}

      {!!error && (
        <Text variant="footnote" color="danger">
          {error}
        </Text>
      )}
      <View style={styles.actions}>
        <Button size="sm" label={isVenue ? 'Save venue' : 'Add class'} loading={busy} onPress={isVenue ? saveVenue : saveClass} />
        <Pressable onPress={onDone} hitSlop={12} style={styles.later} accessibilityRole="button" accessibilityLabel="Ask me later">
          <Text variant="subhead" color="text-muted">
            Later
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

const useStyles = makeStyles(({ colors, space, radius, size, type }) => ({
  list: { gap: space[3], marginVertical: space[3] },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginBottom: space[2] },
  question: { marginBottom: space[3] },
  form: { gap: space[3] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  input: {
    height: size['control-height'],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors['border-strong'],
    backgroundColor: colors['surface-sunken'],
    paddingHorizontal: space[4],
    ...type.body,
    color: colors.text,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space[4], marginTop: space[3] },
  later: { minHeight: size['touch-target'], justifyContent: 'center' },
}));

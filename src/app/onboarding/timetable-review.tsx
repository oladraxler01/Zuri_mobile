import React from 'react';
import { View, Text, Pressable, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAcademic, type TimetableSlot } from '@/context/academic-context';
import { findClashes } from '@/utils/timetable-import';
import { parseTimeOfDay } from '@/utils/time';
import { makeStyles, useTheme } from '@/theme';

const DAYS: TimetableSlot['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAME: Record<TimetableSlot['day'], string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
};

/** Confirm the timetable: grouped by day, with clashes and missing courses flagged. */
export default function TimetableReviewScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { state, removeTimetableSlot } = useAcademic();
  const clashes = findClashes(state.timetable);
  const clashIds = new Set(clashes.flatMap(([a, b]) => [a.id, b.id]));
  const withoutClass = state.courses.filter((c) => !state.timetable.some((s) => s.courseId === c.id));
  const titleFor = (s: TimetableSlot) => state.courses.find((c) => c.id === s.courseId)?.title ?? '';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Back to timetable">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.step}>Review timetable</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Does this look right?</Text>
        <Text style={styles.lead}>
          {state.timetable.length} classes a week across {new Set(state.timetable.map((s) => s.courseId)).size} courses. Reminders
          and your weekly plan use this.
        </Text>

        {clashes.length > 0 && (
          <View style={[styles.alert, styles.alertError]}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.alertText}>
              {clashes.length} {clashes.length === 1 ? 'clash' : 'clashes'}:{' '}
              {clashes.map(([a, b]) => `${a.courseCode} and ${b.courseCode} on ${a.day}`).join('; ')}. Remove the wrong one below.
            </Text>
          </View>
        )}
        {withoutClass.length > 0 && (
          <View style={styles.alert}>
            <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
            <Text style={styles.alertText}>No class time yet for {withoutClass.map((c) => c.code).join(', ')}. Go back to add them, or carry on.</Text>
          </View>
        )}

        {DAYS.map((d) => {
          const slots = state.timetable
            .filter((s) => s.day === d)
            .sort((a, b) => parseTimeOfDay(a.startTime) - parseTimeOfDay(b.startTime));
          if (!slots.length) return null;
          return (
            <View key={d} style={{ marginTop: 18 }}>
              <Text style={styles.day}>{DAY_NAME[d]}</Text>
              <View style={styles.card}>
                {slots.map((s, i) => (
                  <View key={s.id} style={[styles.row, i > 0 && styles.rowBorder, clashIds.has(s.id) && styles.rowClash]}>
                    <View style={{ width: 82 }}>
                      <Text style={styles.time}>{s.startTime}</Text>
                      <Text style={styles.timeEnd}>{s.endTime}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.code}>
                        {s.courseCode}
                        {clashIds.has(s.id) ? '  ·  CLASH' : ''}
                      </Text>
                      <Text style={styles.title} numberOfLines={1}>
                        {titleFor(s)}
                      </Text>
                      <Text style={styles.venue}>{s.venue}</Text>
                    </View>
                    <Pressable onPress={() => removeTimetableSlot(s.id)} hitSlop={10} accessibilityLabel={`Remove ${s.courseCode} on ${d}`}>
                      <Ionicons name="trash-outline" size={18} color={colors['text-muted']} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {state.timetable.length === 0 && (
          <Text style={styles.empty}>No classes yet. Go back to add them, or skip and add them later from your courses.</Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.secondary} onPress={() => router.back()}>
          <Text style={styles.secondaryText}>Edit</Text>
        </Pressable>
        <Pressable style={styles.primary} onPress={() => router.push('/onboarding/student-preferences' as Href)}>
          <Text style={styles.primaryText}>{clashes.length ? 'Continue anyway' : 'Looks good'}</Text>
          <Ionicons name="arrow-forward" size={18} color={colors['on-primary']} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.surface },
  topBar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  step: { ...t.type.subhead, color: t.colors['text-subtle'] },
  scroll: { padding: 20, paddingBottom: 32, maxWidth: 560, width: '100%', alignSelf: 'center' },
  h1: { ...t.type['title-1'], color: t.colors.text },
  lead: { ...t.type.callout, color: t.colors['text-muted'], marginTop: 6 },
  alert: { flexDirection: 'row', gap: 10, backgroundColor: t.colors['warning-container'], borderRadius: t.radius.md, padding: 12, marginTop: 14 },
  alertError: { backgroundColor: t.colors['danger-container'] },
  alertText: { ...t.type.footnote, flex: 1, color: t.colors['text-muted'] },
  day: { ...t.type.caption, letterSpacing: 1, color: t.colors['text-subtle'], marginBottom: 8 },
  card: { backgroundColor: t.colors['surface-raised'], borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: t.colors.border },
  rowClash: { backgroundColor: t.colors['danger-container'], marginHorizontal: -14, paddingHorizontal: 14 },
  time: { ...t.type.subhead, color: t.colors.text },
  timeEnd: { ...t.type.caption, color: t.colors['text-subtle'] },
  code: { ...t.type.caption, letterSpacing: 0.6, color: t.colors['accent-text'] },
  title: { ...t.type.subhead, color: t.colors.text, marginTop: 1 },
  venue: { ...t.type.caption, color: t.colors['text-subtle'], marginTop: 1 },
  empty: { ...t.type.callout, color: t.colors['text-subtle'], marginTop: 24, textAlign: 'center' },
  footer: { flexDirection: 'row', gap: 10, padding: 16, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: t.colors.border },
  secondary: { flex: 0.4, height: 52, borderRadius: t.radius.full, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { ...t.type.subhead, color: t.colors.text },
  primary: { flex: 1, height: 52, borderRadius: t.radius.full, backgroundColor: t.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { ...t.type.subhead, color: t.colors['on-primary'] },
}));

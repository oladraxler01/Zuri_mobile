import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { useAcademic, type TimetableSlot } from '@/context/academic-context';
import { usePlanner } from '@/context/planner-context';
import { Segmented } from '@/components/ui/chip';
import { AssessmentCard, kindMeta, urgencyColor } from '@/components/planner/assessment-card';
import { EmptyState } from '@/components/states/state-view';
import { buildStudyPlan, groupDeadlines, localDateKey, startOfDay, type DeadlineGroup } from '@/utils/planner';
import { formatDuration, parseTimeOfDay } from '@/utils/time';
import type { Assessment, CalendarEvent } from '@/types/planner';

type View_ = 'week' | 'deadlines' | 'calendar';
const JS_DAY_TO_SLOT: Record<number, TimetableSlot['day'] | undefined> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
const DAY_MS = 24 * 60 * 60 * 1000;

function dayLabel(d: Date, today: Date) {
  const diff = Math.round((startOfDay(d).getTime() - startOfDay(today).getTime()) / DAY_MS);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' });
}

function eventOnDay(e: CalendarEvent, key: string) {
  return key >= e.date && key <= (e.endDate ?? e.date);
}

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const { state } = useAcademic();
  const { assessments, calendar } = usePlanner();
  const [view, setView] = useState<View_>('week');

  const today = new Date();
  const plan = useMemo(
    () => buildStudyPlan(assessments, state.preferences.weeklyStudyHours, 7),
    [assessments, state.preferences.weeklyStudyHours]
  );

  const addNew = () => router.push('/assessment/edit' as Href);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Plan</Text>
        <Pressable style={styles.addBtn} onPress={addNew} accessibilityRole="button" accessibilityLabel="Add assignment or exam">
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addText}>Add</Text>
        </Pressable>
      </View>
      <View style={styles.segmentWrap}>
        <Segmented<View_>
          options={[
            { key: 'week', label: 'This week' },
            { key: 'deadlines', label: 'Deadlines' },
            { key: 'calendar', label: 'Calendar' },
          ]}
          value={view}
          onChange={setView}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {view === 'week' && <WeekView plan={plan} today={today} />}
        {view === 'deadlines' && <DeadlinesView items={assessments} onAdd={addNew} />}
        {view === 'calendar' && <CalendarView items={assessments} events={calendar} today={today} />}
      </ScrollView>
    </View>
  );
}

// ─── This week ────────────────────────────────────────────────────

function WeekView({ plan, today }: { plan: ReturnType<typeof buildStudyPlan>; today: Date }) {
  const { state } = useAcademic();
  const { assessments } = usePlanner();
  const days = Array.from({ length: 7 }, (_, i) => new Date(startOfDay(today).getTime() + i * DAY_MS));

  const weekEnd = days[6].getTime() + DAY_MS;
  const dueThisWeek = assessments.filter(
    (a) => a.status !== 'done' && new Date(a.dueAt).getTime() >= startOfDay(today).getTime() && new Date(a.dueAt).getTime() < weekEnd
  );
  const classesThisWeek = days.reduce((n, d) => n + state.timetable.filter((s) => s.day === JS_DAY_TO_SLOT[d.getDay()]).length, 0);
  const studyMinutes = plan.reduce((n, b) => n + b.minutes, 0);

  return (
    <>
      <View style={styles.summary}>
        <SummaryStat value={String(classesThisWeek)} label="classes" />
        <View style={styles.summaryDivider} />
        <SummaryStat value={String(dueThisWeek.length)} label="due" />
        <View style={styles.summaryDivider} />
        <SummaryStat value={formatDuration(studyMinutes * 60)} label={`study of ${state.preferences.weeklyStudyHours}h goal`} />
      </View>

      {days.map((d) => {
        const key = localDateKey(d);
        const slotDay = JS_DAY_TO_SLOT[d.getDay()];
        const classes = state.timetable
          .filter((s) => s.day === slotDay)
          .sort((a, b) => parseTimeOfDay(a.startTime) - parseTimeOfDay(b.startTime));
        const due = assessments.filter((a) => localDateKey(new Date(a.dueAt)) === key);
        const blocks = plan.filter((b) => b.date === key);
        const empty = !classes.length && !due.length && !blocks.length;

        return (
          <View key={key} style={styles.day}>
            <Text style={styles.dayLabel}>{dayLabel(d, today)}</Text>
            {empty ? (
              <Text style={styles.free}>Nothing scheduled</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {due.map((a) => (
                  <DueRow key={a.id} a={a} />
                ))}
                {classes.map((s) => {
                  const c = state.courses.find((x) => x.id === s.courseId);
                  return (
                    <Pressable
                      key={s.id}
                      style={styles.row}
                      onPress={() => router.push({ pathname: '/upcoming-lecture', params: { slotId: s.id } } as any)}
                    >
                      <Text style={styles.rowTime}>{s.startTime}</Text>
                      <View style={[styles.rowBar, { backgroundColor: c?.color ?? UI.ink }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>
                          {s.courseCode}: {c?.title ?? 'Class'}
                        </Text>
                        <Text style={styles.rowMeta}>{s.venue}</Text>
                      </View>
                    </Pressable>
                  );
                })}
                {blocks.map((b) => (
                  <Pressable
                    key={`${b.assessmentId}-${b.date}`}
                    style={[styles.row, styles.studyRow]}
                    onPress={() => router.push(`/assessment/${b.assessmentId}` as Href)}
                  >
                    <Ionicons name="book-outline" size={16} color={UI.success} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>
                        Study · {b.courseCode} {kindMeta(b.kind).label.toLowerCase()}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {formatDuration(b.minutes * 60)} for “{b.title}”
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        );
      })}
      <Text style={styles.footnote}>
        Study sessions are planned from your deadlines and your weekly study goal ({state.preferences.weeklyStudyHours}h). Tick
        off preparation steps and the plan adjusts.
      </Text>
    </>
  );
}

function DueRow({ a }: { a: Assessment }) {
  const meta = kindMeta(a.kind);
  const color = urgencyColor(a);
  return (
    <Pressable style={[styles.row, styles.dueRow]} onPress={() => router.push(`/assessment/${a.id}` as Href)}>
      <Ionicons name={a.status === 'done' ? 'checkmark-circle' : meta.icon} size={16} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>
          {meta.label} {a.kind === 'exam' || a.kind === 'test' ? 'at' : 'due'}{' '}
          {new Date(a.dueAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {a.courseCode} · {a.title}
        </Text>
      </View>
    </Pressable>
  );
}

function SummaryStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Deadlines ────────────────────────────────────────────────────

const GROUP_LABEL: Record<DeadlineGroup, string> = {
  overdue: 'OVERDUE',
  'this-week': 'THIS WEEK',
  'next-week': 'NEXT WEEK',
  later: 'LATER',
  done: 'COMPLETED',
};

function DeadlinesView({ items, onAdd }: { items: Assessment[]; onAdd: () => void }) {
  if (!items.length) {
    return (
      <EmptyState
        icon="calendar-outline"
        title="No deadlines yet"
        message="Add assignments, tests and exams to get a study plan and reminders before they’re due."
        primary={{ label: 'Add a deadline', icon: 'add', onPress: onAdd }}
      />
    );
  }
  const groups = groupDeadlines(items);
  return (
    <>
      {(Object.keys(GROUP_LABEL) as DeadlineGroup[]).map((g) =>
        groups[g].length ? (
          <View key={g} style={{ marginBottom: 18 }}>
            <Text style={[styles.groupLabel, g === 'overdue' && { color: UI.error }]}>
              {GROUP_LABEL[g]} · {groups[g].length}
            </Text>
            <View style={{ gap: 10 }}>
              {groups[g].map((a) => (
                <AssessmentCard key={a.id} item={a} />
              ))}
            </View>
          </View>
        ) : null
      )}
    </>
  );
}

// ─── Calendar ─────────────────────────────────────────────────────

function CalendarView({ items, events, today }: { items: Assessment[]; events: CalendarEvent[]; today: Date }) {
  const { state } = useAcademic();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(localDateKey(today));

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first grid
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
  while (cells.length % 7) cells.push(null);

  const dueByDay = new Map<string, Assessment[]>();
  items.forEach((a) => {
    const k = localDateKey(new Date(a.dueAt));
    dueByDay.set(k, [...(dueByDay.get(k) ?? []), a]);
  });

  const selDate = new Date(`${selected}T00:00:00`);
  const selDue = dueByDay.get(selected) ?? [];
  const selEvents = events.filter((e) => eventOnDay(e, selected));
  const selClasses = state.timetable.filter((s) => s.day === JS_DAY_TO_SLOT[selDate.getDay()]);
  const todayKey = localDateKey(today);

  return (
    <>
      <View style={styles.calCard}>
        <View style={styles.calHead}>
          <Pressable
            onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            hitSlop={10}
            accessibilityLabel="Previous month"
          >
            <Ionicons name="chevron-back" size={20} color={UI.ink} />
          </Pressable>
          <Text style={styles.calMonth}>{month.toLocaleDateString([], { month: 'long', year: 'numeric' })}</Text>
          <Pressable
            onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            hitSlop={10}
            accessibilityLabel="Next month"
          >
            <Ionicons name="chevron-forward" size={20} color={UI.ink} />
          </Pressable>
        </View>
        <View style={styles.calRow}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <Text key={i} style={styles.calDow}>
              {d}
            </Text>
          ))}
        </View>
        <View style={styles.calGrid}>
          {cells.map((d, i) => {
            if (!d) return <View key={i} style={styles.calCell} />;
            const k = localDateKey(d);
            const due = dueByDay.get(k) ?? [];
            const hasExam = due.some((a) => a.kind === 'exam' || a.kind === 'test');
            const ev = events.find((e) => eventOnDay(e, k));
            const isSel = k === selected;
            return (
              <Pressable
                key={i}
                style={styles.calCell}
                onPress={() => setSelected(k)}
                accessibilityRole="button"
                accessibilityLabel={`${d.toDateString()}${due.length ? `, ${due.length} due` : ''}${ev ? `, ${ev.title}` : ''}`}
              >
                <View
                  style={[
                    styles.calDay,
                    ev && { backgroundColor: ev.kind === 'exams' ? '#fde7e4' : ev.kind === 'holiday' ? '#e6f0dc' : UI.amberSoft },
                    k === todayKey && styles.calToday,
                    isSel && styles.calSel,
                  ]}
                >
                  <Text style={[styles.calDayText, isSel && { color: '#fff' }]}>{d.getDate()}</Text>
                </View>
                <View style={styles.dots}>
                  {due.length > 0 && <View style={[styles.dot, { backgroundColor: hasExam ? UI.error : UI.amber }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.legend}>
          <Legend color={UI.amber} label="Due" />
          <Legend color={UI.error} label="Test/exam" />
          <Legend color="#cfe2bd" label="Break" square />
          <Legend color="#f6c9c2" label="Exam period" square />
        </View>
      </View>

      <Text style={styles.groupLabel}>{dayLabel(selDate, today).toUpperCase()}</Text>
      <View style={{ gap: 8, marginBottom: 20 }}>
        {selEvents.map((e) => (
          <View key={e.id} style={[styles.row, styles.eventRow]}>
            <Ionicons name="flag-outline" size={16} color={UI.ink} />
            <Text style={styles.rowTitle}>{e.title}</Text>
          </View>
        ))}
        {selDue.map((a) => (
          <DueRow key={a.id} a={a} />
        ))}
        {selClasses.map((s) => (
          <View key={s.id} style={styles.row}>
            <Text style={styles.rowTime}>{s.startTime}</Text>
            <Text style={styles.rowTitle}>{s.courseCode}</Text>
            <Text style={[styles.rowMeta, { flex: 1, textAlign: 'right' }]}>{s.venue}</Text>
          </View>
        ))}
        {!selEvents.length && !selDue.length && !selClasses.length && <Text style={styles.free}>Nothing on this day</Text>}
      </View>

      <Text style={styles.groupLabel}>ACADEMIC CALENDAR</Text>
      <View style={styles.calList}>
        {[...events]
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((e) => (
            <View key={e.id} style={styles.calListRow}>
              <Text style={styles.calListDate}>
                {new Date(`${e.date}T00:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                {e.endDate
                  ? ` – ${new Date(`${e.endDate}T00:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short' })}`
                  : ''}
              </Text>
              <Text style={styles.calListTitle}>{e.title}</Text>
            </View>
          ))}
      </View>
      <Text style={styles.footnote}>Sample dates. Your university’s official calendar will appear here once it’s connected.</Text>
    </>
  );
}

function Legend({ color, label, square }: { color: string; label: string; square?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }, square && { borderRadius: 3 }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: UI.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  title: { fontFamily: LexiFonts.headlineLg, fontSize: 30, color: UI.ink },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: UI.ink,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addText: { fontFamily: LexiFonts.labelSmBold, fontSize: 13, color: '#fff' },
  segmentWrap: { paddingHorizontal: 20, paddingBottom: 12 },
  scroll: { paddingHorizontal: 20, paddingBottom: 120, maxWidth: 640, width: '100%', alignSelf: 'center' },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    paddingVertical: 14,
    marginBottom: 18,
  },
  summaryDivider: { width: 1, height: 28, backgroundColor: UI.border },
  statValue: { fontFamily: LexiFonts.headlineMd, fontSize: 20, color: UI.ink },
  statLabel: { fontFamily: LexiFonts.bodyRegular, fontSize: 11, color: UI.muted, marginTop: 2, textAlign: 'center' },
  day: { marginBottom: 18 },
  dayLabel: { fontFamily: LexiFonts.labelSmBold, fontSize: 13, color: UI.ink, marginBottom: 8 },
  free: { fontFamily: LexiFonts.bodyRegular, fontSize: 13, color: UI.muted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: UI.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.borderSoft,
    padding: 12,
  },
  dueRow: { backgroundColor: '#fff9f0', borderColor: '#f3dfbf' },
  studyRow: { backgroundColor: '#f4f8ee', borderColor: '#dfe8cf' },
  eventRow: { backgroundColor: UI.amberSoft, borderColor: 'transparent' },
  rowTime: { fontFamily: LexiFonts.labelSmBold, fontSize: 12, color: UI.muted, width: 64 },
  rowBar: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  rowTitle: { fontFamily: LexiFonts.bodyMedium, fontSize: 14, color: UI.ink },
  rowMeta: { fontFamily: LexiFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 1 },
  footnote: { fontFamily: LexiFonts.bodyRegular, fontSize: 12, lineHeight: 18, color: UI.muted, marginTop: 4 },
  groupLabel: { fontFamily: LexiFonts.labelSmBold, fontSize: 11, letterSpacing: 1.2, color: UI.muted, marginBottom: 10 },
  calCard: {
    backgroundColor: UI.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
    marginBottom: 20,
  },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  calMonth: { fontFamily: LexiFonts.headlineMd, fontSize: 18, color: UI.ink },
  calRow: { flexDirection: 'row' },
  calDow: { flex: 1, textAlign: 'center', fontFamily: LexiFonts.labelSmBold, fontSize: 11, color: UI.muted, marginBottom: 6 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  calDay: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  calToday: { borderWidth: 1.5, borderColor: UI.amber },
  calSel: { backgroundColor: UI.ink },
  calDayText: { fontFamily: LexiFonts.bodyMedium, fontSize: 14, color: UI.ink },
  dots: { height: 6, flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: UI.borderSoft },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendSwatch: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontFamily: LexiFonts.bodyRegular, fontSize: 11, color: UI.muted },
  calList: { backgroundColor: UI.card, borderRadius: 16, borderWidth: 1, borderColor: UI.border, paddingHorizontal: 14 },
  calListRow: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: UI.borderSoft },
  calListDate: { fontFamily: LexiFonts.labelSmBold, fontSize: 12, color: UI.amber, width: 110 },
  calListTitle: { flex: 1, fontFamily: LexiFonts.bodyMedium, fontSize: 14, color: UI.ink },
});

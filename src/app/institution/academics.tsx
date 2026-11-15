import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { useInstitution, type InstCalendarEvent } from '@/context/institution-context';
import { useLectures } from '@/context/lectures-context';
import { useMaterials } from '@/context/materials-context';
import { ScreenShell, Panel, Grid, StatTile, ListRow, Divider, SampleBanner } from '@/components/dashboard';
import { Chip, Segmented } from '@/components/ui/chip';
import { DateTimeField } from '@/components/ui/date-time-field';
import { LectureCard } from '@/components/lecture/lecture-card';
import { MaterialCard } from '@/components/materials/material-card';
import { SourceCard } from '@/components/source-card';
import { FACULTIES, allCourses } from '@/data/sample-institution';
import { searchSources } from '@/utils/source-search';
import { localDateKey } from '@/utils/planner';

type View_ = 'structure' | 'timetable' | 'calendar' | 'library';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const TIMES = ['08:00', '10:00', '12:00', '14:00', '16:00'];
const VENUES = ['LT A', 'LT B', 'Auditorium 1', 'Faculty Lab 2', 'Engineering Hall 3'];

/** Sample weekly slot for a course (replaced by the timetabling integration). */
function sampleSlot(code: string) {
  const h = [...code].reduce((n, c) => n + c.charCodeAt(0), 0);
  return `${DAYS[h % 5]} ${TIMES[(h >> 2) % 5]} · ${VENUES[(h >> 3) % 5]}`;
}

export default function InstitutionAcademicsScreen() {
  const [view, setView] = useState<View_>('structure');
  return (
    <ScreenShell eyebrow="ACADEMIC MANAGEMENT" title="Academics">
      <Segmented<View_>
        options={[
          { key: 'structure', label: 'Structure' },
          { key: 'timetable', label: 'Timetable' },
          { key: 'calendar', label: 'Calendar' },
          { key: 'library', label: 'Library' },
        ]}
        value={view}
        onChange={setView}
      />
      {view === 'structure' && <Structure />}
      {view === 'timetable' && <Timetable />}
      {view === 'calendar' && <CalendarManager />}
      {view === 'library' && <Library />}
    </ScreenShell>
  );
}

function Structure() {
  const { log } = useInstitution();
  const [query, setQuery] = useState('');
  const [imported, setImported] = useState(false);
  const courses = allCourses();
  const enrolled = courses.reduce((n, c) => n + c.enrolled, 0);
  const q = query.trim().toLowerCase();

  return (
    <>
      <Grid min={150}>
        <StatTile label="Faculties" value={`${FACULTIES.length}`} icon="business-outline" />
        <StatTile label="Departments" value={`${FACULTIES.reduce((n, f) => n + f.departments.length, 0)}`} icon="git-branch-outline" />
        <StatTile label="Course enrollments" value={enrolled.toLocaleString()} icon="people-outline" />
      </Grid>

      <Panel
        title="Enrollment"
        subtitle="Synced from the student information system"
        action={{
          label: imported ? 'Synced' : 'Sync now',
          onPress: () => {
            log('Requested enrollment sync', 'Student information system');
            setImported(true);
          },
        }}
      >
        <View style={styles.search}>
          <Ionicons name="search" size={16} color={UI.muted} />
          <TextInput style={styles.searchInput} value={query} onChangeText={setQuery} placeholder="Find a course, code or lecturer" placeholderTextColor={UI.muted} />
        </View>
      </Panel>

      {FACULTIES.map((f) => (
        <Panel key={f.id} title={f.name} subtitle={`Dean: ${f.dean}`} action={{ label: 'Open', onPress: () => router.push(`/admin/faculty/${f.id}` as Href) }}>
          {f.departments.map((d) => {
            const list = d.courses.filter((c) => !q || `${c.code} ${c.title} ${c.lecturer}`.toLowerCase().includes(q));
            if (!list.length) return null;
            return (
              <View key={d.id} style={{ marginBottom: 8 }}>
                <Text style={styles.dept}>
                  {d.name} · {d.students} students · {d.lecturers} lecturers
                </Text>
                {list.map((c, i) => (
                  <View key={c.id}>
                    {i > 0 && <Divider />}
                    <ListRow
                      title={`${c.code} · ${c.title}`}
                      subtitle={`${c.lecturer} · ${c.enrolled} enrolled`}
                      onPress={() => router.push(`/admin/course/${c.id}` as Href)}
                    />
                  </View>
                ))}
              </View>
            );
          })}
        </Panel>
      ))}
      <SampleBanner text="Sample structure. Faculties, departments, courses and enrollment come from the student information system once connected." />
    </>
  );
}

function Timetable() {
  const depts = FACULTIES.flatMap((f) => f.departments);
  const [deptId, setDeptId] = useState(depts[0].id);
  const dept = depts.find((d) => d.id === deptId)!;
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {depts.map((d) => (
          <Chip key={d.id} label={d.name} on={d.id === deptId} onPress={() => setDeptId(d.id)} />
        ))}
      </ScrollView>
      <Panel title={`${dept.name} timetable`} subtitle="Weekly lecture times">
        {dept.courses.map((c, i) => (
          <View key={c.id}>
            {i > 0 && <Divider />}
            <ListRow icon="time-outline" title={`${c.code} · ${c.title}`} subtitle={`${sampleSlot(c.code)} · ${c.lecturer}`} />
          </View>
        ))}
      </Panel>
      <SampleBanner text="Sample times. The official timetable syncs through the Timetabling integration (Settings → Integrations)." />
    </>
  );
}

const KINDS: { key: InstCalendarEvent['kind']; label: string }[] = [
  { key: 'semester', label: 'Semester' },
  { key: 'exams', label: 'Exams' },
  { key: 'holiday', label: 'Break' },
  { key: 'event', label: 'Event' },
];

function CalendarManager() {
  const { calendar, addEvent, deleteEvent } = useInstitution();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<InstCalendarEvent['kind']>('event');
  const [date, setDate] = useState(new Date());

  const save = () => {
    if (!title.trim()) return;
    addEvent({ title: title.trim(), date: localDateKey(date), kind });
    setTitle('');
    setAdding(false);
  };

  return (
    <>
      <Panel title="Academic calendar" subtitle="Dates students and staff see in their apps" action={{ label: adding ? 'Cancel' : 'Add date', onPress: () => setAdding(!adding) }}>
        {adding && (
          <View style={styles.form}>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Matriculation ceremony" placeholderTextColor={UI.muted} />
            <View style={styles.wrap}>
              {KINDS.map((k) => (
                <Chip key={k.key} label={k.label} on={kind === k.key} onPress={() => setKind(k.key)} />
              ))}
            </View>
            <DateTimeField value={date} onChange={setDate} />
            <Pressable style={[styles.primary, !title.trim() && { opacity: 0.4 }]} disabled={!title.trim()} onPress={save}>
              <Text style={styles.primaryText}>Add to calendar</Text>
            </Pressable>
          </View>
        )}
        {[...calendar]
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((e, i) => (
            <View key={e.id}>
              {i > 0 && <Divider />}
              <ListRow
                icon={e.kind === 'exams' ? 'school-outline' : e.kind === 'holiday' ? 'sunny-outline' : e.kind === 'semester' ? 'flag-outline' : 'calendar-outline'}
                title={e.title}
                subtitle={`${new Date(`${e.date}T00:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}${
                  e.endDate ? ` – ${new Date(`${e.endDate}T00:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short' })}` : ''
                } · ${KINDS.find((k) => k.key === e.kind)?.label}`}
                right={
                  <Pressable onPress={() => deleteEvent(e.id)} hitSlop={10} accessibilityLabel={`Remove ${e.title}`}>
                    <Ionicons name="trash-outline" size={18} color={UI.muted} />
                  </Pressable>
                }
              />
            </View>
          ))}
      </Panel>
    </>
  );
}

function Library() {
  const { lectures } = useLectures();
  const { materials } = useMaterials();
  const [query, setQuery] = useState('');
  const hits = useMemo(() => (query.trim() ? searchSources(query, { lectures, materials }, {}, 8) : []), [query, lectures, materials]);

  return (
    <>
      <Grid min={150}>
        <StatTile label="Lectures archived" value={`${lectures.length}`} icon="mic-outline" />
        <StatTile label="Materials" value={`${materials.length}`} icon="folder-open-outline" />
        <StatTile label="Shared with courses" value={`${materials.filter((m) => m.visibility === 'course').length}`} icon="people-outline" />
      </Grid>

      <Panel title="Institutional knowledge base" subtitle="Search across every lecture transcript and material">
        <View style={styles.search}>
          <Ionicons name="search" size={16} color={UI.muted} />
          <TextInput style={styles.searchInput} value={query} onChangeText={setQuery} placeholder="e.g. memoization, deadlock, eigenvalues" placeholderTextColor={UI.muted} />
        </View>
        {!!query.trim() && (
          <View style={{ gap: 8, marginTop: 12 }}>
            {hits.length ? hits.map((h, i) => <SourceCard key={`${h.id}-${h.location}`} hit={h} index={i} />) : <Text style={styles.muted}>No matches.</Text>}
          </View>
        )}
      </Panel>

      <Panel title="Content library" subtitle={materials.length ? undefined : 'No materials on this device yet'}>
        <View style={{ gap: 10 }}>
          {materials.slice(0, 6).map((m) => (
            <MaterialCard key={m.id} m={m} />
          ))}
        </View>
      </Panel>

      <Panel title="Lecture archive" subtitle={lectures.length ? undefined : 'No lectures on this device yet'}>
        <View style={{ gap: 10 }}>
          {lectures.slice(0, 6).map((l) => (
            <LectureCard key={l.id} lecture={l} />
          ))}
        </View>
      </Panel>
      <Text style={styles.muted}>Shows content on this device. University-wide content appears once the backend aggregates it.</Text>
    </>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.bg,
    paddingHorizontal: 16,
  },
  searchInput: { flex: 1, fontFamily: LexiFonts.bodyRegular, fontSize: 14, color: UI.ink },
  dept: { fontFamily: LexiFonts.labelSmBold, fontSize: 12, color: UI.amber, marginTop: 6 },
  form: { gap: 10, marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: UI.borderSoft },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.bg,
    paddingHorizontal: 14,
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 15,
    color: UI.ink,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primary: { height: 46, borderRadius: 23, backgroundColor: UI.ink, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: LexiFonts.labelSmBold, fontSize: 14, color: '#fff' },
  muted: { fontFamily: LexiFonts.bodyRegular, fontSize: 13, color: UI.muted },
});

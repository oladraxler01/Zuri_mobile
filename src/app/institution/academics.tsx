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
import { ScreenShell, Panel, Grid, StatTile, ListRow, Divider, SampleBanner, StatusBadge } from '@/components/dashboard';
import { Chip, Segmented } from '@/components/ui/chip';
import { DateTimeField } from '@/components/ui/date-time-field';
import { LectureCard } from '@/components/lecture/lecture-card';
import { SourceCard } from '@/components/source-card';
import { FACULTIES } from '@/data/sample-institution';
import { searchSources } from '@/utils/source-search';
import { localDateKey } from '@/utils/planner';
import { pickAndUploadMaterial } from '@/utils/pick-material';

type View_ = 'structure' | 'timetable' | 'calendar' | 'library';

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
  const inst = useInstitution();
  const [query, setQuery] = useState('');
  const [synced, setSynced] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [form, setForm] = useState({ code: '', title: '', lecturer: '', enrolled: '' });
  const live = inst.courses.filter((c) => !c.archived);
  const enrolled = live.reduce((n, c) => n + c.enrolled, 0);
  const q = query.trim().toLowerCase();

  const add = (deptId: string) => {
    if (!form.code.trim() || !form.title.trim()) return;
    inst.addCourse(deptId, {
      code: form.code.trim().toUpperCase(),
      title: form.title.trim(),
      lecturer: form.lecturer.trim() || 'Unassigned',
      enrolled: parseInt(form.enrolled, 10) || 0,
    });
    setForm({ code: '', title: '', lecturer: '', enrolled: '' });
    setAddingTo(null);
  };

  return (
    <>
      <Grid min={150}>
        <StatTile label="Faculties" value={`${FACULTIES.length}`} icon="business-outline" />
        <StatTile label="Active courses" value={`${live.length}`} icon="library-outline" />
        <StatTile label="Course enrollments" value={enrolled.toLocaleString()} icon="people-outline" />
      </Grid>

      <Panel>
        <ListRow icon="people-outline" title="Student overview" subtitle="Directory with engagement and risk" onPress={() => router.push('/admin/students' as Href)} />
        <Divider />
        <ListRow icon="person-outline" title="Lecturer overview" subtitle="Who teaches what, capture and outcomes" onPress={() => router.push('/admin/lecturers' as Href)} />
      </Panel>

      <Panel
        title="Enrollment & courses"
        subtitle="Synced from the student information system"
        action={{
          label: synced ? 'Sync requested' : 'Sync now',
          onPress: () => {
            inst.log('Requested enrollment sync', 'Student information system');
            setSynced(true);
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
            const list = inst.courses.filter((c) => c.deptId === d.id).filter((c) => !q || `${c.code} ${c.title} ${c.lecturer}`.toLowerCase().includes(q));
            return (
              <View key={d.id} style={{ marginBottom: 8 }}>
                <View style={styles.deptRow}>
                  <Text style={styles.dept}>
                    {d.name} · {d.students} students · {d.lecturers} lecturers
                  </Text>
                  <Pressable onPress={() => setAddingTo(addingTo === d.id ? null : d.id)} hitSlop={8}>
                    <Text style={styles.addLink}>{addingTo === d.id ? 'Cancel' : '+ Course'}</Text>
                  </Pressable>
                </View>
                {addingTo === d.id && (
                  <View style={styles.form}>
                    <View style={styles.inputs}>
                      <TextInput style={[styles.input, { width: 110 }]} value={form.code} onChangeText={(v) => setForm({ ...form, code: v })} placeholder="CSC 401" placeholderTextColor={UI.muted} autoCapitalize="characters" />
                      <TextInput style={[styles.input, { flex: 1 }]} value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} placeholder="Course title" placeholderTextColor={UI.muted} />
                    </View>
                    <View style={styles.inputs}>
                      <TextInput style={[styles.input, { flex: 1 }]} value={form.lecturer} onChangeText={(v) => setForm({ ...form, lecturer: v })} placeholder="Lecturer" placeholderTextColor={UI.muted} />
                      <TextInput style={[styles.input, { width: 110 }]} value={form.enrolled} onChangeText={(v) => setForm({ ...form, enrolled: v.replace(/\D/g, '') })} placeholder="Enrolled" placeholderTextColor={UI.muted} keyboardType="number-pad" />
                    </View>
                    <Pressable style={[styles.primary, (!form.code.trim() || !form.title.trim()) && { opacity: 0.4 }]} onPress={() => add(d.id)}>
                      <Text style={styles.primaryText}>Add course to {d.name}</Text>
                    </Pressable>
                  </View>
                )}
                {list.map((c, i) => (
                  <View key={c.id} style={c.archived ? { opacity: 0.5 } : undefined}>
                    {i > 0 && <Divider />}
                    <ListRow
                      title={`${c.code} · ${c.title}`}
                      subtitle={`${c.lecturer} · ${c.enrolled}/${c.capacity} enrolled${c.archived ? ' · archived' : ''}`}
                      right={c.enrolled > c.capacity ? <StatusBadge status="critical" label="Over" /> : undefined}
                      onPress={() => router.push(`/admin/course/${c.id}` as Href)}
                    />
                  </View>
                ))}
              </View>
            );
          })}
        </Panel>
      ))}
      <SampleBanner text="Sample structure. Courses you add, enrollment and capacity changes are saved and recorded in the audit log." />
    </>
  );
}

function Timetable() {
  const inst = useInstitution();
  const depts = FACULTIES.flatMap((f) => f.departments);
  const [deptId, setDeptId] = useState(depts[0].id);
  const dept = depts.find((d) => d.id === deptId)!;
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map((x) => parseInt(x, 10));
    return (h || 0) * 60 + (m || 0);
  };
  const allSlots = inst.courses
    .filter((c) => !c.archived)
    .flatMap((c) => (inst.slots?.[c.id] ?? []).map((sl) => ({ c, sl })));
  const clash = (cid: string, sl: { id: string; day: string; start: string; end: string; venue: string }) =>
    allSlots.filter(
      (o) => o.sl.id !== sl.id && o.sl.day === sl.day && o.sl.venue.toLowerCase() === sl.venue.toLowerCase() && toMin(o.sl.start) < toMin(sl.end) && toMin(sl.start) < toMin(o.sl.end)
    );
  const courses = inst.courses.filter((c) => c.deptId === deptId && !c.archived);

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {depts.map((d) => (
          <Chip key={d.id} label={d.name} on={d.id === deptId} onPress={() => setDeptId(d.id)} />
        ))}
      </ScrollView>
      <Panel title={`${dept.name} timetable`} subtitle="Tap a course to add or remove class times">
        {courses.map((c, i) => {
          const slots = inst.slots?.[c.id] ?? [];
          return (
            <View key={c.id}>
              {i > 0 && <Divider />}
              <Pressable style={styles.ttRow} onPress={() => router.push(`/admin/course/${c.id}` as Href)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ttCourse}>
                    {c.code} · {c.title}
                  </Text>
                  {slots.length ? (
                    slots.map((sl) => {
                      const cl = clash(c.id, sl);
                      return (
                        <Text key={sl.id} style={[styles.ttSlot, cl.length > 0 && { color: UI.error }]}>
                          {sl.day} {sl.start}–{sl.end} · {sl.venue}
                          {cl.length ? `  ·  clashes with ${cl.map((x) => x.c.code).join(', ')}` : ''}
                        </Text>
                      );
                    })
                  ) : (
                    <Text style={styles.ttSlot}>No class times</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={UI.muted} />
              </Pressable>
            </View>
          );
        })}
      </Panel>
      <SampleBanner text="Starting times are samples; changes you make are saved. The official timetable syncs through the Timetabling integration." />
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
  const inst = useInstitution();
  const { lectures } = useLectures();
  const { materials } = useMaterials();
  const [query, setQuery] = useState('');
  const hits = useMemo(() => (query.trim() ? searchSources(query, { lectures, materials }, {}, 8) : []), [query, lectures, materials]);
  const status = (id: string) => inst.moderation?.[id] ?? 'approved';
  const hidden = materials.filter((m) => status(m.id) === 'hidden').length;
  const flagged = materials.filter((m) => status(m.id) === 'flagged').length;

  return (
    <>
      <Grid min={150}>
        <StatTile label="Lectures archived" value={`${lectures.length}`} icon="mic-outline" />
        <StatTile label="Materials" value={`${materials.length}`} icon="folder-open-outline" />
        <StatTile label="Flagged / hidden" value={`${flagged} / ${hidden}`} icon="flag-outline" />
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

      <Panel title="Material management" subtitle="Approve, flag or hide material shared in the institution library" action={{ label: 'Upload', onPress: () => pickAndUploadMaterial() }}>
        {materials.length === 0 && <Text style={styles.muted}>No materials yet. Upload handbooks, past questions or course packs.</Text>}
        {materials.map((m, i) => {
          const st = status(m.id);
          return (
            <View key={m.id}>
              {i > 0 && <Divider />}
              <View style={[styles.modRow, st === 'hidden' && { opacity: 0.55 }]}>
                <Pressable style={{ flex: 1 }} onPress={() => router.push(`/material/${m.id}` as Href)}>
                  <Text style={styles.ttCourse}>{m.analysis?.title ?? m.name}</Text>
                  <Text style={styles.ttSlot}>{[m.courseCode, m.category, m.visibility === 'course' ? 'shared with course' : 'private'].filter(Boolean).join(' · ')}</Text>
                </Pressable>
                <StatusBadge status={st === 'approved' ? 'good' : st === 'flagged' ? 'warning' : 'critical'} label={st === 'approved' ? 'Approved' : st === 'flagged' ? 'Flagged' : 'Hidden'} />
              </View>
              <View style={styles.modActions}>
                {(['approved', 'flagged', 'hidden'] as const).map((k) => (
                  <Chip key={k} label={k === 'approved' ? 'Approve' : k === 'flagged' ? 'Flag' : 'Hide'} on={st === k} onPress={() => inst.moderate(m.id, k, m.analysis?.title ?? m.name)} />
                ))}
              </View>
            </View>
          );
        })}
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
  deptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  addLink: { fontFamily: LexiFonts.labelSmBold, fontSize: 12, color: UI.amber },
  inputs: { flexDirection: 'row', gap: 8 },
  ttRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  ttCourse: { fontFamily: LexiFonts.bodyMedium, fontSize: 14, color: UI.ink },
  ttSlot: { fontFamily: LexiFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 2 },
  modRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10 },
  modActions: { flexDirection: 'row', gap: 6, paddingVertical: 8 },
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

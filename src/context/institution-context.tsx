import React, { createContext, useContext, useEffect, useState } from 'react';
import { AUDIT_SEED, FACULTIES, PERMISSIONS, ROLES, STAFF_SEED, type DeptCourse } from '@/data/sample-institution';
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/utils/storage';
import { localDateKey } from '@/utils/planner';
import { onReset } from '@/utils/reset';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: 'active' | 'invited' | 'suspended';
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
}

export interface InstCalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  kind: 'semester' | 'exams' | 'holiday' | 'event';
}

export interface Broadcast {
  id: string;
  audience: 'everyone' | 'students' | 'staff';
  title: string;
  body: string;
  sentAt: string;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  connected: boolean;
}

export interface InstSlot {
  id: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  start: string; // "08:00"
  end: string; // "10:00"
  venue: string;
}

export interface ManagedCourse extends DeptCourse {
  deptId: string;
  department: string;
  faculty: string;
  capacity: number;
  archived: boolean;
  /** added by an admin (not from the records system) */
  custom: boolean;
}

export type Moderation = 'approved' | 'hidden' | 'flagged';

interface InstitutionState {
  settings: { name: string; shortName: string; academicYear: string; semester: string; timezone: string };
  staff: StaffMember[];
  audit: AuditEntry[];
  calendar: InstCalendarEvent[];
  broadcasts: Broadcast[];
  /** role → permissions granted */
  roles: Record<string, string[]>;
  privacy: { retainRecordingsMonths: number; allowAnalytics: boolean; anonymiseExports: boolean; studentDataDeletion: boolean };
  integrations: Integration[];
  apiKeyLast4: string;
  webhookUrl: string;
  enrollment: Record<string, number>;
  capacity: Record<string, number>;
  extraCourses: (DeptCourse & { deptId: string })[];
  archivedCourses: string[];
  slots: Record<string, InstSlot[]>;
  moderation: Record<string, Moderation>;
}

const DAYS: InstSlot['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const TIMES = ['08:00', '10:00', '12:00', '14:00', '16:00'];
const VENUES = ['LT A', 'LT B', 'Auditorium 1', 'Faculty Lab 2', 'Engineering Hall 3'];
/** Seed slots (replaced by the timetabling integration). */
function seedSlots(): Record<string, InstSlot[]> {
  const out: Record<string, InstSlot[]> = {};
  FACULTIES.flatMap((f) => f.departments.flatMap((d) => d.courses)).forEach((c) => {
    const h = [...c.code].reduce((n, ch) => n + ch.charCodeAt(0), 0);
    const start = TIMES[(h >> 2) % 5];
    out[c.id] = [{ id: `sl_${c.id}`, day: DAYS[h % 5], start, end: `${String(parseInt(start, 10) + 2).padStart(2, '0')}:00`, venue: VENUES[(h >> 3) % 5] }];
  });
  return out;
}

function seed(): InstitutionState {
  const day = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return localDateKey(d);
  };
  const ago = (hours: number) => new Date(Date.now() + hours * 3600_000).toISOString();
  return {
    settings: {
      name: 'Veritas University',
      shortName: 'VUNA',
      academicYear: '2026/2027',
      semester: 'First Semester',
      timezone: 'Africa/Lagos (WAT)',
    },
    staff: STAFF_SEED.map((s) => ({ ...s })),
    audit: AUDIT_SEED.map((a) => ({ ...a, at: ago(a.at) })),
    calendar: [
      { id: 'ce1', title: 'Semester began', date: day(-42), kind: 'semester' },
      { id: 'ce2', title: 'Mid-semester break', date: day(18), endDate: day(22), kind: 'holiday' },
      { id: 'ce3', title: 'Examination period', date: day(56), endDate: day(70), kind: 'exams' },
      { id: 'ce4', title: 'Semester ends', date: day(72), kind: 'semester' },
    ],
    broadcasts: [],
    roles: {
      [ROLES[0]]: [...PERMISSIONS],
      [ROLES[1]]: ['View analytics', 'Manage courses & enrollment', 'Manage timetable & calendar', 'Publish content'],
      [ROLES[2]]: ['View analytics', 'Publish content'],
      [ROLES[3]]: ['Manage courses & enrollment', 'Manage timetable & calendar', 'Export data'],
    },
    privacy: { retainRecordingsMonths: 24, allowAnalytics: true, anonymiseExports: true, studentDataDeletion: true },
    integrations: [
      { id: 'sis', name: 'Student information system', description: 'Students, enrollment and results', connected: true },
      { id: 'lms', name: 'Learning management system', description: 'Moodle / Canvas course pages', connected: false },
      { id: 'sso', name: 'Single sign-on', description: 'University Google / Microsoft accounts', connected: false },
      { id: 'timetable', name: 'Timetabling', description: 'Official lecture timetable', connected: true },
    ],
    apiKeyLast4: '7f3a',
    webhookUrl: '',
    enrollment: {},
    capacity: {},
    extraCourses: [],
    archivedCourses: [],
    slots: seedSlots(),
    moderation: {},
  };
}

interface InstitutionContextType extends InstitutionState {
  hydrated: boolean;
  /** every course with enrollment, capacity and archive state applied */
  courses: ManagedCourse[];
  setEnrollment: (courseId: string, n: number) => void;
  setCapacity: (courseId: string, n: number) => void;
  addCourse: (deptId: string, c: { code: string; title: string; lecturer: string; enrolled: number }) => void;
  setArchived: (courseId: string, archived: boolean) => void;
  addSlot: (courseId: string, slot: Omit<InstSlot, 'id'>) => void;
  removeSlot: (courseId: string, slotId: string) => void;
  moderate: (materialId: string, status: Moderation, name: string) => void;
  log: (action: string, target: string) => void;
  updateSettings: (p: Partial<InstitutionState['settings']>) => void;
  inviteStaff: (s: Omit<StaffMember, 'id' | 'status'>) => void;
  updateStaff: (id: string, patch: Partial<StaffMember>) => void;
  togglePermission: (role: string, permission: string) => void;
  addEvent: (e: Omit<InstCalendarEvent, 'id'>) => void;
  deleteEvent: (id: string) => void;
  sendBroadcast: (b: Omit<Broadcast, 'id' | 'sentAt'>) => void;
  updatePrivacy: (p: Partial<InstitutionState['privacy']>) => void;
  toggleIntegration: (id: string) => void;
  rotateApiKey: () => void;
  setWebhook: (url: string) => void;
}

const InstitutionContext = createContext<InstitutionContextType | undefined>(undefined);

export function InstitutionProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<InstitutionState>(seed);
  const [hydrated, setHydrated] = useState(false);

  // "Delete all my data" empties this store.
  useEffect(() => onReset(() => setS(seed())), []);

  useEffect(() => {
    loadJSON<InstitutionState>(STORAGE_KEYS.institution).then((saved) => {
      if (saved) setS({ ...seed(), ...saved, slots: saved.slots ?? seed().slots });
      setHydrated(true);
    });
  }, []);
  useEffect(() => {
    if (hydrated) saveJSON(STORAGE_KEYS.institution, s);
  }, [s, hydrated]);

  const id = (p: string) => `${p}_${Date.now().toString(36)}`;
  const withLog = (x: InstitutionState, action: string, target: string): InstitutionState => ({
    ...x,
    audit: [{ id: id('au'), at: new Date().toISOString(), actor: 'You', action, target }, ...x.audit].slice(0, 200),
  });

  const deptOf = new Map(FACULTIES.flatMap((f) => f.departments.map((d) => [d.id, { dept: d, faculty: f }] as const)));
  const courses: ManagedCourse[] = [
    ...FACULTIES.flatMap((f) => f.departments.flatMap((d) => d.courses.map((c) => ({ ...c, deptId: d.id, custom: false })))),
    ...(s.extraCourses ?? []).map((c) => ({ ...c, custom: true })),
  ].map((c) => {
    const info = deptOf.get(c.deptId);
    const enrolled = s.enrollment?.[c.id] ?? c.enrolled;
    return {
      ...c,
      enrolled,
      department: info?.dept.name ?? '',
      faculty: info?.faculty.name ?? '',
      capacity: s.capacity?.[c.id] ?? Math.max(enrolled, Math.ceil((c.enrolled * 1.15) / 10) * 10),
      archived: (s.archivedCourses ?? []).includes(c.id),
    };
  });
  const courseCode = (cid: string) => courses.find((c) => c.id === cid)?.code ?? cid;

  const value: InstitutionContextType = {
    ...s,
    hydrated,
    courses,
    setEnrollment: (cid, n) =>
      setS((x) => withLog({ ...x, enrollment: { ...x.enrollment, [cid]: Math.max(0, n) } }, 'Changed enrollment', `${courseCode(cid)} → ${Math.max(0, n)}`)),
    setCapacity: (cid, n) => setS((x) => withLog({ ...x, capacity: { ...x.capacity, [cid]: Math.max(0, n) } }, 'Changed capacity', `${courseCode(cid)} → ${Math.max(0, n)}`)),
    addCourse: (deptId, c) => {
      const cid = id('ic');
      setS((x) =>
        withLog(
          {
            ...x,
            extraCourses: [...(x.extraCourses ?? []), { id: cid, deptId, code: c.code, title: c.title, lecturer: c.lecturer, enrolled: c.enrolled, lecturesCaptured: 0, mastery: 0, engagement: 0 }],
          },
          'Added course',
          `${c.code} · ${c.title}`
        )
      );
    },
    setArchived: (cid, archived) =>
      setS((x) =>
        withLog(
          { ...x, archivedCourses: archived ? [...(x.archivedCourses ?? []), cid] : (x.archivedCourses ?? []).filter((a) => a !== cid) },
          archived ? 'Archived course' : 'Restored course',
          courseCode(cid)
        )
      ),
    addSlot: (cid, slot) =>
      setS((x) =>
        withLog(
          { ...x, slots: { ...x.slots, [cid]: [...(x.slots?.[cid] ?? []), { ...slot, id: id('sl') }] } },
          'Added class time',
          `${courseCode(cid)} · ${slot.day} ${slot.start}–${slot.end} · ${slot.venue}`
        )
      ),
    removeSlot: (cid, slotId) =>
      setS((x) => withLog({ ...x, slots: { ...x.slots, [cid]: (x.slots?.[cid] ?? []).filter((sl) => sl.id !== slotId) } }, 'Removed class time', courseCode(cid))),
    moderate: (mid, status, name) =>
      setS((x) => withLog({ ...x, moderation: { ...x.moderation, [mid]: status } }, status === 'approved' ? 'Approved material' : status === 'hidden' ? 'Hid material' : 'Flagged material', name)),
    log: (action, target) => setS((x) => withLog(x, action, target)),
    updateSettings: (p) => setS((x) => withLog({ ...x, settings: { ...x.settings, ...p } }, 'Updated settings', Object.keys(p).join(', '))),
    inviteStaff: (m) =>
      setS((x) => withLog({ ...x, staff: [...x.staff, { ...m, id: id('st'), status: 'invited' }] }, 'Invited staff', `${m.name} · ${m.role}`)),
    updateStaff: (sid, patch) =>
      setS((x) => {
        const who = x.staff.find((m) => m.id === sid)?.name ?? 'staff';
        const what = patch.role ? `Changed role → ${patch.role}` : patch.status ? `Set status → ${patch.status}` : 'Updated staff';
        return withLog({ ...x, staff: x.staff.map((m) => (m.id === sid ? { ...m, ...patch } : m)) }, what, who);
      }),
    togglePermission: (role, perm) =>
      setS((x) => {
        const has = x.roles[role]?.includes(perm);
        const next = has ? x.roles[role].filter((p) => p !== perm) : [...(x.roles[role] ?? []), perm];
        return withLog({ ...x, roles: { ...x.roles, [role]: next } }, has ? 'Removed permission' : 'Granted permission', `${role}: ${perm}`);
      }),
    addEvent: (e) => setS((x) => withLog({ ...x, calendar: [...x.calendar, { ...e, id: id('ce') }] }, 'Added calendar date', e.title)),
    deleteEvent: (eid) =>
      setS((x) => withLog({ ...x, calendar: x.calendar.filter((e) => e.id !== eid) }, 'Removed calendar date', x.calendar.find((e) => e.id === eid)?.title ?? '')),
    sendBroadcast: (b) =>
      setS((x) => withLog({ ...x, broadcasts: [{ ...b, id: id('bc'), sentAt: new Date().toISOString() }, ...x.broadcasts] }, 'Sent notification', `${b.title} → ${b.audience}`)),
    updatePrivacy: (p) => setS((x) => withLog({ ...x, privacy: { ...x.privacy, ...p } }, 'Changed privacy setting', Object.keys(p).join(', '))),
    toggleIntegration: (iid) =>
      setS((x) => {
        const it = x.integrations.find((i) => i.id === iid);
        return withLog(
          { ...x, integrations: x.integrations.map((i) => (i.id === iid ? { ...i, connected: !i.connected } : i)) },
          it?.connected ? 'Disconnected integration' : 'Connected integration',
          it?.name ?? iid
        );
      }),
    rotateApiKey: () =>
      setS((x) => withLog({ ...x, apiKeyLast4: Math.random().toString(16).slice(2, 6) }, 'Rotated API key', 'Production key')),
    setWebhook: (url) => setS((x) => withLog({ ...x, webhookUrl: url }, 'Updated webhook', url || '(removed)')),
  };

  return <InstitutionContext.Provider value={value}>{children}</InstitutionContext.Provider>;
}

export function useInstitution() {
  const ctx = useContext(InstitutionContext);
  if (!ctx) throw new Error('useInstitution must be used within an InstitutionProvider');
  return ctx;
}

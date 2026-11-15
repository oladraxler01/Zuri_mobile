import React, { createContext, useContext, useEffect, useState } from 'react';
import { AUDIT_SEED, PERMISSIONS, ROLES, STAFF_SEED } from '@/data/sample-institution';
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/utils/storage';
import { localDateKey } from '@/utils/planner';

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
  };
}

interface InstitutionContextType extends InstitutionState {
  hydrated: boolean;
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

  useEffect(() => {
    loadJSON<InstitutionState>(STORAGE_KEYS.institution).then((saved) => {
      if (saved) setS({ ...seed(), ...saved });
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

  const value: InstitutionContextType = {
    ...s,
    hydrated,
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

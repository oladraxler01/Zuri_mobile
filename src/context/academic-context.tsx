import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/utils/storage';
import { onReset } from '@/utils/reset';
import { isBackendConfigured } from '@/services/api-config';
import { ApiError, currentUser, loadAuth, onAuthChange } from '@/services/api-client';
import { announceChange, onRemoteChange } from '@/services/device-sync';
import { isOn, loadFlags } from '@/services/feature-flags';
import { archiveAcademicCourse, createAcademicCourse, deleteTimetableSlot } from '@/services/academic-api';
import {
  actOnIntervention,
  createPersonalCourse,
  createTimetableSlot,
  dismissIntervention,
  enrollCourse,
  getEnrolledCourses,
  getNextClass,
  getPersonalCourses,
  getStudyStats,
  getTimetable,
  getTodayTimeline,
  getWeakTopics,
  recordLearningSignal,
  updateNotificationPreferences,
  type AcademicEventDTO,
  type AcademicTimetableEntry,
  type CourseSyllabusTopic,
  type LearningSignalType,
  type LectureDTO,
  type NextClassResponse,
  type StudyStatsDTO,
  type TodayTimelineResponse,
  type WeakTopicDTO,
} from '@/services/academic-api';

export interface CourseItem {
  id: string;
  code: string;
  title: string;
  units: number;
  lecturer?: string;
  color?: string;
  /** The course's id on the server, once it's saved there. */
  serverId?: string;
  /** Added on this phone and not on the server yet. */
  pendingSync?: boolean;
  /**
   * true: in the institution's catalogue (academic service), so its classes,
   * mastery and study partner live on the server too.
   * false: the student's own course; its classes stay on the phone.
   */
  catalogue?: boolean;
  /**
   * true: saved in the academic service (catalogue enrolment, or a private course
   * when the "onboarding_v1" flag is on), so its classes are saved on the server too.
   */
  onAcademic?: boolean;
  /** Set once the move into the academic service has been tried (so it isn't retried every sync). */
  academicTried?: boolean;
  /** From the server's course catalogue, when it has them. */
  syllabus?: CourseSyllabusTopic[];
  lectures?: LectureDTO[];
  events?: AcademicEventDTO[];
}

export interface TimetableSlot {
  id: string;
  courseId: string;
  courseCode: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
  startTime: string; // e.g. "09:00 AM"
  endTime: string;   // e.g. "11:00 AM"
  venue: string;     // e.g. "Lecture Theatre B"
  serverId?: string;
  pendingSync?: boolean;
}

export interface SemesterGoal {
  id: string;
  text: string;
  done: boolean;
  /** The goal's id in the account (/analytics/goals), once saved there. */
  serverId?: string;
}

export interface StudentPreferences {
  targetGpa: string;
  /** items per personalised study session */
  sessionSize: number;
  preferredStudyTime: 'morning' | 'afternoon' | 'evening';
  /** 'standard' = 16 kHz mono (smaller, ideal for transcription); 'high' = 44.1 kHz */
  recordingQuality: 'standard' | 'high';
  /** keep lecture audio after processing (off = delete audio to save space; transcript stays) */
  keepAudio: boolean;
  /** how much Ask Zuri shows per answer */
  aiAnswerStyle: 'concise' | 'detailed';
  /** use your activity to personalise recommendations */
  aiPersonalise: boolean;
  weeklyStudyHours: number;
  lectureReminders: boolean;
  reminderLeadMinutes: number; // 15, 30, 45
  examCountdown: boolean;
  assignmentAlerts: boolean;
}

export interface StudentAcademicState {
  /** Name entered at sign-up; empty until set */
  studentName: string;
  /** Email used at sign-up */
  email: string;
  goals: SemesterGoal[];
  /** Matriculation / student ID number, used for student verification */
  matricNumber: string;
  verification: 'unverified' | 'pending' | 'verified';
  faculty: string;
  university: string;
  department: string;
  level: string; // "100L", "200L", "300L", "400L", "500L"
  semester: 'First Semester' | 'Second Semester';
  courses: CourseItem[];
  timetable: TimetableSlot[];
  preferences: StudentPreferences;
  /**
   * Server courses / slots removed on this phone. The API has no delete yet,
   * so these are skipped when syncing instead of coming back.
   */
  hiddenServerIds?: string[];
}

/**
 * - local: not signed in (or no server set up), everything stays on the phone
 * - syncing / synced: talking to the server / last sync worked
 * - offline: couldn't reach the server; tries again on the next sync
 * - error: the server answered with an error
 */
export type AcademicSyncStatus = 'local' | 'syncing' | 'synced' | 'offline' | 'error';

export interface AcademicSyncState {
  status: AcademicSyncStatus;
  error?: string;
  lastSyncedAt?: number;
}

interface AcademicContextType {
  state: StudentAcademicState;
  /** true once saved data has been read from the device */
  hydrated: boolean;
  setAcademicInfo: (info: {
    studentName?: string;
    email?: string;
    goals?: SemesterGoal[];
    matricNumber?: string;
    verification?: 'unverified' | 'pending' | 'verified';
    faculty?: string;
    university?: string;
    department?: string;
    level?: string;
    semester?: 'First Semester' | 'Second Semester';
  }) => void;
  addCourse: (course: Omit<CourseItem, 'id'>) => string;
  removeCourse: (id: string) => void;
  addTimetableSlot: (slot: Omit<TimetableSlot, 'id'>) => void;
  removeTimetableSlot: (id: string) => void;
  setTimetableSlots: (slots: TimetableSlot[]) => void;
  updatePreferences: (prefs: Partial<StudentPreferences>) => void;

  // Server sync (no-ops while signed out)
  sync: AcademicSyncState;
  /** Pull courses, timetable, today's timeline and stats; push anything added offline. */
  syncFromServer: () => Promise<void>;
  todayTimeline: TodayTimelineResponse | null;
  nextClass: NextClassResponse | null;
  studyStats: StudyStatsDTO | null;
  /** Weak topics for the first course, from the server's mastery model. */
  weakTopics: WeakTopicDTO[];
  actOnTimelineCard: (id: string) => Promise<void>;
  dismissTimelineCard: (id: string) => Promise<void>;
  /** Report one quiz / review / question result (best effort). */
  submitLearningSignal: (signal: {
    courseId: string;
    topic: string;
    subtopic: string;
    signalType: LearningSignalType;
    score: number;
    maxScore: number;
  }) => Promise<void>;
}

/**
 * The demo courses and timetable that earlier versions showed every new student.
 * New installs start empty (courses come from onboarding or the server). Saved
 * copies from older installs are removed on load (see the load step below),
 * unless the student saved one to the server as a real course.
 */
const DEFAULT_COURSES: CourseItem[] = [
  { id: '1', code: 'CSC 201', title: 'Data Structures & Algorithms', units: 3 },
  { id: '2', code: 'CSC 205', title: 'Operating Systems Architecture', units: 3 },
  { id: '3', code: 'MTH 201', title: 'Mathematical Methods & Linear Algebra', units: 3 },
  { id: '4', code: 'GET 203', title: 'Engineering Mathematics II', units: 2 },
];

const DEFAULT_TIMETABLE: TimetableSlot[] = [
  { id: 's1', courseId: '1', courseCode: 'CSC 201', day: 'Mon', startTime: '09:00 AM', endTime: '11:00 AM', venue: 'Faculty Lab 2' },
  { id: 's2', courseId: '2', courseCode: 'CSC 205', day: 'Mon', startTime: '01:00 PM', endTime: '03:00 PM', venue: 'LT B' },
  { id: 's3', courseId: '3', courseCode: 'MTH 201', day: 'Wed', startTime: '10:00 AM', endTime: '12:00 PM', venue: 'Auditorium 1' },
  { id: 's4', courseId: '1', courseCode: 'CSC 201', day: 'Thu', startTime: '02:00 PM', endTime: '04:00 PM', venue: 'Faculty Lab 2' },
  { id: 's5', courseId: '4', courseCode: 'GET 203', day: 'Fri', startTime: '08:00 AM', endTime: '10:00 AM', venue: 'Engineering Hall 3' },
];

const isDemoCourse = (c: CourseItem) => DEFAULT_COURSES.some((d) => d.id === c.id && d.code === c.code);
const isDemoSlot = (t: TimetableSlot) => DEFAULT_TIMETABLE.some((d) => d.id === t.id && d.courseCode === t.courseCode);

const initialState: StudentAcademicState = {
  studentName: '',
  email: '',
  goals: [],
  matricNumber: '',
  verification: 'unverified',
  faculty: 'Faculty of Natural & Applied Sciences',
  university: 'Veritas University',
  department: 'Computer Science',
  level: '200L',
  semester: 'First Semester',
  courses: [],
  timetable: [],
  preferences: {
    targetGpa: '4.50+ (First Class)',
    sessionSize: 8,
    preferredStudyTime: 'evening',
    recordingQuality: 'standard',
    keepAudio: true,
    aiAnswerStyle: 'detailed',
    aiPersonalise: true,
    weeklyStudyHours: 16,
    lectureReminders: true,
    reminderLeadMinutes: 15,
    examCountdown: true,
    assignmentAlerts: true,
  },
};

// ─── Server ⇄ app mapping ─────────────────────────────────────────

const COURSE_COLORS = ['#2c3930', '#735c00', '#17231b', '#546257'];
const DAYS: TimetableSlot['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const normCode = (code: string) => code.replace(/\s+/g, '').toUpperCase();

/** "14:05:00" → "02:05 PM" */
function to12h(t: string): string {
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t;
  const h = parseInt(m[1], 10);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** "02:05 PM" → "14:05:00" */
function to24h(t: string): string {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!m) return '09:00:00';
  let h = parseInt(m[1], 10);
  const ap = m[3]?.toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m[2]}:00`;
}

function semesterCode(semester: StudentAcademicState['semester']): string {
  // The academic year starts in September: Sept 2026 → "2026/2027".
  const now = new Date();
  const start = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}/${start + 1}_${semester === 'Second Semester' ? 'SECOND' : 'FIRST'}`;
}

const signedIn = () => isBackendConfigured && !!currentUser();

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

export function AcademicProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StudentAcademicState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [sync, setSync] = useState<AcademicSyncState>({ status: 'local' });
  const [todayTimeline, setTodayTimeline] = useState<TodayTimelineResponse | null>(null);
  const [nextClass, setNextClass] = useState<NextClassResponse | null>(null);
  const [studyStats, setStudyStats] = useState<StudyStatsDTO | null>(null);
  const [weakTopics, setWeakTopics] = useState<WeakTopicDTO[]>([]);

  // Async sync code reads the latest state through this ref.
  const stateRef = useRef(state);
  stateRef.current = state;

  // "Delete all my data" empties this store.
  useEffect(
    () =>
      onReset(() => {
        setState(initialState);
        setSync({ status: 'local' });
        setTodayTimeline(null);
        setNextClass(null);
        setStudyStats(null);
        setWeakTopics([]);
      }),
    []
  );

  // Restore saved courses, timetable and preferences, then keep them saved.
  useEffect(() => {
    loadJSON<StudentAcademicState>(STORAGE_KEYS.academic).then((saved) => {
      if (saved) {
        // Courses and classes saved before server sync existed are uploaded too
        // (the built-in demo ones from older versions are dropped).
        setState({
          ...initialState,
          ...saved,
          courses: (saved.courses ?? initialState.courses)
            .filter((c) => c.serverId || !isDemoCourse(c))
            .map((c) => (c.serverId || c.pendingSync !== undefined ? c : { ...c, pendingSync: true })),
          timetable: (saved.timetable ?? initialState.timetable)
            .filter((t) => t.serverId || !isDemoSlot(t))
            .map((t) => (t.serverId || t.pendingSync !== undefined ? t : { ...t, pendingSync: true })),
          preferences: { ...initialState.preferences, ...saved.preferences },
        });
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) saveJSON(STORAGE_KEYS.academic, state);
  }, [state, hydrated]);

  // ─── Push: courses and slots added on the phone go to the server ───

  /** Save one course on the server: catalogue enrolment first, else a custom course. */
  const pushCourse = useCallback(async (course: CourseItem) => {
    let patch: Partial<CourseItem>;
    try {
      const d = await enrollCourse(course.code, semesterCode(stateRef.current.semester));
      patch = { serverId: d.id, catalogue: true, onAcademic: true, syllabus: d.syllabus, lectures: d.lectures, events: d.events };
    } catch (e) {
      if (e instanceof ApiError && e.kind !== 'server') throw e; // offline / signed out: try later
      await loadFlags();
      if (isOn('onboarding_v1')) {
        // Phase 1: a private course in the academic service, so its classes, reminders and prep work too.
        const level = parseInt(stateRef.current.level, 10);
        const { course: d, catalogue } = await createAcademicCourse({
          code: course.code,
          title: course.title,
          credit_units: course.units || undefined,
          ...(Number.isFinite(level) ? { level } : {}),
          client_id: course.id,
        });
        patch = { serverId: d.id, catalogue, onAcademic: true, syllabus: d.syllabus ?? undefined };
      } else {
        // Not in the institution's catalogue: save it as the student's own course (content service).
        const created = await createPersonalCourse({
          name: course.title,
          code: course.code,
          description: course.lecturer ? `Lecturer: ${course.lecturer}` : undefined,
        });
        patch = { serverId: created.id, catalogue: false, onAcademic: false };
      }
    }
    setState((prev) => ({
      ...prev,
      courses: prev.courses.map((c) => (c.id === course.id ? { ...c, ...patch, pendingSync: false } : c)),
    }));
  }, []);

  const pushSlot = useCallback(async (slot: TimetableSlot, courseServerId: string) => {
    const created = await createTimetableSlot({
      course_id: courseServerId,
      day_of_week: DAYS.indexOf(slot.day) + 1,
      start_time: to24h(slot.startTime),
      end_time: to24h(slot.endTime),
      venue: slot.venue,
    }, slot.id);
    setState((prev) => ({
      ...prev,
      timetable: prev.timetable.map((t) => (t.id === slot.id ? { ...t, serverId: created.id, pendingSync: false } : t)),
    }));
  }, []);

  /** Stop retrying: the server refused it, so it stays on this phone only. */
  const keepLocal = useCallback((kind: 'courses' | 'timetable', id: string) => {
    setState((prev) =>
      kind === 'courses'
        ? { ...prev, courses: prev.courses.map((c) => (c.id === id ? { ...c, pendingSync: false } : c)) }
        : { ...prev, timetable: prev.timetable.map((t) => (t.id === id ? { ...t, pendingSync: false } : t)) }
    );
  }, []);

  const pushPending = useCallback(async () => {
    let saved = 0;
    for (const course of stateRef.current.courses.filter((c) => c.pendingSync)) {
      try {
        await pushCourse(course);
        saved += 1;
      } catch (e) {
        if (e instanceof ApiError && e.kind !== 'server') return; // offline: stop, retry on next sync
        console.warn(`Could not save ${course.code} on the server`, e);
        keepLocal('courses', course.id);
      }
    }
    // Classes go to the academic service, which only knows catalogue courses.
    for (const slot of stateRef.current.timetable.filter((t) => t.pendingSync)) {
      const course = stateRef.current.courses.find((c) => c.id === slot.courseId);
      if (!course?.serverId) continue; // course not saved yet: try again after it is
      if (!course.catalogue && !course.onAcademic) {
        keepLocal('timetable', slot.id);
        continue;
      }
      try {
        await pushSlot(slot, course.serverId);
        saved += 1;
      } catch (e) {
        if (e instanceof ApiError && e.kind !== 'server') break;
        console.warn(`Could not save a ${slot.courseCode} class on the server`, e);
        keepLocal('timetable', slot.id);
      }
    }
    // Let the student's other devices pick up the new courses and classes.
    if (saved) announceChange('courses');
  }, [pushCourse, pushSlot, keepLocal]);

  // One push at a time; changes made during a push run straight after it.
  const pushing = useRef(false);
  const pushAgain = useRef(false);
  const schedulePush = useCallback(async () => {
    if (!signedIn()) return;
    if (pushing.current) {
      pushAgain.current = true;
      return;
    }
    pushing.current = true;
    try {
      do {
        pushAgain.current = false;
        await pushPending();
      } while (pushAgain.current);
    } finally {
      pushing.current = false;
    }
  }, [pushPending]);

  const hasPending = state.courses.some((c) => c.pendingSync) || state.timetable.some((t) => t.pendingSync);
  useEffect(() => {
    if (hydrated && hasPending) schedulePush();
  }, [hydrated, hasPending, state.courses, state.timetable, schedulePush]);

  // ─── Pull: replace sample / stale data with what the server has ───

  const syncing = useRef(false);
  const syncFromServer = useCallback(async () => {
    if (!isBackendConfigured) return;
    await loadAuth();
    if (!currentUser()) {
      setSync({ status: 'local' });
      return;
    }
    if (syncing.current) return;
    syncing.current = true;
    setSync((s) => ({ ...s, status: 'syncing', error: undefined }));
    try {
      // Phase 1 just switched on: move the student's own courses (saved earlier in the
      // content service, classes kept on the phone) into the academic service, once.
      await loadFlags();
      if (isOn('onboarding_v1')) {
        const prev = stateRef.current;
        const upgrade = new Set(
          prev.courses.filter((c) => c.serverId && !c.catalogue && !c.onAcademic && !c.pendingSync && !c.academicTried).map((c) => c.id)
        );
        if (upgrade.size) {
          const next: StudentAcademicState = {
            ...prev,
            courses: prev.courses.map((c) => (upgrade.has(c.id) ? { ...c, pendingSync: true, academicTried: true } : c)),
            timetable: prev.timetable.map((t) => (upgrade.has(t.courseId) && !t.serverId ? { ...t, pendingSync: true } : t)),
          };
          stateRef.current = next; // schedulePush reads the ref straight away
          setState(next);
        }
      }

      await schedulePush();

      const [enrolled, personal, slots, next, today, stats] = await Promise.allSettled([
        getEnrolledCourses(),
        getPersonalCourses(),
        getTimetable(),
        getNextClass(),
        getTodayTimeline(),
        getStudyStats(),
      ]);
      const results = [enrolled, personal, slots, next, today, stats];
      const failure = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failure && results.every((r) => r.status === 'rejected')) throw failure.reason;

      const hidden = new Set(stateRef.current.hiddenServerIds ?? []);
      type ServerCourse = Omit<CourseItem, 'id' | 'color'> & { serverId: string; clientId?: string };
      const serverCourses: ServerCourse[] = [];
      const seen = new Set<string>();
      if (enrolled.status === 'fulfilled') {
        for (const c of enrolled.value ?? []) {
          if (c.archived || hidden.has(c.id) || seen.has(normCode(c.code || c.title))) continue;
          seen.add(normCode(c.code || c.title));
          serverCourses.push({
            serverId: c.id,
            clientId: c.client_id ?? undefined,
            code: c.code || c.title,
            title: c.title,
            units: c.credit_units || 3,
            // Phase 1 private courses come back here too; only "catalogue" ones are the school's.
            catalogue: (c.visibility ?? 'catalogue') === 'catalogue',
            onAcademic: true,
            syllabus: c.syllabus,
            lectures: c.lectures,
            events: c.events,
          });
        }
      }
      if (personal.status === 'fulfilled') {
        for (const c of personal.value) {
          const code = c.code || c.name;
          if (hidden.has(c.id) || seen.has(normCode(code))) continue;
          seen.add(normCode(code));
          serverCourses.push({
            serverId: c.id,
            code,
            title: c.name,
            units: c.credit_units || 3,
            catalogue: false,
            onAcademic: false,
            lecturer: c.description?.replace(/^Lecturer:\s*/, '') || undefined,
          });
        }
      }
      const serverSlots: AcademicTimetableEntry[] =
        slots.status === 'fulfilled' ? (slots.value ?? []).filter((e) => !hidden.has(e.id)) : [];

      setState((prev) => {
        if (!serverCourses.length) return prev; // nothing on the server yet: keep the phone's data

        // Keep each course's id on the phone (lectures, materials… point at it).
        const localByCode = new Map(prev.courses.map((c) => [normCode(c.code), c]));
        const localById = new Map(prev.courses.map((c) => [c.id, c]));
        const merged: CourseItem[] = serverCourses.map(({ clientId, ...s }, i) => {
          const local = (clientId && localById.get(clientId)) || localByCode.get(normCode(s.code));
          return local
            ? { ...local, ...s, lecturer: s.lecturer ?? local.lecturer, pendingSync: false }
            : { ...s, id: s.serverId, color: COURSE_COLORS[i % COURSE_COLORS.length] };
        });
        const mergedCodes = new Set(merged.map((c) => normCode(c.code)));
        const courses = [...merged, ...prev.courses.filter((c) => c.pendingSync && !mergedCodes.has(normCode(c.code)))];
        const courseIds = new Set(courses.map((c) => c.id));

        let timetable = prev.timetable.filter((t) => courseIds.has(t.courseId));
        if (slots.status === 'fulfilled') {
          const idByServerId = new Map(courses.filter((c) => c.serverId).map((c) => [c.serverId!, c.id]));
          const idByCode = new Map(courses.map((c) => [normCode(c.code), c.id]));
          const fromServer: TimetableSlot[] = serverSlots
            .filter((e) => e.day_of_week >= 1 && e.day_of_week <= 6) // the app has no Sunday classes
            .map((e) => ({
              id: e.id,
              serverId: e.id,
              courseId: idByServerId.get(e.course_id) ?? idByCode.get(normCode(e.course_code)) ?? e.course_id,
              courseCode: e.course_code,
              day: DAYS[e.day_of_week - 1],
              startTime: to12h(e.start_time),
              endTime: to12h(e.end_time),
              venue: e.venue || '',
            }));
          // Server classes replace the ones it already has; classes only on this phone stay.
          timetable = [...fromServer, ...timetable.filter((t) => !t.serverId)];
        }
        return { ...prev, courses, timetable };
      });

      if (next.status === 'fulfilled') setNextClass(next.value);
      if (today.status === 'fulfilled') setTodayTimeline(today.value);
      if (stats.status === 'fulfilled') setStudyStats(stats.value);

      const first = serverCourses.find((c) => c.catalogue);
      if (first) {
        getWeakTopics(first.serverId)
          .then(setWeakTopics)
          .catch(() => {}); // the course may not be in the mastery model yet
      }

      setSync({
        status: failure ? 'error' : 'synced',
        error: failure ? (failure.reason as Error)?.message : undefined,
        lastSyncedAt: Date.now(),
      });
    } catch (e) {
      const offline = e instanceof ApiError && e.kind === 'network';
      setSync((s) => ({
        ...s,
        status: offline ? 'offline' : 'error',
        error: e instanceof Error ? e.message : 'Could not sync your courses.',
      }));
    } finally {
      syncing.current = false;
    }
  }, [schedulePush]);

  // Sync once saved data is loaded, and again whenever someone signs in.
  useEffect(() => {
    if (!hydrated) return;
    syncFromServer();
    return onAuthChange((user) => {
      if (user) syncFromServer();
      else setSync({ status: 'local' });
    });
  }, [hydrated, syncFromServer]);

  // Another of the student's devices added courses or classes: re-sync.
  useEffect(() => {
    if (!hydrated) return;
    return onRemoteChange('courses', () => {
      syncFromServer();
    });
  }, [hydrated, syncFromServer]);

  const actOnTimelineCard = useCallback(async (id: string) => {
    if (!signedIn()) return;
    try {
      await actOnIntervention(id);
      setTodayTimeline((prev) =>
        prev ? { ...prev, cards: prev.cards.map((c) => (c.id === id ? { ...c, is_acted_upon: true } : c)) } : prev
      );
    } catch (e) {
      console.warn('Could not update the timeline card', e);
    }
  }, []);

  const dismissTimelineCard = useCallback(async (id: string) => {
    setTodayTimeline((prev) => (prev ? { ...prev, cards: prev.cards.filter((c) => c.id !== id) } : prev));
    if (!signedIn()) return;
    try {
      await dismissIntervention(id);
    } catch (e) {
      console.warn('Could not dismiss the timeline card', e);
    }
  }, []);

  const submitLearningSignal: AcademicContextType['submitLearningSignal'] = useCallback(async (signal) => {
    if (!signedIn()) return;
    const course = stateRef.current.courses.find((c) => c.id === signal.courseId);
    if (!course?.serverId || !course.catalogue) return; // mastery is tracked for catalogue courses only
    try {
      await recordLearningSignal({
        course_id: course.serverId,
        topic: signal.topic,
        subtopic: signal.subtopic,
        signal_type: signal.signalType,
        score: signal.score,
        max_score: signal.maxScore,
      });
    } catch {
      // best effort
    }
  }, []);

  const setAcademicInfo: AcademicContextType['setAcademicInfo'] = (info) => {
    setState((prev) => ({
      ...prev,
      ...info,
    }));
  };

  const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

  const addCourse = (course: Omit<CourseItem, 'id'>) => {
    const newCourse: CourseItem = {
      ...course,
      id: uid(),
      color: course.color || '#2c3930',
      pendingSync: true,
    };
    setState((prev) => ({
      ...prev,
      courses: [...prev.courses, newCourse],
    }));
    return newCourse.id;
  };

  /** Server ids of the given rows, added to the "don't bring back" list. */
  const hide = (prev: StudentAcademicState, rows: { serverId?: string }[]) => {
    const ids = rows.map((r) => r.serverId).filter((x): x is string => !!x);
    return ids.length ? [...(prev.hiddenServerIds ?? []), ...ids] : prev.hiddenServerIds;
  };

  const removeCourse = (id: string) => {
    const course = stateRef.current.courses.find((c) => c.id === id);
    if (course?.serverId && course.onAcademic && !course.catalogue && signedIn()) {
      // A private academic course: archive it on the server (it can be restored there).
      loadFlags()
        .then(() => (isOn('onboarding_v1') ? archiveAcademicCourse(course.serverId!) : undefined))
        .then(() => announceChange('courses'))
        .catch((e) => console.warn(`Could not remove ${course.code} on the server`, e));
    }
    setState((prev) => ({
      ...prev,
      hiddenServerIds: hide(prev, [
        ...prev.courses.filter((c) => c.id === id),
        ...prev.timetable.filter((t) => t.courseId === id),
      ]),
      courses: prev.courses.filter((c) => c.id !== id),
      timetable: prev.timetable.filter((t) => t.courseId !== id),
    }));
  };

  const addTimetableSlot = (slot: Omit<TimetableSlot, 'id'>) => {
    const newSlot: TimetableSlot = {
      ...slot,
      id: uid(),
      pendingSync: true,
    };
    setState((prev) => ({
      ...prev,
      timetable: [...prev.timetable, newSlot],
    }));
  };

  const removeTimetableSlot = (id: string) => {
    const slot = stateRef.current.timetable.find((t) => t.id === id);
    if (slot?.serverId && signedIn()) {
      loadFlags()
        .then(() => (isOn('onboarding_v1') ? deleteTimetableSlot(slot.serverId!) : undefined))
        .then(() => announceChange('courses'))
        .catch((e) => console.warn('Could not remove the class on the server', e));
    }
    setState((prev) => ({
      ...prev,
      hiddenServerIds: hide(prev, prev.timetable.filter((t) => t.id === id)),
      timetable: prev.timetable.filter((t) => t.id !== id),
    }));
  };

  /** Replace the whole timetable (e.g. an import). New slots are saved on the server too. */
  const setTimetableSlots = (slots: TimetableSlot[]) => {
    setState((prev) => {
      const kept = new Set(slots.map((s) => s.serverId).filter(Boolean));
      return {
        ...prev,
        hiddenServerIds: hide(prev, prev.timetable.filter((t) => t.serverId && !kept.has(t.serverId))),
        timetable: slots.map((s) => (s.serverId ? s : { ...s, pendingSync: true })),
      };
    });
  };

  const updatePreferences = (prefs: Partial<StudentPreferences>) => {
    setState((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        ...prefs,
      },
    }));
    // Server-side reminders (push / email) follow the phone's switches.
    if (signedIn() && (prefs.lectureReminders !== undefined || prefs.assignmentAlerts !== undefined)) {
      const merged = { ...stateRef.current.preferences, ...prefs };
      updateNotificationPreferences({
        notify_on_study_reminder: merged.lectureReminders,
        notify_on_goal_completion: merged.assignmentAlerts,
      }).catch((e) => console.warn('Could not save reminder settings on the server', e));
    }
  };

  return (
    <AcademicContext.Provider
      value={{
        state,
        hydrated,
        setAcademicInfo,
        addCourse,
        removeCourse,
        addTimetableSlot,
        removeTimetableSlot,
        setTimetableSlots,
        updatePreferences,
        sync,
        syncFromServer,
        todayTimeline,
        nextClass,
        studyStats,
        weakTopics,
        actOnTimelineCard,
        dismissTimelineCard,
        submitLearningSignal,
      }}
    >
      {children}
    </AcademicContext.Provider>
  );
}

export function useAcademic() {
  const context = useContext(AcademicContext);
  if (!context) {
    throw new Error('useAcademic must be used within an AcademicProvider');
  }
  return context;
}

export const useAcademicContext = useAcademic;

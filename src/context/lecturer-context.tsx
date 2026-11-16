import React, { createContext, useContext, useEffect, useState } from 'react';
import type { TimetableSlot } from '@/context/academic-context';
import type { LectureQuestion, NoteSection } from '@/types/lecture';
import type { AssessmentKind } from '@/types/planner';
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/utils/storage';
import { onReset } from '@/utils/reset';

export interface LecturerProfile {
  title: string; // Dr., Prof., Mr., Mrs., Engr.
  fullName: string;
  staffId: string;
  department: string;
  /** staff ID checked by the university (needs backend) */
  verified: boolean;
  onboarded: boolean;
}

export interface TeachingSlot {
  id: string;
  day: TimetableSlot['day'];
  startTime: string;
  endTime: string;
  venue: string;
}

export interface TaughtCourse {
  id: string;
  code: string;
  title: string;
  level: string;
  cohortSize: number;
  slots: TeachingSlot[];
}

export interface Announcement {
  id: string;
  courseId: string;
  title: string;
  body: string;
  createdAt: string;
  important: boolean;
}

export interface LecturerQuiz {
  id: string;
  courseId: string;
  title: string;
  /** where the questions came from, e.g. "Lecture · Intro to DP" */
  source: string;
  questions: LectureQuestion[];
  status: 'draft' | 'published';
  createdAt: string;
}

export interface RevisionPack {
  id: string;
  courseId: string;
  title: string;
  sections: NoteSection[];
  createdAt: string;
  published: boolean;
}

export interface PublishedAssessment {
  id: string;
  courseId: string;
  kind: AssessmentKind;
  title: string;
  dueAt: string;
  venue?: string;
  weight?: number;
  instructions?: string;
  createdAt: string;
}

interface LecturerState {
  profile: LecturerProfile;
  courses: TaughtCourse[];
  announcements: Announcement[];
  quizzes: LecturerQuiz[];
  packs: RevisionPack[];
  assessments: PublishedAssessment[];
}

const initial: LecturerState = {
  profile: { title: 'Dr.', fullName: '', staffId: '', department: 'Computer Science', verified: false, onboarded: false },
  courses: [
    {
      id: 'lc1',
      code: 'CSC 201',
      title: 'Data Structures & Algorithms',
      level: '200L',
      cohortSize: 186,
      slots: [
        { id: 't1', day: 'Mon', startTime: '09:00 AM', endTime: '11:00 AM', venue: 'Faculty Lab 2' },
        { id: 't2', day: 'Thu', startTime: '02:00 PM', endTime: '04:00 PM', venue: 'Faculty Lab 2' },
      ],
    },
    {
      id: 'lc2',
      code: 'CSC 301',
      title: 'Design & Analysis of Algorithms',
      level: '300L',
      cohortSize: 154,
      slots: [{ id: 't3', day: 'Wed', startTime: '10:00 AM', endTime: '12:00 PM', venue: 'LT B' }],
    },
  ],
  announcements: [],
  quizzes: [],
  packs: [],
  assessments: [],
};

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

interface LecturerContextType extends LecturerState {
  hydrated: boolean;
  updateProfile: (p: Partial<LecturerProfile>) => void;
  setCourses: (courses: TaughtCourse[]) => void;
  addCourse: (c: Omit<TaughtCourse, 'id'>) => string;
  updateCourse: (id: string, patch: Partial<TaughtCourse>) => void;
  removeCourse: (id: string) => void;
  addAnnouncement: (a: Omit<Announcement, 'id' | 'createdAt'>) => void;
  deleteAnnouncement: (id: string) => void;
  saveQuiz: (q: Omit<LecturerQuiz, 'id' | 'createdAt'> & { id?: string }) => string;
  deleteQuiz: (id: string) => void;
  savePack: (p: Omit<RevisionPack, 'id' | 'createdAt'> & { id?: string }) => string;
  deletePack: (id: string) => void;
  addAssessment: (a: Omit<PublishedAssessment, 'id' | 'createdAt'>) => void;
  deleteAssessment: (id: string) => void;
}

const LecturerContext = createContext<LecturerContextType | undefined>(undefined);

export function LecturerProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<LecturerState>(initial);
  const [hydrated, setHydrated] = useState(false);

  // "Delete all my data" empties this store.
  useEffect(() => onReset(() => setS(initial)), []);

  useEffect(() => {
    loadJSON<LecturerState>(STORAGE_KEYS.lecturer).then((saved) => {
      if (saved) setS({ ...initial, ...saved, profile: { ...initial.profile, ...saved.profile } });
      setHydrated(true);
    });
  }, []);
  useEffect(() => {
    if (hydrated) saveJSON(STORAGE_KEYS.lecturer, s);
  }, [s, hydrated]);

  const now = () => new Date().toISOString();
  const value: LecturerContextType = {
    ...s,
    hydrated,
    updateProfile: (p) => setS((x) => ({ ...x, profile: { ...x.profile, ...p } })),
    setCourses: (courses) => setS((x) => ({ ...x, courses })),
    addCourse: (c) => {
      const id = uid('lc');
      setS((x) => ({ ...x, courses: [...x.courses, { ...c, id }] }));
      return id;
    },
    updateCourse: (id, patch) => setS((x) => ({ ...x, courses: x.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
    removeCourse: (id) => setS((x) => ({ ...x, courses: x.courses.filter((c) => c.id !== id) })),
    addAnnouncement: (a) => setS((x) => ({ ...x, announcements: [{ ...a, id: uid('an'), createdAt: now() }, ...x.announcements] })),
    deleteAnnouncement: (id) => setS((x) => ({ ...x, announcements: x.announcements.filter((a) => a.id !== id) })),
    saveQuiz: (q) => {
      const id = q.id ?? uid('qz');
      setS((x) => {
        const exists = x.quizzes.some((z) => z.id === id);
        const item = { ...q, id, createdAt: exists ? x.quizzes.find((z) => z.id === id)!.createdAt : now() };
        return { ...x, quizzes: exists ? x.quizzes.map((z) => (z.id === id ? item : z)) : [item, ...x.quizzes] };
      });
      return id;
    },
    deleteQuiz: (id) => setS((x) => ({ ...x, quizzes: x.quizzes.filter((z) => z.id !== id) })),
    savePack: (p) => {
      const id = p.id ?? uid('rp');
      setS((x) => {
        const exists = x.packs.some((z) => z.id === id);
        const item = { ...p, id, createdAt: exists ? x.packs.find((z) => z.id === id)!.createdAt : now() };
        return { ...x, packs: exists ? x.packs.map((z) => (z.id === id ? item : z)) : [item, ...x.packs] };
      });
      return id;
    },
    deletePack: (id) => setS((x) => ({ ...x, packs: x.packs.filter((z) => z.id !== id) })),
    addAssessment: (a) => setS((x) => ({ ...x, assessments: [...x.assessments, { ...a, id: uid('pa'), createdAt: now() }] })),
    deleteAssessment: (id) => setS((x) => ({ ...x, assessments: x.assessments.filter((a) => a.id !== id) })),
  };

  return <LecturerContext.Provider value={value}>{children}</LecturerContext.Provider>;
}

export function useLecturer() {
  const ctx = useContext(LecturerContext);
  if (!ctx) throw new Error('useLecturer must be used within a LecturerProvider');
  return ctx;
}

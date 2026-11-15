import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Assessment, AssessmentKind, CalendarEvent, PrepStep } from '@/types/planner';
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/utils/storage';
import { localDateKey } from '@/utils/planner';

const DEFAULT_STEPS: Record<AssessmentKind, string[]> = {
  assignment: [
    'Read the brief and list what’s required',
    'Gather notes, lecture points and sources',
    'Write a first draft',
    'Review, reference and submit',
  ],
  test: [
    'Review the lecture summaries',
    'Go through the flashcards',
    'Attempt practice questions',
    'Revisit the topics you found hard',
  ],
  exam: [
    'List every topic covered this semester',
    'Review each lecture summary',
    'Work through past questions',
    'Take the lecture quizzes again',
    'Rest well the night before',
  ],
  project: ['Agree the scope and deliverables', 'Plan milestones', 'Build or write the main work', 'Test and review', 'Submit'],
};

export function defaultSteps(kind: AssessmentKind): PrepStep[] {
  return DEFAULT_STEPS[kind].map((text, i) => ({ id: `s${i}_${Date.now().toString(36)}`, text, done: false }));
}

/** Sample entries for a first launch, dated relative to today. */
function seedAssessments(): Assessment[] {
  const at = (days: number, hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  const now = new Date().toISOString();
  return [
    {
      id: 'a_seed1',
      kind: 'assignment',
      courseId: '1',
      courseCode: 'CSC 201',
      title: 'Linked list implementation',
      dueAt: at(3, 23),
      notes: 'Implement insert, delete and reverse for a singly linked list. Submit on the portal.',
      weight: 10,
      status: 'todo',
      steps: defaultSteps('assignment'),
      createdAt: now,
    },
    {
      id: 'a_seed2',
      kind: 'test',
      courseId: '3',
      courseCode: 'MTH 201',
      title: 'Matrices and determinants test',
      dueAt: at(6, 10),
      venue: 'Auditorium 1',
      weight: 15,
      status: 'todo',
      steps: defaultSteps('test'),
      createdAt: now,
    },
    {
      id: 'a_seed3',
      kind: 'exam',
      courseId: '2',
      courseCode: 'CSC 205',
      title: 'Mid-semester exam',
      dueAt: at(12, 9),
      venue: 'LT B',
      weight: 30,
      status: 'todo',
      steps: defaultSteps('exam'),
      createdAt: now,
    },
  ];
}

/** Sample academic calendar; replaced by the university's calendar from the backend. */
function seedCalendar(): CalendarEvent[] {
  const day = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return localDateKey(d);
  };
  return [
    { id: 'c1', title: 'Semester began', date: day(-42), kind: 'semester' },
    { id: 'c2', title: 'Mid-semester break', date: day(18), endDate: day(22), kind: 'holiday' },
    { id: 'c3', title: 'Examination period', date: day(56), endDate: day(70), kind: 'exams' },
    { id: 'c4', title: 'Semester ends', date: day(72), kind: 'semester' },
  ];
}

interface PlannerState {
  assessments: Assessment[];
  calendar: CalendarEvent[];
}

interface PlannerContextType extends PlannerState {
  hydrated: boolean;
  getAssessment: (id: string) => Assessment | undefined;
  addAssessment: (a: Omit<Assessment, 'id' | 'createdAt' | 'steps' | 'status'> & { steps?: PrepStep[] }) => string;
  updateAssessment: (id: string, patch: Partial<Assessment>) => void;
  deleteAssessment: (id: string) => void;
  toggleStep: (assessmentId: string, stepId: string) => void;
}

const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<PlannerState>({ assessments: [], calendar: [] });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    loadJSON<PlannerState>(STORAGE_KEYS.planner).then((saved) => {
      setData(saved ?? { assessments: seedAssessments(), calendar: seedCalendar() });
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) saveJSON(STORAGE_KEYS.planner, data);
  }, [data, hydrated]);

  const getAssessment = useCallback((id: string) => data.assessments.find((a) => a.id === id), [data.assessments]);

  const addAssessment: PlannerContextType['addAssessment'] = (a) => {
    const id = `a_${Date.now().toString(36)}`;
    const item: Assessment = {
      ...a,
      id,
      status: 'todo',
      steps: a.steps ?? defaultSteps(a.kind),
      createdAt: new Date().toISOString(),
    };
    setData((d) => ({ ...d, assessments: [...d.assessments, item] }));
    return id;
  };

  const updateAssessment = (id: string, patch: Partial<Assessment>) =>
    setData((d) => ({ ...d, assessments: d.assessments.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));

  const deleteAssessment = (id: string) =>
    setData((d) => ({ ...d, assessments: d.assessments.filter((a) => a.id !== id) }));

  const toggleStep = (assessmentId: string, stepId: string) =>
    setData((d) => ({
      ...d,
      assessments: d.assessments.map((a) => {
        if (a.id !== assessmentId) return a;
        const steps = a.steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s));
        const doneCount = steps.filter((s) => s.done).length;
        const status = doneCount === 0 ? 'todo' : doneCount === steps.length ? 'done' : 'in-progress';
        return { ...a, steps, status };
      }),
    }));

  return (
    <PlannerContext.Provider
      value={{ ...data, hydrated, getAssessment, addAssessment, updateAssessment, deleteAssessment, toggleStep }}
    >
      {children}
    </PlannerContext.Provider>
  );
}

export function usePlanner() {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error('usePlanner must be used within a PlannerProvider');
  return ctx;
}

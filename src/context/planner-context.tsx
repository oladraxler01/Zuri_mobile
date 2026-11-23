import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Assessment, AssessmentKind, CalendarEvent, PrepStep } from '@/types/planner';
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/utils/storage';
import { localDateKey } from '@/utils/planner';
import { onReset } from '@/utils/reset';

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

/** Ids of the made-up calendar events earlier versions added. */
const SEED_CALENDAR_IDS = new Set(['c1', 'c2', 'c3', 'c4']);

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

  // "Delete all my data" empties this store.
  useEffect(() => onReset(() => setData({ assessments: [], calendar: [] })), []);

  useEffect(() => {
    loadJSON<PlannerState>(STORAGE_KEYS.planner).then((saved) => {
      // New students start empty. Earlier versions added made-up starter items
      // (ids a_seed*, and calendar c1-c4); remove those from older installs.
      setData(
        saved
          ? {
              ...saved,
              assessments: (saved.assessments ?? []).filter((a) => !a.id.startsWith('a_seed')),
              calendar: (saved.calendar ?? []).filter((c) => !SEED_CALENDAR_IDS.has(c.id)),
            }
          : { assessments: [], calendar: [] }
      );
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

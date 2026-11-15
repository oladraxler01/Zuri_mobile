import type { IoniconName } from '@/types/lecture';

export type AssessmentKind = 'assignment' | 'test' | 'exam' | 'project';

export const ASSESSMENT_KINDS: { key: AssessmentKind; label: string; icon: IoniconName }[] = [
  { key: 'assignment', label: 'Assignment', icon: 'document-text-outline' },
  { key: 'test', label: 'Test', icon: 'create-outline' },
  { key: 'exam', label: 'Exam', icon: 'school-outline' },
  { key: 'project', label: 'Project', icon: 'construct-outline' },
];

export type AssessmentStatus = 'todo' | 'in-progress' | 'done';

export interface PrepStep {
  id: string;
  text: string;
  done: boolean;
}

/** An assignment, test, exam or project with a due date. */
export interface Assessment {
  id: string;
  kind: AssessmentKind;
  courseId: string;
  courseCode: string;
  title: string;
  /** ISO timestamp the work is due / the exam starts */
  dueAt: string;
  venue?: string;
  notes?: string;
  /** % of the final grade, if known */
  weight?: number;
  status: AssessmentStatus;
  steps: PrepStep[];
  createdAt: string;
}

/** Fixed dates in the academic calendar (semester start, exam period, holidays). */
export interface CalendarEvent {
  id: string;
  title: string;
  /** ISO date (YYYY-MM-DD) */
  date: string;
  endDate?: string;
  kind: 'semester' | 'exams' | 'holiday';
}

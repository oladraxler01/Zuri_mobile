import type { Assessment, AssessmentKind } from '@/types/planner';

const DAY = 24 * 60 * 60 * 1000;

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysUntil(iso: string, now = new Date()) {
  return Math.round((startOfDay(new Date(iso)).getTime() - startOfDay(now).getTime()) / DAY);
}

/** "Overdue by 2 days" · "Due today, 11:00 PM" · "Due tomorrow" · "Due in 5 days" · "Due Mon 24 Nov" */
export function describeDue(a: Pick<Assessment, 'dueAt' | 'kind'>, now = new Date()): string {
  const due = new Date(a.dueAt);
  const verb = a.kind === 'exam' || a.kind === 'test' ? 'Starts' : 'Due';
  const time = due.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (due < now) {
    const late = Math.max(1, -daysUntil(a.dueAt, now));
    return daysUntil(a.dueAt, now) === 0 ? `${verb === 'Due' ? 'Was due' : 'Started'} today` : `Overdue by ${late} day${late > 1 ? 's' : ''}`;
  }
  const d = daysUntil(a.dueAt, now);
  if (d === 0) return `${verb} today, ${time}`;
  if (d === 1) return `${verb} tomorrow, ${time}`;
  if (d < 7) return `${verb} in ${d} days`;
  return `${verb} ${due.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}`;
}

export function formatDue(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

export type DeadlineGroup = 'overdue' | 'this-week' | 'next-week' | 'later' | 'done';

export function groupDeadlines(items: Assessment[], now = new Date()) {
  const groups: Record<DeadlineGroup, Assessment[]> = { overdue: [], 'this-week': [], 'next-week': [], later: [], done: [] };
  [...items]
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .forEach((a) => {
      if (a.status === 'done') groups.done.push(a);
      else if (new Date(a.dueAt) < now) groups.overdue.push(a);
      else if (daysUntil(a.dueAt, now) < 7) groups['this-week'].push(a);
      else if (daysUntil(a.dueAt, now) < 14) groups['next-week'].push(a);
      else groups.later.push(a);
    });
  return groups;
}

// ─── Study plan ───────────────────────────────────────────────────

const MINUTES_NEEDED: Record<AssessmentKind, number> = {
  exam: 420,
  test: 180,
  assignment: 240,
  project: 360,
};

export interface StudyBlock {
  /** YYYY-MM-DD */
  date: string;
  assessmentId: string;
  courseCode: string;
  title: string;
  kind: AssessmentKind;
  minutes: number;
}

/**
 * Spread study time for upcoming work across the next `days` days.
 * Greedy and simple: each day gets a budget from your weekly study hours,
 * and the soonest deadlines are served first. Exams and tests stop the day
 * before; assignments can be worked on until the due day.
 */
export function buildStudyPlan(
  assessments: Assessment[],
  weeklyStudyHours: number,
  days = 7,
  now = new Date()
): StudyBlock[] {
  const dailyBudget = Math.max(30, Math.round((weeklyStudyHours * 60) / 7));
  const open = assessments
    .filter((a) => a.status !== 'done' && new Date(a.dueAt) > now && daysUntil(a.dueAt, now) <= 21)
    .map((a) => {
      const remainingShare = a.steps.length ? a.steps.filter((s) => !s.done).length / a.steps.length : 1;
      return { a, remaining: Math.round((MINUTES_NEEDED[a.kind] * remainingShare) / 15) * 15 };
    })
    .sort((x, y) => x.a.dueAt.localeCompare(y.a.dueAt));

  const blocks: StudyBlock[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(startOfDay(now).getTime() + i * DAY);
    let budget = dailyBudget;
    for (const item of open) {
      if (budget < 15 || item.remaining <= 0) continue;
      const due = startOfDay(new Date(item.a.dueAt));
      const lastDay = item.a.kind === 'exam' || item.a.kind === 'test' ? due.getTime() - DAY : due.getTime();
      if (day.getTime() > lastDay) continue;
      // Spread evenly over the days left rather than cramming on day one.
      const daysLeft = Math.max(1, Math.round((lastDay - day.getTime()) / DAY) + 1);
      const share = Math.ceil(item.remaining / daysLeft / 15) * 15;
      const minutes = Math.min(item.remaining, budget, Math.max(30, Math.min(share, 120)));
      if (minutes < 15) continue;
      blocks.push({
        date: localDateKey(day),
        assessmentId: item.a.id,
        courseCode: item.a.courseCode,
        title: item.a.title,
        kind: item.a.kind,
        minutes,
      });
      item.remaining -= minutes;
      budget -= minutes;
    }
  }
  return blocks;
}

export function localDateKey(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

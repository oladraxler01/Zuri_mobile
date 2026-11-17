import {
  buildStudyPlan,
  daysUntil,
  describeDue,
  groupDeadlines,
  localDateKey,
  startOfDay,
} from '../planner';
import type { Assessment } from '@/types/planner';

// Local-time dates so the tests pass in any timezone.
const at = (y: number, mo: number, d: number, h = 9, mi = 0) => new Date(y, mo - 1, d, h, mi);
const NOW = at(2026, 11, 17, 9); // Tue 17 Nov 2026, 09:00

let seq = 0;
function assessment(over: Partial<Assessment> & Pick<Assessment, 'dueAt'>): Assessment {
  seq += 1;
  return {
    id: `a${seq}`,
    kind: 'assignment',
    courseId: 'c1',
    courseCode: 'CSC 301',
    title: `Work ${seq}`,
    status: 'todo',
    steps: [],
    createdAt: NOW.toISOString(),
    ...over,
  };
}

describe('startOfDay / daysUntil / localDateKey', () => {
  it('drops the time of day', () => {
    expect(startOfDay(at(2026, 11, 17, 23, 59)).getTime()).toBe(at(2026, 11, 17, 0).getTime());
  });

  it('counts calendar days, not 24-hour periods', () => {
    expect(daysUntil(at(2026, 11, 17, 23).toISOString(), NOW)).toBe(0);
    expect(daysUntil(at(2026, 11, 18, 1).toISOString(), NOW)).toBe(1);
    expect(daysUntil(at(2026, 11, 15, 12).toISOString(), NOW)).toBe(-2);
  });

  it('formats a local YYYY-MM-DD key', () => {
    expect(localDateKey(at(2026, 1, 5))).toBe('2026-01-05');
  });
});

describe('describeDue', () => {
  it('says how late overdue work is', () => {
    expect(describeDue({ dueAt: at(2026, 11, 15).toISOString(), kind: 'assignment' }, NOW)).toBe('Overdue by 2 days');
    expect(describeDue({ dueAt: at(2026, 11, 16).toISOString(), kind: 'assignment' }, NOW)).toBe('Overdue by 1 day');
  });

  it('says "Was due today" / "Started today" for earlier today', () => {
    expect(describeDue({ dueAt: at(2026, 11, 17, 8).toISOString(), kind: 'assignment' }, NOW)).toBe('Was due today');
    expect(describeDue({ dueAt: at(2026, 11, 17, 8).toISOString(), kind: 'exam' }, NOW)).toBe('Started today');
  });

  it('uses "Starts" for exams and tests, "Due" otherwise', () => {
    expect(describeDue({ dueAt: at(2026, 11, 17, 15).toISOString(), kind: 'exam' }, NOW)).toMatch(/^Starts today, /);
    expect(describeDue({ dueAt: at(2026, 11, 18, 15).toISOString(), kind: 'test' }, NOW)).toMatch(/^Starts tomorrow, /);
    expect(describeDue({ dueAt: at(2026, 11, 18, 15).toISOString(), kind: 'project' }, NOW)).toMatch(/^Due tomorrow, /);
  });

  it('counts days within a week, then shows the date', () => {
    expect(describeDue({ dueAt: at(2026, 11, 21).toISOString(), kind: 'assignment' }, NOW)).toBe('Due in 4 days');
    expect(describeDue({ dueAt: at(2026, 11, 30).toISOString(), kind: 'assignment' }, NOW)).toMatch(/^Due /);
    expect(describeDue({ dueAt: at(2026, 11, 30).toISOString(), kind: 'assignment' }, NOW)).not.toMatch(/in \d+ days/);
  });
});

describe('groupDeadlines', () => {
  it('sorts work into overdue, this week, next week, later and done', () => {
    const overdue = assessment({ dueAt: at(2026, 11, 16).toISOString() });
    const thisWeek = assessment({ dueAt: at(2026, 11, 20).toISOString() });
    const nextWeek = assessment({ dueAt: at(2026, 11, 26).toISOString() });
    const later = assessment({ dueAt: at(2026, 12, 10).toISOString() });
    const done = assessment({ dueAt: at(2026, 11, 16).toISOString(), status: 'done' });

    const g = groupDeadlines([later, done, nextWeek, overdue, thisWeek], NOW);
    expect(g.overdue).toEqual([overdue]);
    expect(g['this-week']).toEqual([thisWeek]);
    expect(g['next-week']).toEqual([nextWeek]);
    expect(g.later).toEqual([later]);
    expect(g.done).toEqual([done]);
  });

  it('keeps each group in due-date order', () => {
    const b = assessment({ dueAt: at(2026, 11, 21).toISOString() });
    const a = assessment({ dueAt: at(2026, 11, 19).toISOString() });
    expect(groupDeadlines([b, a], NOW)['this-week'].map((x) => x.id)).toEqual([a.id, b.id]);
  });
});

describe('buildStudyPlan', () => {
  const total = (blocks: { minutes: number }[]) => blocks.reduce((n, b) => n + b.minutes, 0);

  it('returns nothing when there is no open work', () => {
    expect(buildStudyPlan([], 10, 7, NOW)).toEqual([]);
    const done = assessment({ dueAt: at(2026, 11, 20).toISOString(), status: 'done' });
    expect(buildStudyPlan([done], 10, 7, NOW)).toEqual([]);
  });

  it('ignores work more than 21 days away or already past', () => {
    const far = assessment({ dueAt: at(2026, 12, 20).toISOString() });
    const past = assessment({ dueAt: at(2026, 11, 10).toISOString() });
    expect(buildStudyPlan([far, past], 10, 7, NOW)).toEqual([]);
  });

  it('never goes over the daily budget', () => {
    const work = [
      assessment({ kind: 'exam', dueAt: at(2026, 11, 22).toISOString() }),
      assessment({ kind: 'project', dueAt: at(2026, 11, 23).toISOString() }),
      assessment({ kind: 'assignment', dueAt: at(2026, 11, 19).toISOString() }),
    ];
    const weeklyHours = 7; // 60 min a day
    const blocks = buildStudyPlan(work, weeklyHours, 7, NOW);
    const byDay = new Map<string, number>();
    for (const b of blocks) byDay.set(b.date, (byDay.get(b.date) ?? 0) + b.minutes);
    for (const minutes of byDay.values()) expect(minutes).toBeLessThanOrEqual(60);
  });

  it('stops exam prep the day before the exam', () => {
    const exam = assessment({ kind: 'exam', dueAt: at(2026, 11, 20, 9).toISOString() });
    const blocks = buildStudyPlan([exam], 40, 7, NOW);
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) expect(b.date <= '2026-11-19').toBe(true);
  });

  it('lets assignments be worked on up to the due day', () => {
    const work = assessment({ kind: 'assignment', dueAt: at(2026, 11, 18, 23).toISOString() });
    const dates = buildStudyPlan([work], 40, 7, NOW).map((b) => b.date);
    expect(dates).toContain('2026-11-18');
  });

  it('plans only the remaining share of work with steps done', () => {
    const half = assessment({
      kind: 'project', // 360 min when nothing is done
      dueAt: at(2026, 12, 1).toISOString(),
      steps: [
        { id: 's1', text: 'Outline', done: true },
        { id: 's2', text: 'Draft', done: false },
      ],
    });
    const blocks = buildStudyPlan([half], 100, 21, NOW);
    expect(total(blocks)).toBeLessThanOrEqual(180);
  });

  it('serves the soonest deadline first each day', () => {
    const soon = assessment({ kind: 'assignment', dueAt: at(2026, 11, 19).toISOString() });
    const later = assessment({ kind: 'assignment', dueAt: at(2026, 11, 28).toISOString() });
    const firstDay = buildStudyPlan([later, soon], 7, 1, NOW);
    expect(firstDay[0]?.assessmentId).toBe(soon.id);
  });
});

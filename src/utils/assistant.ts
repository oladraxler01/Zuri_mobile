import type { CourseItem, TimetableSlot } from '@/context/academic-context';
import type { Assessment } from '@/types/planner';
import type { Lecture } from '@/types/lecture';
import { parseTimeOfDay } from '@/utils/time';

/**
 * The personal assistant (the round Zuri button). It answers questions about
 * the student's own day from what's on the phone: classes, tests and
 * deadlines, recorded lectures. Anything else goes to Zuri's AI with a short
 * summary of the same data as context (buildAssistantContext).
 */

export interface AssistantData {
  courses: CourseItem[];
  timetable: TimetableSlot[];
  assessments: Assessment[];
  lectures: Lecture[];
}

const DAY_CODES: TimetableSlot['day'][] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const KIND_LABEL: Record<Assessment['kind'], string> = {
  assignment: 'Assignment',
  test: 'Test',
  exam: 'Exam',
  project: 'Project',
};

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function dateOf(d: Date): string {
  return d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' });
}

/** Classes on a given date, earliest first. */
export function classesOn(data: AssistantData, date: Date): TimetableSlot[] {
  const code = DAY_CODES[date.getDay()];
  return data.timetable
    .filter((s) => s.day === code)
    .sort((a, b) => parseTimeOfDay(a.startTime) - parseTimeOfDay(b.startTime));
}

/** Unfinished assessments due in [from, to), soonest first. */
export function assessmentsBetween(data: AssistantData, from: Date, to: Date): Assessment[] {
  return data.assessments
    .filter((a) => a.status !== 'done')
    .filter((a) => {
      const t = new Date(a.dueAt).getTime();
      return t >= from.getTime() && t < to.getTime();
    })
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
}

function courseTitle(data: AssistantData, slot: TimetableSlot): string {
  const c = data.courses.find((x) => x.id === slot.courseId);
  return c?.title && c.title !== slot.courseCode ? ` (${c.title})` : '';
}

function classLine(data: AssistantData, s: TimetableSlot): string {
  return `• ${s.startTime} – ${s.endTime}: ${s.courseCode}${courseTitle(data, s)}${s.venue ? `, ${s.venue}` : ''}`;
}

function assessmentLine(a: Assessment, withDate: boolean): string {
  const d = new Date(a.dueAt);
  const when = withDate ? `${d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}, ${timeOf(a.dueAt)}` : timeOf(a.dueAt);
  return `• ${KIND_LABEL[a.kind]}: ${a.courseCode} ${a.title} (${when}${a.venue ? `, ${a.venue}` : ''})`;
}

interface DayScope {
  kind: 'day';
  date: Date;
  label: string;
}
interface WeekScope {
  kind: 'week';
  from: Date;
  to: Date;
  label: string;
}
type Scope = DayScope | WeekScope;

/** Which day(s) the question is about. Defaults to today. */
function scopeOf(q: string, now: Date): Scope | null {
  const today = startOfDay(now);
  if (/\btomorrow\b/.test(q)) return { kind: 'day', date: addDays(today, 1), label: 'tomorrow' };
  if (/\bnext week\b/.test(q)) {
    const daysToMon = ((8 - today.getDay()) % 7) || 7;
    const from = addDays(today, daysToMon);
    return { kind: 'week', from, to: addDays(from, 7), label: 'next week' };
  }
  if (/\b(this week|the week|week|coming up|upcoming|soon)\b/.test(q)) {
    return { kind: 'week', from: today, to: addDays(today, 7), label: 'in the next 7 days' };
  }
  for (let i = 0; i < 7; i++) {
    if (new RegExp(`\\b${DAY_NAMES[i]}\\b`).test(q)) {
      const offset = (i - today.getDay() + 7) % 7;
      return { kind: 'day', date: addDays(today, offset), label: offset === 0 ? 'today' : `on ${dateOf(addDays(today, offset))}` };
    }
  }
  if (/\b(today|tonight|now)\b/.test(q)) return { kind: 'day', date: today, label: 'today' };
  return null;
}

function classesAnswer(data: AssistantData, scope: Scope): string {
  if (!data.timetable.length) {
    return 'You haven’t added your timetable yet. Open Courses, tap Add Course and pick the days and time, and I’ll keep track of your classes.';
  }
  if (scope.kind === 'day') {
    const list = classesOn(data, scope.date);
    if (!list.length) return `You have no classes ${scope.label}. 🎉`;
    return `You have ${list.length} ${list.length === 1 ? 'class' : 'classes'} ${scope.label}:\n${list.map((s) => classLine(data, s)).join('\n')}`;
  }
  const lines: string[] = [];
  for (let d = scope.from; d < scope.to; d = addDays(d, 1)) {
    const list = classesOn(data, d);
    if (list.length) lines.push(`${dateOf(d)}\n${list.map((s) => classLine(data, s)).join('\n')}`);
  }
  return lines.length ? `Your classes ${scope.label}:\n\n${lines.join('\n\n')}` : `You have no classes ${scope.label}.`;
}

function assessmentsAnswer(data: AssistantData, scope: Scope, kinds: Assessment['kind'][] | null): string {
  const from = scope.kind === 'day' ? scope.date : scope.from;
  const to = scope.kind === 'day' ? addDays(scope.date, 1) : scope.to;
  const all = assessmentsBetween(data, from, to);
  const list = kinds ? all.filter((a) => kinds.includes(a.kind)) : all;
  const what = !kinds ? 'tests or deadlines' : kinds.includes('assignment') && kinds.length === 1 ? 'assignments due' : 'tests or exams';
  if (!list.length) {
    // Point at the next one, so "no" is still useful.
    const next = assessmentsBetween(data, to, new Date(to.getTime() + 60 * DAY_MS)).filter((a) => !kinds || kinds.includes(a.kind))[0];
    return `No ${what} ${scope.label}.` + (next ? `\nThe next one is ${assessmentLine(next, true).slice(2)}.` : '');
  }
  const withDate = scope.kind === 'week';
  return `Yes, ${list.length} ${scope.label}:\n${list.map((a) => assessmentLine(a, withDate)).join('\n')}`;
}

function recordedAnswer(data: AssistantData, scope: Scope | null, now: Date): string {
  const from = scope ? (scope.kind === 'day' ? scope.date : addDays(startOfDay(now), -7)) : addDays(startOfDay(now), -7);
  const to = scope?.kind === 'day' ? addDays(scope.date, 1) : addDays(startOfDay(now), 1);
  const list = data.lectures
    .filter((l) => {
      const t = new Date(l.createdAt).getTime();
      return t >= from.getTime() && t < to.getTime();
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const label = scope?.kind === 'day' ? scope.label : 'in the last 7 days';
  if (!list.length) return `You haven’t recorded any lectures ${label}. Tap Record on Home when your next class starts.`;
  return (
    `You recorded ${list.length} ${list.length === 1 ? 'lecture' : 'lectures'} ${label}:\n` +
    list
      .map((l) => `• ${l.courseCode}: ${l.analysis?.title || 'Lecture'} (${new Date(l.createdAt).toLocaleDateString([], { weekday: 'short' })}${l.status === 'ready' ? ', notes ready' : ''})`)
      .join('\n')
  );
}

/** A short rundown of today and the week ahead. */
export function summaryAnswer(data: AssistantData, now = new Date()): string {
  const today = startOfDay(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayClasses = classesOn(data, today);
  const left = todayClasses.filter((s) => parseTimeOfDay(s.endTime) > nowMin);
  const dueToday = assessmentsBetween(data, today, addDays(today, 1));
  const week = assessmentsBetween(data, addDays(today, 1), addDays(today, 7));
  const recorded = data.lectures.filter((l) => new Date(l.createdAt) >= addDays(today, -7));
  const ready = recorded.filter((l) => l.status === 'ready').length;

  const parts: string[] = [];
  if (!data.timetable.length) parts.push('📅 No timetable yet. Add your classes in Courses.');
  else if (!todayClasses.length) parts.push('📅 No classes today.');
  else if (!left.length) parts.push(`📅 You’re done with today’s ${todayClasses.length} ${todayClasses.length === 1 ? 'class' : 'classes'}.`);
  else parts.push(`📅 ${left.length} ${left.length === 1 ? 'class' : 'classes'} left today. Next: ${left[0].courseCode} at ${left[0].startTime}${left[0].venue ? `, ${left[0].venue}` : ''}.`);

  if (dueToday.length) parts.push(`⚠️ Due today:\n${dueToday.map((a) => assessmentLine(a, false)).join('\n')}`);
  if (week.length) parts.push(`📝 This week:\n${week.slice(0, 5).map((a) => assessmentLine(a, true)).join('\n')}${week.length > 5 ? `\n…and ${week.length - 5} more` : ''}`);
  if (!dueToday.length && !week.length) parts.push('📝 Nothing due in the next 7 days.');

  parts.push(
    recorded.length
      ? `🎙️ ${recorded.length} ${recorded.length === 1 ? 'lecture' : 'lectures'} recorded this week, ${ready} with notes ready.`
      : '🎙️ No lectures recorded this week.'
  );
  return parts.join('\n\n');
}

/**
 * Answer from the phone's data, or null when the question needs Zuri's AI.
 */
export function answerLocally(question: string, data: AssistantData, now = new Date()): string | null {
  const q = question.toLowerCase().replace(/[’']/g, '');
  const scope = scopeOf(q, now);

  if (/\b(summar|overview|rundown|recap|activities|my day|my week|how am i doing|whats (up|happening|on)|catch me up)/.test(q)) {
    return summaryAnswer(data, now);
  }
  if (/\b(record|recorded|recording)\b/.test(q) && /\blecture|class|recorded|recording/.test(q)) {
    return recordedAnswer(data, scope, now);
  }
  const testy = /\b(tests?|exams?|quiz(zes)?|ca|midterms?)\b/.test(q);
  const duey = /\b(assignments?|deadlines?|due|submit|projects?|homework)\b/.test(q);
  if (testy || duey) {
    const kinds: Assessment['kind'][] | null = testy && !duey ? ['test', 'exam'] : duey && !testy && /assignment/.test(q) ? ['assignment'] : null;
    return assessmentsAnswer(data, scope ?? { kind: 'day', date: startOfDay(now), label: 'today' }, kinds);
  }
  if (/\b(class|classes|lectures?|timetable|schedule|free)\b/.test(q)) {
    return classesAnswer(data, scope ?? { kind: 'day', date: startOfDay(now), label: 'today' });
  }
  if (/\bnext class\b|\bwhere (is|am)\b/.test(q)) {
    return classesAnswer(data, { kind: 'day', date: startOfDay(now), label: 'today' });
  }
  return null;
}

/** The same facts as plain text, for Zuri's AI when it answers a broader question. */
export function buildAssistantContext(data: AssistantData, now = new Date()): string {
  const today = startOfDay(now);
  const lines = [
    `Today is ${dateOf(today)}, ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`,
    `The student's courses: ${data.courses.map((c) => `${c.code} ${c.title}`).join('; ') || 'none added'}.`,
    `Weekly timetable: ${
      data.timetable.map((s) => `${s.day} ${s.startTime}-${s.endTime} ${s.courseCode}${s.venue ? ` at ${s.venue}` : ''}`).join('; ') || 'not added'
    }.`,
    `Upcoming tests and deadlines (next 30 days): ${
      assessmentsBetween(data, now, addDays(today, 30))
        .map((a) => `${KIND_LABEL[a.kind]} ${a.courseCode} ${a.title} on ${new Date(a.dueAt).toDateString()} ${timeOf(a.dueAt)}`)
        .join('; ') || 'none'
    }.`,
    `Lectures recorded in the last 14 days: ${
      data.lectures
        .filter((l) => new Date(l.createdAt) >= addDays(today, -14))
        .map((l) => `${l.courseCode} ${l.analysis?.title ?? ''} (${new Date(l.createdAt).toDateString()})`)
        .join('; ') || 'none'
    }.`,
  ];
  return `This is the student's own schedule in the Zuri app. Use it to answer questions about their day.\n${lines.join('\n')}`;
}

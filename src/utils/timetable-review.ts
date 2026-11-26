import type { TimetableSlot } from '@/context/academic-context';
import type { ConfirmClassInput, CourseMatchDTO, ImportedClassDTO } from '@/services/timetable-import-api';

/** One class in the review list before it's saved. */
export interface ReviewRow {
  key: string;
  code: string;
  title: string;
  day: TimetableSlot['day'];
  /** "08:00", 24-hour */
  start: string;
  end: string;
  venue: string;
  /** What the server matched the course to; null for rows added or re-coded on the phone. */
  match: CourseMatchDTO | null;
  warnings: string[];
}

export const REVIEW_DAYS: TimetableSlot['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const squash = (code: string) => code.replace(/\s+/g, '').toUpperCase();

/** Server day (1 = Monday, 0 or 7 = Sunday) → app day. */
export function dayFromNumber(n: number): TimetableSlot['day'] {
  if (n === 0 || n === 7) return 'Sun';
  return REVIEW_DAYS[Math.max(0, Math.min(5, n - 1))];
}

/** App day → server day (Sunday is 0, as for single slots). */
export function dayToNumber(d: TimetableSlot['day']): number {
  return d === 'Sun' ? 0 : REVIEW_DAYS.indexOf(d) + 1;
}

/**
 * Read a time the way students type it: "8", "8:30", "8.30am", "2pm", "14:00", "02:00 PM".
 * Returns "HH:MM" (24-hour) or null. Without am/pm, 1–6 (no leading zero) means afternoon, as on lecture timetables.
 */
export function parseClockTime(input: string): string | null {
  const m = input.trim().toLowerCase().match(/^(\d{1,2})(?:[:.](\d{2}))?(?::\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const mer = m[3]?.replace(/\./g, '');
  if (min > 59) return null;
  if (mer) {
    if (h < 1 || h > 12) return null;
    if (mer === 'pm' && h < 12) h += 12;
    if (mer === 'am' && h === 12) h = 0;
  } else {
    if (h > 23) return null;
    if (h >= 1 && h <= 6 && !/^0/.test(m[1])) h += 12; // "02:00" stays as typed
  }
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** "14:05" → "02:05 PM" */
export function clock12(hhmm: string): string {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return hhmm;
  const h = parseInt(m[1], 10);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function rowFromServer(c: ImportedClassDTO): ReviewRow {
  return {
    key: c.key,
    code: c.course_code,
    title: c.course_title ?? c.course_match?.title ?? '',
    day: dayFromNumber(c.day_of_week),
    start: parseClockTime(c.start_time) ?? c.start_time,
    end: parseClockTime(c.end_time) ?? c.end_time,
    venue: c.venue ?? '',
    match: c.course_match ?? null,
    warnings: c.warnings ?? [],
  };
}

/** What's wrong with a row, in words, or null if it can be saved. */
export function rowProblem(r: ReviewRow): string | null {
  if (!r.code.trim()) return 'Add the course code.';
  const start = parseClockTime(r.start);
  const end = parseClockTime(r.end);
  if (!start || !end) return 'Check the start and end times.';
  if (end <= start) return 'The class has to end after it starts.';
  return null;
}

/** The server's course id, but only while the row still has the code it was matched on. */
export function matchedCourseId(r: ReviewRow): string | undefined {
  if (!r.match?.course_id) return undefined;
  return squash(r.match.code) === squash(r.code) ? r.match.course_id : undefined;
}

export function rowToConfirm(r: ReviewRow): ConfirmClassInput {
  const courseId = matchedCourseId(r);
  return {
    ...(courseId ? { course_id: courseId } : {}),
    course_code: r.code.trim(),
    ...(r.title.trim() ? { course_title: r.title.trim() } : {}),
    day_of_week: dayToNumber(r.day),
    start_time: parseClockTime(r.start)!,
    end_time: parseClockTime(r.end)!,
    ...(r.venue.trim() ? { venue: r.venue.trim() } : {}),
    recurrence: 'weekly',
  };
}

/**
 * A department timetable lists every level. A row is "theirs" when it's a course they
 * already take, or its number starts with their level (300L → CSC 3xx).
 */
export function isStudentsRow(r: ReviewRow, level: string): boolean {
  if (r.match && (r.match.kind === 'enrolled' || r.match.kind === 'personal') && matchedCourseId(r)) return true;
  const digit = String(parseInt(level, 10) / 100);
  const num = r.code.match(/(\d{3})/)?.[1];
  return !!num && num.startsWith(digit);
}

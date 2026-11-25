import type { CourseItem, TimetableSlot } from '@/context/academic-context';

/**
 * Read a timetable from plain text / CSV, one class per line, in any order:
 *   CSC 201, Mon, 09:00 AM, 11:00 AM, Faculty Lab 2
 *   Monday 9-11 CSC201 LT B
 *   Wed;10:00;12:00;MTH 201;Auditorium 1
 * Lines without a course code and a day (headers, blank lines) are skipped.
 */

const DAY_MAP: Record<string, TimetableSlot['day']> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

export interface ParsedTimetable {
  slots: Omit<TimetableSlot, 'id' | 'courseId'>[];
  /** course codes found in the file that aren't in the student's courses yet */
  unknownCodes: string[];
  skipped: { line: string; reason: string }[];
}

function to12h(h: number, m: number, mer?: string): string {
  let hour = h;
  if (mer) {
    const pm = mer.toLowerCase() === 'pm';
    if (pm && hour < 12) hour += 12;
    if (!pm && hour === 12) hour = 0;
  } else if (hour >= 1 && hour <= 6) {
    hour += 12; // "2-4" in a lecture timetable means afternoon
  }
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function normaliseCode(raw: string) {
  const m = raw.match(/([A-Za-z]{2,4})\s*-?\s*(\d{3})/);
  return m ? `${m[1].toUpperCase()} ${m[2]}` : raw.toUpperCase().trim();
}

export function parseTimetableText(text: string, courses: Pick<CourseItem, 'code'>[]): ParsedTimetable {
  const known = new Set(courses.map((c) => normaliseCode(c.code)));
  const slots: ParsedTimetable['slots'] = [];
  const unknown = new Set<string>();
  const skipped: ParsedTimetable['skipped'] = [];

  for (const rawLine of text.replace(/\r/g, '').split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const codeM = line.match(/\b([A-Za-z]{2,4})\s*-?\s*(\d{3})\b/);
    const dayM = line.match(/\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/i);
    if (!codeM || !dayM) {
      if (codeM || dayM) skipped.push({ line, reason: codeM ? 'No day found' : 'No course code found' });
      continue;
    }
    const code = `${codeM[1].toUpperCase()} ${codeM[2]}`;
    const day = DAY_MAP[dayM[1].toLowerCase()];

    // Remove the code and day, then look for times like 9, 09:00, 9am, 2:30 PM.
    let rest = line.replace(codeM[0], ' ').replace(dayM[0], ' ');
    const timeRe = /\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?\b/gi;
    const times: { h: number; m: number; mer?: string; raw: string }[] = [];
    let t: RegExpExecArray | null;
    while ((t = timeRe.exec(rest)) && times.length < 2) {
      const h = parseInt(t[1], 10);
      const m = t[2] ? parseInt(t[2], 10) : 0;
      if (h > 23 || m > 59) continue;
      // A bare number is only a time if it's followed by a range separator or am/pm, or has minutes.
      const after = rest.slice(t.index + t[0].length, t.index + t[0].length + 3);
      if (!t[2] && !t[3] && times.length === 0 && !/^\s*[-–to]/.test(after)) continue;
      times.push({ h, m, mer: t[3], raw: t[0] });
    }
    if (times.length < 2) {
      skipped.push({ line, reason: 'Couldn’t find a start and end time' });
      continue;
    }
    // "10-12pm" → both PM only if the end is PM and the start would otherwise be after it.
    const endMer = times[1].mer;
    const startMer = times[0].mer ?? (endMer && times[0].h <= times[1].h && endMer.toLowerCase() === 'am' ? 'am' : undefined);
    const startTime = to12h(times[0].h, times[0].m, startMer);
    const endTime = to12h(times[1].h, times[1].m, endMer);

    for (const x of times) rest = rest.replace(x.raw, ' ');
    const venue = rest
      .replace(/\b(to|from|venue|at)\b/gi, ' ')
      .replace(/[,;|\t\-–]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!known.has(code)) unknown.add(code);
    slots.push({ courseCode: code, day, startTime, endTime, venue: venue || 'Venue not given' });
  }

  return { slots, unknownCodes: [...unknown], skipped };
}

/** Classes on the same day whose times overlap. */
export function findClashes(slots: TimetableSlot[]): [TimetableSlot, TimetableSlot][] {
  const toMin = (v: string) => {
    const m = v.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!m) return 0;
    let h = parseInt(m[1], 10) % 12;
    if (m[3].toUpperCase() === 'PM') h += 12;
    return h * 60 + parseInt(m[2], 10);
  };
  const out: [TimetableSlot, TimetableSlot][] = [];
  for (let i = 0; i < slots.length; i++)
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i];
      const b = slots[j];
      if (a.day !== b.day) continue;
      if (toMin(a.startTime) < toMin(b.endTime) && toMin(b.startTime) < toMin(a.endTime)) out.push([a, b]);
    }
  return out;
}

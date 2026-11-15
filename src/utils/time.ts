import type { TimetableSlot } from '@/context/academic-context';

const DAY_INDEX: Record<TimetableSlot['day'], number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** "01:05:09" for long recordings, "05:09" otherwise. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = m.toString().padStart(2, '0');
  const ss = sec.toString().padStart(2, '0');
  return h > 0 ? `${h.toString().padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "1h 12m", "37m", "45s" */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

/** "Today, 2:14 PM" · "Yesterday, 9:00 AM" · "Mon 3 Nov" */
export function formatLectureDate(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  if (d.getTime() >= startOfToday) return `Today, ${time}`;
  if (d.getTime() >= startOfToday - dayMs) return `Yesterday, ${time}`;
  return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Parse "09:00 AM" → minutes after midnight. */
export function parseTimeOfDay(value: string): number {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 0;
  let h = parseInt(match[1], 10) % 12;
  const m = parseInt(match[2], 10);
  if (match[3]?.toUpperCase() === 'PM') h += 12;
  if (!match[3] && parseInt(match[1], 10) === 12) h = 12;
  return h * 60 + m;
}

export interface ClassOccurrence {
  slot: TimetableSlot;
  start: Date;
  end: Date;
  /** true while the class is running right now */
  inProgress: boolean;
}

/** Next (or current) occurrence of a weekly timetable slot. */
export function nextOccurrence(slot: TimetableSlot, now = new Date()): ClassOccurrence {
  const startMin = parseTimeOfDay(slot.startTime);
  let endMin = parseTimeOfDay(slot.endTime);
  if (endMin <= startMin) endMin = startMin + 60;

  const target = DAY_INDEX[slot.day];
  for (let offset = 0; offset <= 7; offset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    if (day.getDay() !== target) continue;
    const start = new Date(day.getTime() + startMin * 60000);
    const end = new Date(day.getTime() + endMin * 60000);
    if (end > now) {
      return { slot, start, end, inProgress: start <= now };
    }
  }
  // Fallback: same slot next week
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  const start = new Date(day.getTime() + startMin * 60000);
  return { slot, start, end: new Date(day.getTime() + endMin * 60000), inProgress: false };
}

/** All timetable slots ordered by when they next happen. */
export function upcomingClasses(timetable: TimetableSlot[], now = new Date()): ClassOccurrence[] {
  return timetable
    .map((slot) => nextOccurrence(slot, now))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** "Happening now" · "in 12 min" · "in 2h 5m" · "Tomorrow, 9:00 AM" · "Wed, 10:00 AM" */
export function describeStart(occ: ClassOccurrence, now = new Date()): string {
  if (occ.inProgress) return 'Happening now';
  const mins = Math.round((occ.start.getTime() - now.getTime()) / 60000);
  if (mins < 60) return `in ${Math.max(1, mins)} min`;
  const sameDay = occ.start.toDateString() === now.toDateString();
  if (sameDay) return `in ${Math.floor(mins / 60)}h ${mins % 60}m`;
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const time = occ.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (occ.start.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`;
  return `${occ.slot.day}, ${time}`;
}

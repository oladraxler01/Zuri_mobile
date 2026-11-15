import type { CourseItem, TimetableSlot } from '@/context/academic-context';
import type { Lecture } from '@/types/lecture';
import type { Material } from '@/types/material';
import type { Assessment } from '@/types/planner';
import type { IoniconName } from '@/types/lecture';
import { upcomingClasses } from '@/utils/time';
import { buildStudyPlan, daysUntil, describeDue, localDateKey } from '@/utils/planner';

/**
 * The in-app feed behind the notification centre and Home recommendations.
 * Built from the student's real data every time, so it's never stale:
 * nothing here needs a server.
 */

export type FeedKind = 'class-soon' | 'deadline' | 'exam' | 'lecture-ready' | 'lecture-waiting' | 'material-ready' | 'gap' | 'study-today';

export interface FeedItem {
  /** stable id, e.g. "gap:lec_abc" — used for read/dismiss state and /recommendation/[id] */
  id: string;
  kind: FeedKind;
  title: string;
  body: string;
  icon: IoniconName;
  /** when it happened / is due, for sorting and "2h ago" labels */
  at: string;
  /** higher = more important */
  priority: number;
  /** where tapping goes */
  href: string;
  /** recommendations get a detail page with reasons and steps */
  recommendation?: { why: string; steps: string[]; actions: { label: string; href: string }[] };
}

export interface FeedInput {
  timetable: TimetableSlot[];
  courses: CourseItem[];
  lectures: Lecture[];
  materials: Material[];
  assessments: Assessment[];
  weeklyStudyHours: number;
  now?: Date;
}

const HOUR = 3600_000;

export function buildFeed(input: FeedInput): FeedItem[] {
  const now = input.now ?? new Date();
  const items: FeedItem[] = [];
  const courseTitle = (id?: string) => input.courses.find((c) => c.id === id)?.title ?? '';

  // Classes starting within 2 hours (or happening now)
  for (const occ of upcomingClasses(input.timetable, now)) {
    const mins = Math.round((occ.start.getTime() - now.getTime()) / 60000);
    if (!occ.inProgress && mins > 120) continue;
    items.push({
      id: `class:${occ.slot.id}:${localDateKey(occ.start)}`,
      kind: 'class-soon',
      title: occ.inProgress ? `${occ.slot.courseCode} is on now` : `${occ.slot.courseCode} starts in ${Math.max(1, mins)} min`,
      body: `${courseTitle(occ.slot.courseId)} · ${occ.slot.venue}. Record it to get notes afterwards.`,
      icon: 'time-outline',
      at: occ.start.toISOString(),
      priority: occ.inProgress ? 95 : 90 - mins / 10,
      href: `/upcoming-lecture?slotId=${occ.slot.id}`,
    });
  }

  // Deadlines and exams
  for (const a of input.assessments) {
    if (a.status === 'done') continue;
    const d = daysUntil(a.dueAt, now);
    const overdue = new Date(a.dueAt) < now;
    const timed = a.kind === 'exam' || a.kind === 'test';
    const left = a.steps.filter((s) => !s.done);
    if (timed && !overdue && d <= 14) {
      items.push({
        id: `exam:${a.id}`,
        kind: 'exam',
        title: `${a.courseCode} ${a.kind} in ${d === 0 ? 'less than a day' : `${d} day${d === 1 ? '' : 's'}`}`,
        body: `${a.title}${a.venue ? ` · ${a.venue}` : ''}. ${left.length} preparation steps left.`,
        icon: 'school-outline',
        at: a.dueAt,
        priority: 85 - d * 3,
        href: `/recommendation/exam:${a.id}`,
        recommendation: {
          why: `Your ${a.kind} is ${describeDue(a, now).toLowerCase()}. Starting revision now spreads the work out instead of cramming.`,
          steps: left.length ? left.map((s) => s.text) : ['Review your notes once more', 'Rest well the night before'],
          actions: [
            { label: `Study session for ${a.courseCode}`, href: `/study/session?courseId=${a.courseId}` },
            { label: 'Open revision plan', href: `/assessment/${a.id}` },
            { label: `Ask about ${a.courseCode}`, href: `/ask?courseId=${a.courseId}` },
          ],
        },
      });
    } else if (!timed && (overdue || d <= 3)) {
      items.push({
        id: `deadline:${a.id}`,
        kind: 'deadline',
        title: overdue ? `${a.courseCode} ${a.kind} is overdue` : `${a.courseCode} ${a.kind} ${describeDue(a, now).toLowerCase()}`,
        body: `${a.title}. ${left.length} of ${a.steps.length} steps left.`,
        icon: overdue ? 'alert-circle-outline' : 'document-text-outline',
        at: a.dueAt,
        priority: overdue ? 92 : 80 - d * 4,
        href: `/recommendation/deadline:${a.id}`,
        recommendation: {
          why: overdue
            ? 'This is past its due date. If late submission is allowed, finishing today limits the penalty.'
            : `It’s ${describeDue(a, now).toLowerCase()} and ${left.length} steps are still open.`,
          steps: left.length ? left.map((s) => s.text) : ['Submit it'],
          actions: [{ label: 'Open checklist', href: `/assessment/${a.id}` }],
        },
      });
    }
  }

  // Lectures: ready, waiting, and concepts to revisit
  for (const l of input.lectures) {
    const age = now.getTime() - new Date(l.createdAt).getTime();
    if (l.status === 'ready' && age < 3 * 24 * HOUR) {
      items.push({
        id: `lecture-ready:${l.id}`,
        kind: 'lecture-ready',
        title: `${l.courseCode} lecture notes are ready`,
        body: `${l.analysis?.title ?? 'Your lecture'}: summary, ${l.analysis?.questions.length ?? 0} questions and ${l.analysis?.flashcards.length ?? 0} flashcards.`,
        icon: 'checkmark-circle-outline',
        at: l.createdAt,
        priority: 60,
        href: `/lecture/${l.id}`,
      });
    }
    if (l.status === 'waiting' || l.status === 'failed') {
      items.push({
        id: `lecture-waiting:${l.id}`,
        kind: 'lecture-waiting',
        title: l.status === 'failed' ? `${l.courseCode} lecture needs attention` : `${l.courseCode} lecture waiting for internet`,
        body: l.status === 'failed' ? 'Processing stopped. Tap to try again.' : 'It will upload automatically when you’re back online.',
        icon: l.status === 'failed' ? 'alert-circle-outline' : 'cloud-offline-outline',
        at: l.createdAt,
        priority: l.status === 'failed' ? 75 : 50,
        href: `/lecture/${l.id}`,
      });
    }
    const gap = l.analysis?.knowledgeGap;
    if (l.status === 'ready' && gap && age < 14 * 24 * HOUR) {
      items.push({
        id: `gap:${l.id}`,
        kind: 'gap',
        title: `Revisit ${gap.concept}`,
        body: `From your ${l.courseCode} lecture. ${gap.reason}`,
        icon: 'bulb-outline',
        at: l.createdAt,
        priority: 65,
        href: `/recommendation/gap:${l.id}`,
        recommendation: {
          why: gap.reason,
          steps: [
            `Read the explanation of ${gap.concept}`,
            'Replay the part of the lecture where it came up',
            'Answer the lecture quiz again',
            'Go through the flashcards',
          ],
          actions: [
            { label: 'Start a 5-minute review', href: `/study/session?concept=${encodeURIComponent(gap.concept)}&courseId=${l.courseId ?? ''}` },
            { label: 'Open the lecture', href: `/lecture/${l.id}` },
            { label: 'Take the quiz', href: `/lecture/${l.id}?tab=questions` },
            { label: `Ask about ${gap.concept}`, href: `/ask?courseId=${l.courseId ?? ''}&q=${encodeURIComponent(`What is ${gap.concept}?`)}` },
          ],
        },
      });
    }
  }

  // Materials processed recently
  for (const m of input.materials) {
    if (m.status !== 'ready') continue;
    if (now.getTime() - new Date(m.addedAt).getTime() > 2 * 24 * HOUR) continue;
    items.push({
      id: `material-ready:${m.id}`,
      kind: 'material-ready',
      title: `${m.analysis?.title ?? m.name} is ready`,
      body: `Summary, ${m.analysis?.concepts.length ?? 0} concepts and key passages${m.courseCode ? ` for ${m.courseCode}` : ''}.`,
      icon: 'document-text-outline',
      at: m.addedAt,
      priority: 45,
      href: `/material/${m.id}`,
    });
  }

  // Today's planned study
  const today = localDateKey(now);
  const blocks = buildStudyPlan(input.assessments, input.weeklyStudyHours, 1, now).filter((b) => b.date === today);
  if (blocks.length) {
    const mins = blocks.reduce((n, b) => n + b.minutes, 0);
    items.push({
      id: `study:${today}`,
      kind: 'study-today',
      title: `${Math.round(mins / 15) * 15} min of study planned today`,
      body: blocks.map((b) => `${b.courseCode} ${b.kind}`).join(', '),
      icon: 'book-outline',
      at: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8).toISOString(),
      priority: 55,
      href: `/recommendation/study:${today}`,
      recommendation: {
        why: 'Your weekly plan spreads study across the days before each deadline, within your study-hours goal.',
        steps: blocks.map((b) => `${b.minutes} min on ${b.courseCode}: ${b.title}`),
        actions: [{ label: 'Open this week’s plan', href: '/(tabs)/plan' }],
      },
    });
  }

  return items.sort((a, b) => b.priority - a.priority);
}

/** "now" · "12 min ago" · "in 3 h" · "2 d ago" */
export function relativeTime(iso: string, now = new Date()) {
  const diff = new Date(iso).getTime() - now.getTime();
  const abs = Math.abs(diff);
  const fmt = abs < 60_000 ? 'now' : abs < HOUR ? `${Math.round(abs / 60000)} min` : abs < 24 * HOUR ? `${Math.round(abs / HOUR)} h` : `${Math.round(abs / (24 * HOUR))} d`;
  if (fmt === 'now') return 'now';
  return diff > 0 ? `in ${fmt}` : `${fmt} ago`;
}

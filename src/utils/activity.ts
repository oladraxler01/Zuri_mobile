import type { Lecture } from '@/types/lecture';
import type { Material } from '@/types/material';
import type { Assessment } from '@/types/planner';
import type { ProgressEvent } from '@/context/progress-context';
import type { IoniconName } from '@/types/lecture';

export interface ActivityItem {
  id: string;
  at: string;
  icon: IoniconName;
  title: string;
  detail?: string;
  href?: string;
}

/**
 * Everything that happened in a course (or all courses), newest first.
 * Quiz answers and flashcards are grouped per source per day so the
 * history reads "Answered 5 questions (4 correct)" rather than 5 rows.
 */
export function activityFor(
  data: { lectures: Lecture[]; materials: Material[]; assessments: Assessment[]; events: ProgressEvent[] },
  courseId?: string
): ActivityItem[] {
  const inCourse = (id?: string) => !courseId || id === courseId;
  const items: ActivityItem[] = [];

  for (const l of data.lectures) {
    if (!inCourse(l.courseId)) continue;
    items.push({
      id: `lec:${l.id}`,
      at: l.createdAt,
      icon: 'mic-outline',
      title: `Recorded ${l.analysis?.title ?? `a ${l.courseCode} lecture`}`,
      detail: `${l.courseCode} · ${Math.round(l.durationSeconds / 60)} min`,
      href: `/lecture/${l.id}`,
    });
  }
  for (const m of data.materials) {
    if (!inCourse(m.courseId)) continue;
    items.push({
      id: `mat:${m.id}`,
      at: m.addedAt,
      icon: 'document-text-outline',
      title: `Uploaded ${m.analysis?.title ?? m.name}`,
      detail: m.courseCode,
      href: `/material/${m.id}`,
    });
  }
  for (const a of data.assessments) {
    if (!inCourse(a.courseId) || a.id.startsWith('a_seed')) continue;
    items.push({
      id: `asm:${a.id}`,
      at: a.createdAt,
      icon: 'calendar-outline',
      title: `Added ${a.kind}: ${a.title}`,
      detail: a.courseCode,
      href: `/assessment/${a.id}`,
    });
  }

  // Group answers: per source, per day, per type.
  const groups = new Map<string, ProgressEvent[]>();
  for (const e of data.events) {
    if (!inCourse(e.courseId)) continue;
    if (e.type === 'study-session' || e.type === 'concept-reviewed') {
      items.push({
        id: `ev:${e.id}`,
        at: e.at,
        icon: e.type === 'study-session' ? 'book-outline' : 'bulb-outline',
        title: e.type === 'study-session' ? `Study session · ${e.minutes ?? 0} min` : `Reviewed ${e.concept ?? 'a concept'}`,
        detail: e.label ?? e.courseCode,
      });
      continue;
    }
    const key = `${e.type}|${e.sourceId ?? ''}|${e.at.slice(0, 10)}`;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  for (const [key, list] of groups) {
    const first = list[0];
    const right = list.filter((x) => x.correct).length;
    const quiz = first.type === 'quiz-answer';
    items.push({
      id: `grp:${key}`,
      at: list.map((x) => x.at).sort().pop()!,
      icon: quiz ? 'help-circle-outline' : 'albums-outline',
      title: quiz
        ? `Answered ${list.length} question${list.length > 1 ? 's' : ''} (${right} correct)`
        : `Reviewed ${list.length} flashcard${list.length > 1 ? 's' : ''} (knew ${right})`,
      detail: first.courseCode,
      href: first.sourceId ? (first.sourceKind === 'material' ? `/material/${first.sourceId}` : `/lecture/${first.sourceId}`) : undefined,
    });
  }

  return items.sort((a, b) => b.at.localeCompare(a.at));
}

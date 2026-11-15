import type { CourseItem } from '@/context/academic-context';
import type { Lecture } from '@/types/lecture';
import type { Material } from '@/types/material';
import type { Assessment } from '@/types/planner';
import type { IoniconName } from '@/types/lecture';
import { searchSources, type SourceHit } from '@/utils/source-search';

export type ResultKind = 'course' | 'lecture' | 'material' | 'deadline' | 'topic' | 'quote';

export interface SearchResult {
  kind: ResultKind;
  id: string;
  title: string;
  subtitle: string;
  icon: IoniconName;
  href: string;
  hit?: SourceHit;
}

const has = (q: string, ...fields: (string | undefined)[]) => fields.some((f) => f?.toLowerCase().includes(q));

/** Search everything the student has. Titles/metadata by substring; transcripts and passages by relevance. */
export function globalSearch(
  query: string,
  data: { courses: CourseItem[]; lectures: Lecture[]; materials: Material[]; assessments: Assessment[] }
): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const out: SearchResult[] = [];

  for (const c of data.courses) {
    if (has(q, c.code, c.title, c.lecturer))
      out.push({ kind: 'course', id: c.id, title: `${c.code} · ${c.title}`, subtitle: c.lecturer ?? `${c.units} units`, icon: 'library-outline', href: `/course/${c.id}` });
  }
  for (const a of data.assessments) {
    if (has(q, a.title, a.notes, a.courseCode, a.kind, a.venue))
      out.push({
        kind: 'deadline',
        id: a.id,
        title: a.title,
        subtitle: `${a.courseCode} · ${a.kind} · ${new Date(a.dueAt).toLocaleDateString([], { day: 'numeric', month: 'short' })}`,
        icon: 'calendar-outline',
        href: `/assessment/${a.id}`,
      });
  }
  const topics = new Map<string, SearchResult>();
  for (const l of data.lectures) {
    const an = l.analysis;
    if (has(q, an?.title, an?.summary, l.courseCode, l.courseTitle))
      out.push({ kind: 'lecture', id: l.id, title: an?.title ?? `${l.courseCode} lecture`, subtitle: `${l.courseCode} · ${new Date(l.createdAt).toLocaleDateString()}`, icon: 'mic-outline', href: `/lecture/${l.id}` });
    for (const c of an?.concepts ?? [])
      if (has(q, c.title, c.summary) && !topics.has(c.title.toLowerCase()))
        topics.set(c.title.toLowerCase(), { kind: 'topic', id: `${l.id}:${c.id}`, title: c.title, subtitle: `${l.courseCode} · ${c.summary}`, icon: 'bulb-outline', href: `/lecture/${l.id}` });
  }
  for (const m of data.materials) {
    const an = m.analysis;
    if (has(q, m.name, an?.title, an?.summary, m.courseCode))
      out.push({ kind: 'material', id: m.id, title: an?.title ?? m.name, subtitle: [m.courseCode, m.name].filter(Boolean).join(' · '), icon: 'document-text-outline', href: `/material/${m.id}` });
    for (const c of an?.concepts ?? [])
      if (has(q, c.title, c.summary) && !topics.has(c.title.toLowerCase()))
        topics.set(c.title.toLowerCase(), { kind: 'topic', id: `${m.id}:${c.id}`, title: c.title, subtitle: `${m.courseCode ?? ''} · ${c.summary}`, icon: 'bulb-outline', href: `/material/${m.id}` });
  }
  out.push(...topics.values());

  for (const h of searchSources(query, { lectures: data.lectures, materials: data.materials }, {}, 8)) {
    out.push({
      kind: 'quote',
      id: `${h.id}:${h.location}`,
      title: `“${h.text.length > 110 ? `${h.text.slice(0, 107)}…` : h.text}”`,
      subtitle: `${h.courseCode ? `${h.courseCode} · ` : ''}${h.title} · ${h.location}`,
      icon: h.kind === 'lecture' ? 'chatbox-ellipses-outline' : 'reader-outline',
      href: h.kind === 'lecture' ? `/lecture/${h.id}?tab=transcript&t=${h.seconds ?? 0}` : `/material/${h.id}?tab=passages`,
      hit: h,
    });
  }
  return out;
}

export const RESULT_GROUPS: { kind: ResultKind; label: string }[] = [
  { kind: 'course', label: 'Courses' },
  { kind: 'deadline', label: 'Deadlines' },
  { kind: 'topic', label: 'Topics' },
  { kind: 'lecture', label: 'Lectures' },
  { kind: 'material', label: 'Materials' },
  { kind: 'quote', label: 'In transcripts & notes' },
];

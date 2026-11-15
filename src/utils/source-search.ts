import type { Lecture } from '@/types/lecture';
import type { Material } from '@/types/material';

/**
 * Search across everything the student has: lecture transcripts and
 * material passages. Every hit carries where it came from, so answers
 * can always show their sources.
 */

export interface SourceHit {
  kind: 'lecture' | 'material';
  /** lecture or material id */
  id: string;
  title: string;
  courseCode?: string;
  /** "12:04" for lectures, "p. 4" / "Section 2" for materials */
  location: string;
  /** seconds into the recording, for lectures */
  seconds?: number;
  text: string;
  score: number;
}

const STOP = new Set(
  'what when where which with that this there their about does from have into just like more some than them then they were will your explain mean means tell please how why the and for are was you can did lecture lecturer said notes document'.split(
    ' '
  )
);

export function queryTerms(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function score(terms: string[], text: string) {
  const words = queryTerms(text);
  return terms.reduce((s, t) => s + (words.some((w) => w.startsWith(t) || t.startsWith(w)) ? 1 : 0), 0);
}

function clock(sec: number) {
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

export function searchSources(
  query: string,
  data: { lectures: Lecture[]; materials: Material[] },
  scope: { courseId?: string; lectureId?: string; materialId?: string } = {},
  limit = 6
): SourceHit[] {
  const terms = queryTerms(query);
  if (!terms.length) return [];
  const hits: SourceHit[] = [];

  for (const l of data.lectures) {
    if (!l.analysis) continue;
    if (scope.materialId) continue;
    if (scope.lectureId && l.id !== scope.lectureId) continue;
    if (scope.courseId && l.courseId !== scope.courseId) continue;
    for (const seg of l.analysis.transcript) {
      const s = score(terms, seg.text);
      if (s > 0)
        hits.push({
          kind: 'lecture',
          id: l.id,
          title: l.analysis.title,
          courseCode: l.courseCode,
          location: clock(seg.start),
          seconds: seg.start,
          text: seg.text,
          score: s,
        });
    }
  }

  for (const m of data.materials) {
    if (!m.analysis) continue;
    if (scope.lectureId) continue;
    if (scope.materialId && m.id !== scope.materialId) continue;
    if (scope.courseId && m.courseId !== scope.courseId) continue;
    for (const p of m.analysis.passages) {
      const s = score(terms, p.text);
      if (s > 0)
        hits.push({
          kind: 'material',
          id: m.id,
          title: m.analysis.title,
          courseCode: m.courseCode,
          location: p.location,
          text: p.text,
          score: s,
        });
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

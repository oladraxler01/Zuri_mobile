import type { Lecture, LectureConcept, LectureQuestion } from '@/types/lecture';
import type { Material } from '@/types/material';
import type { ProgressEvent } from '@/context/progress-context';

/**
 * Concept mastery from the progress log.
 * Each concept's level comes from its most recent answers (newer answers
 * count more). No answers yet = "not tested".
 */

export type MasteryLevel = 'new' | 'weak' | 'developing' | 'strong';

export const LEVEL_LABEL: Record<MasteryLevel, string> = {
  new: 'Not tested yet',
  weak: 'Weak',
  developing: 'Developing',
  strong: 'Strong',
};

export interface ConceptMastery {
  concept: string;
  summary: string;
  /** 0–100, or null if never tested */
  score: number | null;
  level: MasteryLevel;
  attempts: number;
  /** flagged as worth revisiting by a lecture's analysis */
  flagged: boolean;
  sources: { kind: 'lecture' | 'material'; id: string; title: string }[];
  lastPracticed?: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Which concept a question tests: the concept whose name appears in it (longest match wins). */
export function conceptForQuestion(q: LectureQuestion, concepts: Pick<LectureConcept, 'title'>[]): string | undefined {
  const text = norm(`${q.question} ${q.explanation} ${q.options[q.correctIndex] ?? ''}`);
  const hits = concepts
    .map((c) => c.title)
    .filter((t) => {
      const words = norm(t).split(' ').filter((w) => w.length > 3);
      return words.length > 0 && words.every((w) => text.includes(w.slice(0, Math.max(4, w.length - 2))));
    })
    .sort((a, b) => b.length - a.length);
  return hits[0];
}

export function levelFor(score: number | null): MasteryLevel {
  if (score === null) return 'new';
  if (score < 50) return 'weak';
  if (score < 80) return 'developing';
  return 'strong';
}

/** Recency-weighted % correct over the last 6 answers. */
export function scoreFromAnswers(answers: { correct?: boolean; at: string }[]): number | null {
  const recent = [...answers].sort((a, b) => a.at.localeCompare(b.at)).slice(-6);
  if (!recent.length) return null;
  let num = 0;
  let den = 0;
  recent.forEach((a, i) => {
    const w = i + 1;
    num += (a.correct ? 1 : 0) * w;
    den += w;
  });
  return Math.round((num / den) * 100);
}

/** Every concept in a course (from its lectures and materials) with the student's mastery. */
export function courseMastery(
  courseId: string,
  lectures: Lecture[],
  materials: Material[],
  events: ProgressEvent[]
): ConceptMastery[] {
  const map = new Map<string, ConceptMastery>();
  const add = (c: LectureConcept, source: ConceptMastery['sources'][number], flagged: boolean) => {
    const key = norm(c.title);
    const cur = map.get(key);
    if (cur) {
      if (!cur.sources.some((s) => s.id === source.id)) cur.sources.push(source);
      cur.flagged = cur.flagged || flagged;
      if (!cur.summary && c.summary) cur.summary = c.summary;
    } else {
      map.set(key, { concept: c.title, summary: c.summary, score: null, level: 'new', attempts: 0, flagged, sources: [source] });
    }
  };

  for (const l of lectures) {
    if (l.courseId !== courseId || !l.analysis) continue;
    const gap = l.analysis.knowledgeGap?.concept;
    for (const c of l.analysis.concepts) add(c, { kind: 'lecture', id: l.id, title: l.analysis.title }, !!gap && norm(gap) === norm(c.title));
  }
  for (const m of materials) {
    if (m.courseId !== courseId || !m.analysis) continue;
    for (const c of m.analysis.concepts) add(c, { kind: 'material', id: m.id, title: m.analysis.title }, false);
  }

  const answers = events.filter((e) => (e.type === 'quiz-answer' || e.type === 'flashcard') && e.courseId === courseId && e.concept);
  for (const cm of map.values()) {
    const mine = answers.filter((a) => norm(a.concept!) === norm(cm.concept));
    cm.attempts = mine.length;
    cm.score = scoreFromAnswers(mine);
    cm.level = levelFor(cm.score);
    cm.lastPracticed = mine.map((a) => a.at).sort().pop();
  }

  const order: Record<MasteryLevel, number> = { weak: 0, developing: 1, new: 2, strong: 3 };
  return [...map.values()].sort((a, b) => order[a.level] - order[b.level] || Number(b.flagged) - Number(a.flagged));
}

/** Overall course mastery: average of tested concepts, or null if none tested. */
export function overallMastery(list: ConceptMastery[]): number | null {
  const tested = list.filter((c) => c.score !== null);
  if (!tested.length) return null;
  return Math.round(tested.reduce((n, c) => n + c.score!, 0) / tested.length);
}

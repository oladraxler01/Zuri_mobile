import type { Flashcard, Lecture, LectureQuestion } from '@/types/lecture';
import type { Material } from '@/types/material';
import type { ProgressEvent } from '@/context/progress-context';
import { conceptForQuestion, courseMastery, type MasteryLevel } from '@/utils/mastery';

/**
 * Builds a personalised study session: questions and flashcards drawn from
 * the student's own lectures and materials, weighted towards the concepts
 * they're weakest on (weak → developing → not tested → strong).
 */

export interface SessionSource {
  kind: 'lecture' | 'material';
  id: string;
  title: string;
  courseId?: string;
  courseCode?: string;
}

export type SessionItem =
  | { kind: 'question'; key: string; q: LectureQuestion; concept?: string; source: SessionSource }
  | { kind: 'card'; key: string; card: Flashcard; concept?: string; source: SessionSource };

export type SessionMode = 'mixed' | 'weak';

const RANK: Record<MasteryLevel, number> = { weak: 0, developing: 1, new: 2, strong: 3 };

export function buildSession(
  opts: { courseId?: string; concept?: string; mode?: SessionMode; size?: number },
  data: { lectures: Lecture[]; materials: Material[]; events: ProgressEvent[] }
): SessionItem[] {
  const size = opts.size ?? 8;
  const pool: SessionItem[] = [];

  for (const l of data.lectures) {
    if (!l.analysis || (opts.courseId && l.courseId !== opts.courseId)) continue;
    const src: SessionSource = { kind: 'lecture', id: l.id, title: l.analysis.title, courseId: l.courseId, courseCode: l.courseCode };
    l.analysis.questions.forEach((q) =>
      pool.push({ kind: 'question', key: `q:${l.id}:${q.id}`, q, concept: conceptForQuestion(q, l.analysis!.concepts), source: src })
    );
    l.analysis.flashcards.forEach((card, i) =>
      pool.push({
        kind: 'card',
        key: `c:${l.id}:${i}`,
        card,
        concept: conceptForQuestion({ id: '', question: card.question, options: [card.answer], correctIndex: 0, explanation: '' }, l.analysis!.concepts),
        source: src,
      })
    );
  }
  for (const m of data.materials) {
    if (!m.analysis || (opts.courseId && m.courseId !== opts.courseId)) continue;
    const src: SessionSource = { kind: 'material', id: m.id, title: m.analysis.title, courseId: m.courseId, courseCode: m.courseCode };
    m.analysis.questions.forEach((q) =>
      pool.push({ kind: 'question', key: `q:${m.id}:${q.id}`, q, concept: conceptForQuestion(q, m.analysis!.concepts), source: src })
    );
  }

  // Concept levels across the relevant courses.
  const courseIds = Array.from(new Set(pool.map((p) => p.source.courseId).filter(Boolean))) as string[];
  const level = new Map<string, MasteryLevel>();
  for (const cid of courseIds) {
    for (const c of courseMastery(cid, data.lectures, data.materials, data.events)) level.set(c.concept.toLowerCase(), c.level);
  }
  const lv = (it: SessionItem): MasteryLevel => (it.concept ? level.get(it.concept.toLowerCase()) ?? 'new' : 'new');

  let candidates = pool;
  if (opts.concept) {
    const focus = opts.concept.toLowerCase();
    const onTopic = pool.filter((p) => p.concept?.toLowerCase() === focus);
    candidates = onTopic.length ? [...onTopic, ...pool.filter((p) => p.concept?.toLowerCase() !== focus)] : pool;
  } else if (opts.mode === 'weak') {
    const weak = pool.filter((p) => lv(p) === 'weak' || lv(p) === 'developing');
    candidates = weak.length ? weak : pool;
  }

  // Order: focus concept first (if any), then weakest levels; vary sources; ~2 questions per card.
  const seed = Date.now() % 997;
  const sorted = [...candidates].sort((a, b) => {
    if (opts.concept) {
      const fa = a.concept?.toLowerCase() === opts.concept.toLowerCase() ? 0 : 1;
      const fb = b.concept?.toLowerCase() === opts.concept.toLowerCase() ? 0 : 1;
      if (fa !== fb) return fa - fb;
    }
    return RANK[lv(a)] - RANK[lv(b)] || ((a.key.length * seed) % 7) - ((b.key.length * seed) % 7);
  });
  const questions = sorted.filter((s) => s.kind === 'question');
  const cards = sorted.filter((s) => s.kind === 'card');
  const out: SessionItem[] = [];
  while (out.length < size && (questions.length || cards.length)) {
    if (questions.length) out.push(questions.shift()!);
    if (out.length < size && questions.length) out.push(questions.shift()!);
    if (out.length < size && cards.length) out.push(cards.shift()!);
  }
  return out;
}

import { conceptForQuestion, courseMastery, levelFor, overallMastery, scoreFromAnswers } from '../mastery';
import type { Lecture, LectureQuestion } from '@/types/lecture';
import type { Material } from '@/types/material';
import type { ProgressEvent } from '@/context/progress-context';

const iso = (minute: number) => new Date(Date.UTC(2026, 10, 17, 9, minute)).toISOString();

describe('levelFor', () => {
  it.each([
    [null, 'new'],
    [0, 'weak'],
    [49, 'weak'],
    [50, 'developing'],
    [79, 'developing'],
    [80, 'strong'],
    [100, 'strong'],
  ] as const)('%p → %s', (score, level) => {
    expect(levelFor(score)).toBe(level);
  });
});

describe('scoreFromAnswers', () => {
  it('is null with no answers', () => {
    expect(scoreFromAnswers([])).toBeNull();
  });

  it('is 100 or 0 when every answer agrees', () => {
    expect(scoreFromAnswers([{ correct: true, at: iso(1) }, { correct: true, at: iso(2) }])).toBe(100);
    expect(scoreFromAnswers([{ correct: false, at: iso(1) }, { correct: false, at: iso(2) }])).toBe(0);
  });

  it('weights newer answers more', () => {
    const improving = scoreFromAnswers([{ correct: false, at: iso(1) }, { correct: true, at: iso(2) }]);
    const slipping = scoreFromAnswers([{ correct: true, at: iso(1) }, { correct: false, at: iso(2) }]);
    expect(improving).toBe(67); // 2/3
    expect(slipping).toBe(33); // 1/3
  });

  it('orders by time, not by array position', () => {
    expect(scoreFromAnswers([{ correct: true, at: iso(2) }, { correct: false, at: iso(1) }])).toBe(67);
  });

  it('only counts the last 6 answers', () => {
    const old = Array.from({ length: 10 }, (_, i) => ({ correct: false, at: iso(i) }));
    const recent = Array.from({ length: 6 }, (_, i) => ({ correct: true, at: iso(20 + i) }));
    expect(scoreFromAnswers([...old, ...recent])).toBe(100);
  });
});

describe('conceptForQuestion', () => {
  const q = (question: string): LectureQuestion =>
    ({ question, explanation: '', options: ['a', 'b'], correctIndex: 0 }) as unknown as LectureQuestion;

  it('finds the concept named in the question', () => {
    const concepts = [{ title: 'Merge sort' }, { title: 'Binary search' }];
    expect(conceptForQuestion(q('What is the running time of merge sort?'), concepts)).toBe('Merge sort');
  });

  it('prefers the longest matching concept', () => {
    const concepts = [{ title: 'Sorting' }, { title: 'Sorting algorithms stability' }];
    expect(conceptForQuestion(q('Which sorting algorithms keep stability of equal keys?'), concepts)).toBe(
      'Sorting algorithms stability',
    );
  });

  it('returns undefined when nothing matches', () => {
    expect(conceptForQuestion(q('Define a heap.'), [{ title: 'Merge sort' }])).toBeUndefined();
  });
});

describe('courseMastery / overallMastery', () => {
  const lecture = {
    id: 'l1',
    courseId: 'c1',
    analysis: {
      title: 'Lecture 4',
      concepts: [
        { title: 'Merge sort', summary: 'Divide and conquer' },
        { title: 'Recursion depth', summary: '' },
      ],
      knowledgeGap: { concept: 'Recursion depth' },
    },
  } as unknown as Lecture;

  const material = {
    id: 'm1',
    courseId: 'c1',
    analysis: { title: 'Slides week 4', concepts: [{ title: 'merge sort', summary: '' }, { title: 'Big O', summary: 'Growth' }] },
  } as unknown as Material;

  const otherCourse = { ...lecture, id: 'l2', courseId: 'c2' } as Lecture;

  const answer = (concept: string, correct: boolean, minute: number, courseId = 'c1') =>
    ({ type: 'quiz-answer', courseId, concept, correct, at: iso(minute) }) as unknown as ProgressEvent;

  it('merges the same concept across lectures and materials', () => {
    const list = courseMastery('c1', [lecture, otherCourse], [material], []);
    expect(list.map((c) => c.concept).sort()).toEqual(['Big O', 'Merge sort', 'Recursion depth']);
    const merge = list.find((c) => c.concept === 'Merge sort')!;
    expect(merge.sources.map((s) => s.id).sort()).toEqual(['l1', 'm1']);
  });

  it('flags the lecture knowledge gap', () => {
    const list = courseMastery('c1', [lecture], [], []);
    expect(list.find((c) => c.concept === 'Recursion depth')!.flagged).toBe(true);
    expect(list.find((c) => c.concept === 'Merge sort')!.flagged).toBe(false);
  });

  it('scores concepts from this course’s answers only, and sorts weak first', () => {
    const events = [
      answer('Merge sort', true, 1),
      answer('Merge sort', true, 2),
      answer('Big O', false, 3),
      answer('Big O', true, 4, 'c2'), // other course: ignored
    ];
    const list = courseMastery('c1', [lecture], [material], events);
    const big = list.find((c) => c.concept === 'Big O')!;
    expect(big).toMatchObject({ score: 0, level: 'weak', attempts: 1, lastPracticed: iso(3) });
    expect(list.find((c) => c.concept === 'Merge sort')!.level).toBe('strong');
    expect(list[0].concept).toBe('Big O');
    expect(overallMastery(list)).toBe(50);
  });

  it('overall is null when nothing has been tested', () => {
    expect(overallMastery(courseMastery('c1', [lecture], [], []))).toBeNull();
  });
});

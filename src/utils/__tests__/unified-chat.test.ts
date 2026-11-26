import { framedQuestion, researchSources } from '@/utils/unified-chat';
import type { Paper, ResearchProject } from '@/types/research';

const paper = {
  id: 'p1',
  title: 'Spaced repetition and long-term memory',
  authors: ['Ada Smith'],
  year: 2020,
  abstract: 'Spaced repetition improves long-term memory retention in students compared with massed practice.',
} as unknown as Paper;

const project = (over: Partial<ResearchProject>): ResearchProject =>
  ({
    id: 'r1',
    title: 'Memory',
    question: 'Does spacing help?',
    keywords: [],
    sourceIds: ['p1'],
    evidence: [],
    notes: [],
    themes: [],
    citationStyle: 'apa',
    createdAt: '',
    updatedAt: '',
    archived: false,
    ...over,
  }) as ResearchProject;

describe('researchSources', () => {
  it('turns project passages into paper sources', () => {
    const hits = researchSources('spaced repetition memory', [project({})], () => [paper], { limit: 2 });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]).toMatchObject({ kind: 'paper', id: 'p1', title: paper.title });
    expect(hits[0].location).toContain('Smith');
  });

  it('skips archived projects unless one is asked for by id', () => {
    const archived = project({ archived: true });
    expect(researchSources('spaced repetition', [archived], () => [paper], { limit: 2 })).toHaveLength(0);
    expect(researchSources('spaced repetition', [archived], () => [paper], { projectId: 'r1', limit: 2 }).length).toBeGreaterThan(0);
  });
});

describe('framedQuestion', () => {
  it('passes Everything questions through', () => {
    expect(framedQuestion('What is recursion?', { mode: 'everything', hasSources: true })).toBe('What is recursion?');
  });

  it('keeps My notes answers to the notes', () => {
    expect(framedQuestion('What is recursion?', { mode: 'notes', hasSources: true })).toMatch(/only from my notes/);
  });

  it('asks for citations in a research project', () => {
    expect(framedQuestion('Does it work?', { mode: 'notes', project: project({}), hasSources: true })).toMatch(/author-year/);
  });
});

import type { Paper, ResearchProject } from '@/types/research';
import type { SourceHit } from '@/utils/source-search';
import { askProject, inText } from '@/utils/research';

/**
 * Ask Zuri is the one chat in the app (the round Zuri button, "Ask" on courses,
 * documents, assessments and research projects all open it). Two modes:
 *
 *  - notes:       answers only from the student's own lectures and documents.
 *  - everything:  also their classes, tests, deadlines and recordings, their research
 *                 projects' papers, evidence and notes, and general knowledge.
 *
 * Asking about a recorded lecture while studying it ("Ask about this lecture") is
 * separate: it lives on the lecture and points at moments in the recording.
 */

export type ChatMode = 'notes' | 'everything';

/** Research passages as sources: one project's, or the best across every active project. */
export function researchSources(
  question: string,
  projects: ResearchProject[],
  papersFor: (projectId: string) => Paper[],
  opts: { projectId?: string; limit: number }
): SourceHit[] {
  const pool = opts.projectId ? projects.filter((p) => p.id === opts.projectId) : projects.filter((p) => !p.archived);
  return pool
    .flatMap((p) =>
      askProject(question, p, papersFor(p.id), opts.limit).map((h) => ({
        kind: 'paper' as const,
        id: h.paper.id,
        title: h.paper.title,
        location: `${inText(h.paper)} · ${h.kind === 'evidence' ? 'saved evidence' : h.kind === 'note' ? 'your note' : 'abstract'}`,
        text: h.text.length > 600 ? `${h.text.slice(0, 600).trim()}…` : h.text,
        score: h.score,
      }))
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.limit);
}

/** The question as sent to Zuri's AI, with how to use the sources for this mode. */
export function framedQuestion(question: string, opts: { mode: ChatMode; project?: ResearchProject; hasSources: boolean }): string {
  if (opts.project) {
    return (
      `Research question for my project "${opts.project.title}"${opts.project.question ? ` (${opts.project.question})` : ''}: ${question}\n` +
      'Answer like a careful research assistant. Use only the documents provided, cite each claim with the author-year shown ' +
      '(for example "(Smith, 2020)"), say where the sources disagree, and say plainly if they don’t answer the question.'
    );
  }
  if (opts.mode === 'notes') {
    return (
      `${question}\n\n` +
      (opts.hasSources
        ? 'Answer only from my notes and lectures provided. If they don’t cover it, say so in one sentence instead of using outside knowledge.'
        : 'None of my notes or lectures match this. Tell me that in one sentence and suggest switching Ask Zuri to “Everything” for a general answer.')
    );
  }
  return question;
}

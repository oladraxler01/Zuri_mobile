import type { TranscriptSegment } from '@/types/lecture';

const STOP_WORDS = new Set([
  'what', 'when', 'where', 'which', 'with', 'that', 'this', 'there', 'their', 'about', 'does', 'from',
  'have', 'into', 'just', 'like', 'more', 'some', 'than', 'them', 'then', 'they', 'were', 'will',
  'your', 'explain', 'mean', 'means', 'tell', 'lecture', 'lecturer', 'said', 'please', 'how', 'why',
  'the', 'and', 'for', 'are', 'was', 'you', 'can', 'did',
]);

function terms(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Rank transcript segments by how many query terms they contain.
 * Used for "where it came up" and for answering questions from the transcript.
 */
export function searchTranscript(
  transcript: TranscriptSegment[],
  query: string,
  limit = 3
): TranscriptSegment[] {
  const q = terms(query);
  if (!q.length) return [];
  return transcript
    .map((seg) => {
      const words = terms(seg.text);
      const score = q.reduce((sum, term) => sum + (words.some((w) => w.startsWith(term) || term.startsWith(w)) ? 1 : 0), 0);
      return { seg, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.seg.start - b.seg.start)
    .slice(0, limit)
    .map((r) => r.seg);
}

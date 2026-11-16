import { ApiError, apiRequest } from '@/services/api-client';

/**
 * Zuri's AI on the API gateway.
 *
 *   POST /ai/execute  { operation, input, parameters } → envelope
 *     { request_id, status: "COMPLETED" | "FAILED" | …, result, error: { code, message } }
 *
 * Operations used by the app:
 *   reading.analyse            input { material_id | document_text }, parameters { summary_type, tts }
 *                              → { summary, key_takeaways[], vocab_terms[{ term, definition }], tts_audio_b64 }
 *
 * Each call counts towards the user's daily AI allowance (50 a day on the server).
 */

interface AIEnvelope<T> {
  request_id: string;
  status: string;
  result?: T | null;
  error?: { code?: string; message?: string } | null;
}

export async function executeAI<T = Record<string, any>>(
  operation: string,
  input: Record<string, unknown>,
  parameters: Record<string, unknown> = {},
  timeoutMs = 90_000
): Promise<T> {
  const env = await apiRequest<AIEnvelope<T>>('/ai/execute', {
    method: 'POST',
    body: { operation, input, parameters, client: { platform: 'mobile' } },
    timeoutMs,
  });
  if (env.status !== 'COMPLETED' || !env.result) {
    throw new ApiError('server', env.error?.message || 'Zuri’s AI couldn’t answer that right now. Please try again.');
  }
  return env.result;
}

export interface MaterialSummary {
  summary: string;
  key_takeaways: string[];
  vocab_terms: { term: string; definition: string; context_snippet?: string }[];
}

/** Summary, key points and key terms of a processed material. */
export function summariseMaterial(materialId: string): Promise<MaterialSummary> {
  return executeAI<MaterialSummary>('reading.analyse', { material_id: materialId }, { summary_type: 'concise' });
}

export interface PracticeQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

/**
 * Multiple-choice practice questions from a processed material.
 *   study.quiz.generate  input { material_id }, parameters { count, quiz_type: "multiple_choice" }
 *   → { questions: [{ question, options: { A: "…", B: "…" }, correct_answer: "A", explanation, topic }] }
 */
export async function generateMaterialQuiz(materialId: string, count = 5): Promise<PracticeQuestion[]> {
  const res = await executeAI<{ questions?: any[] }>(
    'study.quiz.generate',
    { material_id: materialId },
    { count, quiz_type: 'multiple_choice' }
  );
  const out: PracticeQuestion[] = [];
  (res.questions ?? []).forEach((q, i) => {
    const entries = Object.entries((q?.options ?? {}) as Record<string, unknown>).filter(([, v]) => v != null && String(v).trim());
    const correctKey = String(q?.correct_answer ?? '').trim().toUpperCase();
    const correctIndex = entries.findIndex(([k]) => k.trim().toUpperCase() === correctKey);
    if (!q?.question || entries.length < 2 || correctIndex < 0) return; // skip malformed questions
    out.push({
      id: `q${i}`,
      question: String(q.question),
      options: entries.map(([, v]) => String(v)),
      correctIndex,
      explanation: String(q.explanation ?? ''),
    });
  });
  if (!out.length) throw new Error('Zuri couldn’t make questions from this document. Please try again.');
  return out;
}

export interface StudyFlashcard {
  front: string;
  back: string;
  topic?: string;
}

/**
 * Flashcards from a processed material.
 *   study.flashcards.generate  input { material_id }, parameters { count }
 *   → { flashcards: [{ front, back, topic }] }
 */
export async function generateMaterialFlashcards(materialId: string, count = 10): Promise<StudyFlashcard[]> {
  const res = await executeAI<{ flashcards?: any[] }>('study.flashcards.generate', { material_id: materialId }, { count });
  const cards = (res.flashcards ?? [])
    .filter((c) => c?.front && c?.back)
    .map((c) => ({ front: String(c.front), back: String(c.back), topic: c.topic ? String(c.topic) : undefined }));
  if (!cards.length) throw new Error('Zuri couldn’t make flashcards from this document. Please try again.');
  return cards;
}

export interface ExamQuestion {
  question: string;
  modelAnswer: string;
  markingGuide: string[];
  marks: number;
  topic?: string;
}

/**
 * Exam-style questions, the way a lecturer would set them: theory questions and
 * applied questions built on real-world scenarios, each with a model answer and
 * a marking guide.
 *   study.quiz.generate  input { material_id }, parameters { count, quiz_type: <anything but "multiple_choice"> }
 *   → { questions: [{ question, model_answer, marking_guide[], marks, topic }] }
 * The server puts quiz_type into its prompt ("Generate {count} {quiz_type} questions"),
 * so it describes the style we want.
 */
export async function generateMaterialExamQuestions(materialId: string, count = 5): Promise<ExamQuestion[]> {
  const res = await executeAI<{ questions?: any[] }>(
    'study.quiz.generate',
    { material_id: materialId },
    {
      count,
      quiz_type:
        'university exam-style (a mix of theory questions and applied questions built on realistic real-world scenarios, as a lecturer would set in a test or exam, with marks)',
    }
  );
  const out = (res.questions ?? [])
    .filter((q) => q?.question)
    .map((q) => ({
      question: String(q.question),
      modelAnswer: String(q.model_answer ?? q.answer ?? ''),
      markingGuide: Array.isArray(q.marking_guide) ? q.marking_guide.map(String) : [],
      marks: Number(q.marks) || 0,
      topic: q.topic ? String(q.topic) : undefined,
    }));
  if (!out.length) throw new Error('Zuri couldn’t make exam questions from this document. Please try again.');
  return out;
}

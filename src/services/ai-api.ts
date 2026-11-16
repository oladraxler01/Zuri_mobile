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

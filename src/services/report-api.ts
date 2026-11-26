import Constants from 'expo-constants';
import { apiRequest } from '@/services/api-client';

/**
 * Reporting an AI answer (Google Play's AI-generated content policy).
 *
 *   POST /academic/ai-reports { surface, reason, content_excerpt, content_ref?, note?, app_version? } → 201
 */
export type ReportSurface =
  | 'chat' | 'class_answer' | 'debrief' | 'notes' | 'summary' | 'quiz'
  | 'flashcards' | 'study_plan' | 'transcript' | 'other';

export type ReportReason = 'wrong' | 'harmful' | 'offensive' | 'inappropriate' | 'other';

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'wrong', label: 'It’s wrong' },
  { value: 'harmful', label: 'It’s harmful' },
  { value: 'offensive', label: 'It’s offensive' },
  { value: 'inappropriate', label: 'It’s inappropriate' },
  { value: 'other', label: 'Something else' },
];

export async function reportAiAnswer(input: {
  surface: ReportSurface;
  reason: ReportReason;
  text: string;
  ref?: string;
  note?: string;
}): Promise<void> {
  await apiRequest('/academic/ai-reports', {
    method: 'POST',
    body: {
      surface: input.surface,
      reason: input.reason,
      content_excerpt: input.text.slice(0, 4000),
      content_ref: input.ref?.slice(0, 200),
      note: input.note?.trim() ? input.note.trim().slice(0, 1000) : undefined,
      app_version: Constants.expoConfig?.version,
    },
    timeoutMs: 15000,
  });
}

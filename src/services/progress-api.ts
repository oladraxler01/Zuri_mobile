import { ApiError, apiRequest } from '@/services/api-client';

/**
 * Progress on the analytics service. Every response is { data: … }.
 *
 *   GET    /analytics/study-streak              → { current_streak }
 *   GET    /analytics/study-stats               → { total_study_days, total_study_minutes, total_quizzes_completed, … }
 *   POST   /analytics/study-sessions            { session_date, duration_minutes, quizzes_completed, flashcards_reviewed, materials_reviewed }
 *   GET    /analytics/topic-mastery             → TopicMastery[] (built from server-graded quizzes)
 *   GET    /analytics/topics-for-review         → TopicMastery[] due for review (spaced repetition)
 *   GET    /analytics/goals?include_completed=true
 *   POST   /analytics/goals                     { title, description?, goal_type? }
 *   POST   /analytics/goals/:id/complete
 *   DELETE /analytics/goals/:id
 */

export interface ServerStudyStats {
  total_study_days: number;
  total_study_minutes: number;
  total_quizzes_completed: number;
  total_materials_reviewed: number;
  last_study_date?: string | null;
}

export interface ServerTopicMastery {
  id: string;
  course_id?: string | null;
  topic: string;
  mastery_score: number; // 0–1 or 0–100 depending on the server; see masteryPercent
  questions_attempted: number;
  questions_correct: number;
  last_studied_at?: string | null;
  next_review_at?: string | null;
}

export interface ServerGoal {
  id: string;
  title: string;
  description?: string;
  goal_type?: string;
  is_completed: boolean;
  completed_at?: string | null;
  created_at: string;
}

export async function getStudyStreak(): Promise<number> {
  const res = await apiRequest<{ data?: { current_streak?: number } }>('/analytics/study-streak');
  return Number(res.data?.current_streak ?? 0);
}

export async function getServerStudyStats(): Promise<ServerStudyStats | null> {
  const res = await apiRequest<{ data?: ServerStudyStats }>('/analytics/study-stats');
  return res.data ?? null;
}

export async function sendStudySession(s: {
  minutes: number;
  quizzesCompleted?: number;
  flashcardsReviewed?: number;
  materialsReviewed?: number;
  at?: Date;
}): Promise<void> {
  await apiRequest('/analytics/study-sessions', {
    method: 'POST',
    body: {
      session_date: (s.at ?? new Date()).toISOString(),
      duration_minutes: Math.max(1, Math.round(s.minutes)),
      quizzes_completed: s.quizzesCompleted ?? 0,
      flashcards_reviewed: s.flashcardsReviewed ?? 0,
      materials_reviewed: s.materialsReviewed ?? 0,
    },
  });
}

export async function getTopicMastery(): Promise<ServerTopicMastery[]> {
  const res = await apiRequest<{ data?: ServerTopicMastery[] | null }>('/analytics/topic-mastery');
  return res.data ?? [];
}

export async function getTopicsForReview(): Promise<ServerTopicMastery[]> {
  const res = await apiRequest<{ data?: ServerTopicMastery[] | null }>('/analytics/topics-for-review');
  return res.data ?? [];
}

/** Mastery as a 0–100 percentage, whichever scale the server uses. */
export function masteryPercent(t: ServerTopicMastery): number {
  const v = Number(t.mastery_score) || 0;
  return Math.round(v <= 1 ? v * 100 : v);
}

// ─── Goals ───────────────────────────────────────────────────────

export async function listGoals(): Promise<ServerGoal[]> {
  const res = await apiRequest<{ data?: ServerGoal[] | null }>('/analytics/goals', { query: { include_completed: 'true' } });
  return res.data ?? [];
}

export async function createGoal(title: string): Promise<ServerGoal> {
  const res = await apiRequest<{ data: ServerGoal }>('/analytics/goals', {
    method: 'POST',
    body: { title: title.slice(0, 255) },
  });
  return res.data;
}

export async function completeGoal(id: string): Promise<void> {
  await apiRequest(`/analytics/goals/${id}/complete`, { method: 'POST' });
}

export async function deleteGoal(id: string): Promise<void> {
  try {
    await apiRequest(`/analytics/goals/${id}`, { method: 'DELETE' });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return;
    throw e;
  }
}

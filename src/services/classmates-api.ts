import { ApiError, apiRequest } from '@/services/api-client';
import type { Lecture } from '@/types/lecture';

/**
 * "Ask classmates": request lecture notes or materials from students in the same
 * department and level (or course), and share yours. Spec: BACKEND_REQUESTS #25.
 *
 *   POST   /classmates/requests                 create (5 a day)
 *   GET    /classmates/requests?scope=cohort|mine&status=open
 *   GET    /classmates/requests/:id             with shares (requester only)
 *   POST   /classmates/requests/:id/shares      share a lecture summary or a material
 *   POST   /classmates/requests/:id/close       { fulfilled? }
 *   POST   /classmates/shares/:id/thanks | /report { reason }
 *   GET    /classmates/shared                   shared with me
 *   GET/PUT /classmates/settings                { classmates_visible, notify_classmate_requests }
 *
 * Until the server has these routes, `ClassmatesUnavailable` is thrown and the
 * screens say sharing isn't switched on yet. Nothing is faked.
 */

export class ClassmatesUnavailable extends Error {
  constructor() {
    super('Sharing with classmates isn’t switched on yet.');
  }
}

export type RequestKind = 'lecture_notes' | 'material' | 'past_questions' | 'other';

export const KIND_LABEL: Record<RequestKind, string> = {
  lecture_notes: 'Lecture notes',
  material: 'Course material',
  past_questions: 'Past questions',
  other: 'Something else',
};

export interface ClassmateRequest {
  id: string;
  course_code: string;
  course_title?: string;
  kind: RequestKind;
  lecture_date?: string | null;
  topic?: string | null;
  message: string;
  status: 'open' | 'fulfilled' | 'closed';
  requester: { first_name: string; department?: string; academic_level?: string };
  is_mine: boolean;
  share_count: number;
  i_shared: boolean;
  expires_at: string;
  created_at: string;
  shares?: ClassmateShare[];
}

export interface SharedLectureContent {
  title: string;
  summary: string;
  key_points: string[];
  notes: { heading: string; points: string[] }[];
  flashcards: { question: string; answer: string }[];
  recorded_at?: string;
  duration_seconds?: number;
}

export interface ClassmateShare {
  id: string;
  share_type: 'lecture_summary' | 'material';
  message?: string;
  sharer: { first_name: string };
  content?: SharedLectureContent | null;
  material?: { id: string; title: string; mime_type?: string; summary?: string } | null;
  thanked: boolean;
  created_at: string;
  request?: { id: string; course_code: string; topic?: string | null };
}

export interface ClassmateSettings {
  classmates_visible: boolean;
  notify_classmate_requests: boolean;
}

/** Calls a classmates route; a missing route (404/405 with no JSON error of ours) means "not built yet". */
async function call<T>(path: string, opts: Parameters<typeof apiRequest>[1] = {}): Promise<T> {
  try {
    return await apiRequest<T>(path, opts);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 405 || (e.status === 404 && !/request|share|not found in/i.test(e.message)))) {
      throw new ClassmatesUnavailable();
    }
    if (e instanceof ApiError && e.code === 'NO_COHORT') {
      throw new ApiError('server', 'Add your department and level in your profile first, so Zuri knows who your classmates are.', {
        status: e.status,
        code: e.code,
      });
    }
    if (e instanceof ApiError && e.status === 429) {
      throw new ApiError('server', 'You’ve asked 5 times today. You can ask again tomorrow.', { status: 429 });
    }
    throw e;
  }
}

export async function listRequests(scope: 'cohort' | 'mine'): Promise<ClassmateRequest[]> {
  const res = await call<{ data?: ClassmateRequest[] | null }>('/classmates/requests', {
    query: scope === 'cohort' ? { scope, status: 'open', limit: '50' } : { scope, limit: '50' },
  });
  return res.data ?? [];
}

export async function getRequest(id: string): Promise<ClassmateRequest> {
  const res = await call<{ data: ClassmateRequest }>(`/classmates/requests/${encodeURIComponent(id)}`);
  return res.data;
}

export async function createRequest(input: {
  course_code: string;
  course_title?: string;
  kind: RequestKind;
  lecture_date?: string;
  topic?: string;
  message: string;
}): Promise<ClassmateRequest> {
  const res = await call<{ data: ClassmateRequest }>('/classmates/requests', { method: 'POST', body: input });
  return res.data;
}

/** The parts of a processed lecture that are shared (no audio, no full transcript). */
export function lectureShareContent(l: Lecture): SharedLectureContent {
  const a = l.analysis!;
  return {
    title: a.title || `${l.courseCode} lecture`,
    summary: a.summary,
    key_points: a.concepts.slice(0, 10).map((c) => (c.summary ? `${c.title}: ${c.summary}` : c.title)),
    notes: a.notes.slice(0, 50),
    flashcards: a.flashcards.slice(0, 100),
    recorded_at: l.createdAt,
    duration_seconds: l.durationSeconds,
  };
}

export async function shareLecture(requestId: string, lecture: Lecture, message?: string): Promise<ClassmateShare> {
  const res = await call<{ data: ClassmateShare }>(`/classmates/requests/${encodeURIComponent(requestId)}/shares`, {
    method: 'POST',
    body: { share_type: 'lecture_summary', content: lectureShareContent(lecture), ...(message?.trim() ? { message: message.trim() } : {}) },
  });
  return res.data;
}

export async function shareMaterial(requestId: string, materialServerId: string, message?: string): Promise<ClassmateShare> {
  const res = await call<{ data: ClassmateShare }>(`/classmates/requests/${encodeURIComponent(requestId)}/shares`, {
    method: 'POST',
    body: { share_type: 'material', material_id: materialServerId, ...(message?.trim() ? { message: message.trim() } : {}) },
  });
  return res.data;
}

export async function closeRequest(id: string, fulfilled: boolean): Promise<void> {
  await call(`/classmates/requests/${encodeURIComponent(id)}/close`, { method: 'POST', body: { fulfilled } });
}

export async function thankShare(id: string): Promise<void> {
  await call(`/classmates/shares/${encodeURIComponent(id)}/thanks`, { method: 'POST' });
}

export async function reportShare(id: string, reason: string): Promise<void> {
  await call(`/classmates/shares/${encodeURIComponent(id)}/report`, { method: 'POST', body: { reason } });
}

export async function listSharedWithMe(): Promise<ClassmateShare[]> {
  const res = await call<{ data?: ClassmateShare[] | null }>('/classmates/shared');
  return res.data ?? [];
}

export async function getClassmateSettings(): Promise<ClassmateSettings> {
  const res = await call<{ data: ClassmateSettings }>('/classmates/settings');
  return res.data;
}

export async function saveClassmateSettings(patch: Partial<ClassmateSettings>): Promise<void> {
  await call('/classmates/settings', { method: 'PUT', body: patch });
}

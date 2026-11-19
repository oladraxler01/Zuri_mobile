import { ApiError, apiRequest } from '@/services/api-client';

/**
 * Academic data on the Zuri API: enrolled courses, timetable, the "today"
 * timeline, learning signals and mastery, study stats and notification
 * preferences. Every call needs a signed-in user.
 *
 *   GET  /academic/courses                         enrolled courses (institution catalogue)
 *   POST /academic/courses/enroll                  { course_id, semester }
 *   GET  /courses                                  the student's own (custom) courses
 *   POST /courses                                  { name, code?, description? }
 *   GET  /academic/timetable                       weekly slots
 *   GET  /academic/timetable/next                  next class
 *   POST /academic/timetable/slots                 { course_id, day_of_week, start_time, end_time, venue }
 *   GET  /academic/today                           today's timeline cards
 *   POST /academic/today/interventions/:id/act|dismiss
 *   POST /academic/learning-signals                one quiz / review / question result
 *   GET  /academic/courses/:id/knowledge-state     mastery graph
 *   GET  /academic/courses/:id/weak-topics
 *   POST /academic/courses/:id/partner/chat        course study partner
 *   GET  /academic/courses/:id/partner/history
 *   POST /academic/courses/:id/lectures/:lid/ingest
 *   GET  /analytics/study-stats
 *   POST /analytics/study-sessions
 *   PUT  /notifications/preferences
 */

/** AI calls (chat, ingest) can take a while. */
const AI_TIMEOUT_MS = 60_000;

const enc = encodeURIComponent;

// ─── Types (as the server sends them) ────────────────────────────

export interface CourseScheduleDTO {
  id: string;
  course_id: string;
  day_of_week: number; // 1 = Monday … 6 = Saturday
  day_name?: string;
  start_time: string; // "09:00:00"
  end_time: string;
  venue?: string;
  recurrence?: string;
}

export interface LectureDTO {
  id: string;
  course_id: string;
  lecture_number: number;
  title: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  topics_covered?: string[];
  slides_url?: string;
  summary_text?: string;
  is_processed: boolean;
}

export interface AcademicEventDTO {
  id: string;
  course_id: string;
  event_type: string;
  title: string;
  description?: string;
  due_date: string;
  weight_percent?: number;
}

export interface CourseSyllabusTopic {
  topic: string;
  subtopics?: string[];
}

export interface CourseDetailDTO {
  id: string;
  /** "catalogue" (the school's) or "private" (the student's own; Phase 1). */
  visibility?: 'catalogue' | 'private' | string;
  /** The phone's id for a private course, echoed back. */
  client_id?: string | null;
  archived?: boolean;
  institution_id: string;
  department_id: string;
  code: string;
  title: string;
  level: number;
  credit_units: number;
  syllabus?: CourseSyllabusTopic[];
  description?: string;
  schedules: CourseScheduleDTO[];
  lectures: LectureDTO[];
  events: AcademicEventDTO[];
}

export interface PersonalCourseDTO {
  id: string;
  code?: string;
  name: string;
  description?: string;
  credit_units?: number;
  color?: string;
  created_at?: string;
}

export interface AcademicTimetableEntry {
  id: string;
  course_id: string;
  course_code: string;
  course_title: string;
  day_of_week: number;
  day_name?: string;
  start_time: string;
  end_time: string;
  venue?: string;
}

export interface NextClassResponse {
  has_upcoming: boolean;
  course_code?: string;
  course_title?: string;
  day_of_week?: number;
  start_time?: string;
  venue?: string;
  minutes_until_class?: number;
  message?: string;
}

export interface TimelineCardDTO {
  id: string;
  card_type: string;
  priority: number;
  title: string;
  subtitle?: string;
  action_type: string;
  action_payload?: Record<string, unknown>;
  estimated_minutes?: number;
  course_id?: string;
  course_code?: string;
  created_at?: string;
  is_dismissed: boolean;
  is_acted_upon: boolean;
}

export interface TodayTimelineResponse {
  date: string;
  current_academic_session?: string;
  cards: TimelineCardDTO[];
}

export interface KnowledgeStateDTO {
  topic: string;
  subtopic: string;
  mastery_score: number;
  status: string;
  total_attempts: number;
  correct_attempts: number;
  last_evaluated_at?: string;
  last_error_summary?: string;
}

export interface CourseMasteryGraphDTO {
  course_id: string;
  course_code: string;
  overall_mastery: number;
  mastered_count: number;
  struggling_count: number;
  total_subtopics: number;
  topic_groups: {
    topic: string;
    average_mastery: number;
    subtopics: KnowledgeStateDTO[];
  }[];
}

export interface WeakTopicDTO {
  course_id: string;
  course_code: string;
  topic: string;
  subtopic: string;
  mastery_score: number;
  status: string;
  reason: string;
}

export interface PartnerChatResponse {
  session_id: string;
  course_id: string;
  course_code: string;
  message: string;
  intent: string;
  widget_type?: string;
  widget_data?: Record<string, unknown>;
  provenance_citations: string[];
  weak_topics_referenced: string[];
  created_at: string;
}

export interface PartnerHistoryResponse {
  course_id: string;
  course_code: string;
  session_id?: string;
  messages: {
    id?: string;
    role: string;
    content: string;
    widget_type?: string;
    widget_data?: Record<string, unknown>;
    provenance_citations?: string[];
    created_at?: string;
  }[];
}

export interface LectureIngestionResponse {
  lecture_id: string;
  course_code: string;
  lecture_number: number;
  title: string;
  slides_processed: number;
  chunks_indexed: number;
  topics_bound: string[];
  summary: string;
  status: string;
}

export interface StudyStatsDTO {
  total_study_days: number;
  total_study_minutes: number;
  total_quizzes_completed: number;
  total_materials_reviewed: number;
  last_study_date?: string;
  current_streak: number;
}

export type LearningSignalType = 'quiz_attempt' | 'diagnostic' | 'flashcard_review' | 'chat_question';

// ─── Courses ─────────────────────────────────────────────────────

export function getEnrolledCourses(): Promise<CourseDetailDTO[]> {
  return apiRequest<CourseDetailDTO[]>('/academic/courses');
}

export function getCourseDetail(courseIdOrCode: string): Promise<CourseDetailDTO> {
  return apiRequest<CourseDetailDTO>(`/academic/courses/${enc(courseIdOrCode)}`);
}

/** Enrol in a catalogue course. Fails if the code isn't in the institution's catalogue. */
export function enrollCourse(courseIdOrCode: string, semester: string): Promise<CourseDetailDTO> {
  return apiRequest<CourseDetailDTO>('/academic/courses/enroll', {
    method: 'POST',
    body: { course_id: courseIdOrCode, semester },
  });
}

export async function getPersonalCourses(): Promise<PersonalCourseDTO[]> {
  const res = await apiRequest<{ data?: PersonalCourseDTO[] }>('/courses', { query: { limit: '50', offset: '0' } });
  return res?.data ?? [];
}

/** A course that isn't in the catalogue (the student typed it in). */
export async function createPersonalCourse(payload: {
  name: string;
  code?: string;
  description?: string;
}): Promise<PersonalCourseDTO> {
  const res = await apiRequest<{ data: PersonalCourseDTO }>('/courses', { method: 'POST', body: payload });
  return res.data;
}

// ─── Timetable ───────────────────────────────────────────────────

export function getTimetable(): Promise<AcademicTimetableEntry[]> {
  return apiRequest<AcademicTimetableEntry[]>('/academic/timetable');
}

export function getNextClass(): Promise<NextClassResponse> {
  return apiRequest<NextClassResponse>('/academic/timetable/next');
}

export function createTimetableSlot(payload: {
  course_id: string;
  day_of_week: number;
  start_time: string; // "09:00:00"
  end_time: string;
  venue: string;
}, clientId?: string): Promise<CourseScheduleDTO> {
  // Saved in the student's own timetable (works for catalogue and personal academic courses).
  // The phone's slot id as Idempotency-Key: a retry after a lost connection doesn't add it twice.
  return apiRequest<CourseScheduleDTO>('/academic/timetable/slots', {
    method: 'POST',
    body: payload,
    ...(clientId ? { headers: { 'Idempotency-Key': `slot-${clientId}` } } : {}),
  });
}

// ─── Today timeline ──────────────────────────────────────────────

export function getTodayTimeline(): Promise<TodayTimelineResponse> {
  return apiRequest<TodayTimelineResponse>('/academic/today');
}

export async function actOnIntervention(id: string): Promise<void> {
  await apiRequest(`/academic/today/interventions/${enc(id)}/act`, { method: 'POST' });
}

export async function dismissIntervention(id: string): Promise<void> {
  await apiRequest(`/academic/today/interventions/${enc(id)}/dismiss`, { method: 'POST' });
}

// ─── Learning signals and mastery ────────────────────────────────

export function recordLearningSignal(payload: {
  course_id: string;
  topic: string;
  subtopic: string;
  signal_type: LearningSignalType;
  score: number;
  max_score: number;
  latency_ms?: number;
  confidence_level?: number;
  details?: Record<string, unknown>;
}): Promise<KnowledgeStateDTO> {
  return apiRequest<KnowledgeStateDTO>('/academic/learning-signals', { method: 'POST', body: payload });
}

export function getKnowledgeState(courseIdOrCode: string): Promise<CourseMasteryGraphDTO> {
  return apiRequest<CourseMasteryGraphDTO>(`/academic/courses/${enc(courseIdOrCode)}/knowledge-state`);
}

export function getWeakTopics(courseIdOrCode: string, limit = 5): Promise<WeakTopicDTO[]> {
  return apiRequest<WeakTopicDTO[]>(`/academic/courses/${enc(courseIdOrCode)}/weak-topics`, {
    query: { limit: String(limit) },
  });
}

// ─── Course study partner and lecture ingest (AI) ────────────────

export function chatWithCoursePartner(
  courseIdOrCode: string,
  payload: { message: string; topic?: string; session_id?: string; history?: { role: string; content: string }[] }
): Promise<PartnerChatResponse> {
  return apiRequest<PartnerChatResponse>(`/academic/courses/${enc(courseIdOrCode)}/partner/chat`, {
    method: 'POST',
    body: payload,
    timeoutMs: AI_TIMEOUT_MS,
  });
}

export function getCoursePartnerHistory(courseIdOrCode: string, sessionId?: string): Promise<PartnerHistoryResponse> {
  return apiRequest<PartnerHistoryResponse>(`/academic/courses/${enc(courseIdOrCode)}/partner/history`, {
    query: { session_id: sessionId },
  });
}

export function ingestLectureTranscript(
  courseIdOrCode: string,
  lectureId: string,
  payload: { raw_text?: string; file_url?: string }
): Promise<LectureIngestionResponse> {
  return apiRequest<LectureIngestionResponse>(
    `/academic/courses/${enc(courseIdOrCode)}/lectures/${enc(lectureId)}/ingest`,
    { method: 'POST', body: payload, timeoutMs: AI_TIMEOUT_MS }
  );
}

// ─── Phase 1 (flag "onboarding_v1"): personal courses, own classes, profile ───

/**
 * POST /academic/courses { code, title, level?, credit_units?, client_id } → 201 CourseDetailDTO.
 * The course lives in the academic service, so its classes, reminders and prep work like a
 * catalogue course. 409 "catalogue_course_exists" returns the school's course to enrol in
 * instead; 409 "duplicate_personal_course" returns the existing id. Both are resolved here.
 * Idempotency-Key = the phone's course id, so a retry never creates two.
 */
export async function createAcademicCourse(input: {
  code?: string;
  title: string;
  level?: number;
  credit_units?: number;
  client_id: string;
}): Promise<{ course: CourseDetailDTO; catalogue: boolean }> {
  try {
    const course = await apiRequest<CourseDetailDTO>('/academic/courses', {
      method: 'POST',
      body: input,
      headers: { 'Idempotency-Key': `course-${input.client_id}` },
    });
    return { course, catalogue: false };
  } catch (e) {
    const detail = e instanceof ApiError ? (e.body as any)?.detail : undefined;
    if (detail?.code === 'catalogue_course_exists' && detail.catalogue_course) {
      return { course: detail.catalogue_course as CourseDetailDTO, catalogue: true };
    }
    if (detail?.code === 'duplicate_personal_course' && detail.existing_course_id) {
      return { course: await getCourseDetail(detail.existing_course_id), catalogue: false };
    }
    throw e;
  }
}

/** DELETE /academic/courses/:id → archives a personal course (restore with POST …/restore). */
export async function archiveAcademicCourse(id: string): Promise<void> {
  await apiRequest(`/academic/courses/${enc(id)}`, { method: 'DELETE' });
}

/** DELETE /academic/timetable/slots/:id → removes one of the student's own classes (204). */
export async function deleteTimetableSlot(id: string): Promise<void> {
  try {
    await apiRequest(`/academic/timetable/slots/${enc(id)}`, { method: 'DELETE' });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return; // already gone
    throw e;
  }
}

export interface AcademicProfileDTO {
  user_id: string;
  institution_id?: string | null;
  level?: number | null;
  semester?: string | null;
  timezone: string;
  reminder_lead_minutes: number;
  onboarding_completed_at?: string | null;
  updated_at?: string | null;
}

/** GET /academic/profile */
export function getAcademicProfile(): Promise<AcademicProfileDTO> {
  return apiRequest<AcademicProfileDTO>('/academic/profile');
}

/** PUT /academic/profile: sends only the fields given (level 100–900, semester, timezone, reminder lead…). */
export function saveAcademicProfile(patch: {
  level?: number;
  semester?: string;
  timezone?: string;
  reminder_lead_minutes?: number;
  institution_id?: string;
}): Promise<AcademicProfileDTO> {
  return apiRequest<AcademicProfileDTO>('/academic/profile', { method: 'PUT', body: patch });
}

// ─── Phase 2 (flag "proactive_worker"): one-off timetable changes ───

export interface TimetableExceptionDTO {
  id: string;
  course_id: string;
  slot_id?: string | null;
  kind: 'cancelled' | 'moved' | 'extra';
  date: string;
  new_date?: string | null;
  new_start_time?: string | null;
  new_end_time?: string | null;
  new_venue?: string | null;
  note?: string | null;
}

/**
 * POST /academic/timetable/exceptions: one class meeting is cancelled, moved, or an extra class is added.
 * The server's reminders and "next class" follow it, and it sends one follow-up if a reminded class changes.
 */
export function createTimetableException(input: {
  kind: 'cancelled' | 'moved' | 'extra';
  date: string;
  slot_id?: string;
  course_id?: string;
  new_date?: string;
  new_start_time?: string;
  new_end_time?: string;
  new_venue?: string;
  note?: string;
}): Promise<TimetableExceptionDTO> {
  return apiRequest<TimetableExceptionDTO>('/academic/timetable/exceptions', { method: 'POST', body: input });
}

/** GET /academic/timetable/exceptions */
export function listTimetableExceptions(): Promise<TimetableExceptionDTO[]> {
  return apiRequest<TimetableExceptionDTO[]>('/academic/timetable/exceptions');
}

/** DELETE /academic/timetable/exceptions/:id (undo) */
export async function deleteTimetableException(id: string): Promise<void> {
  await apiRequest(`/academic/timetable/exceptions/${enc(id)}`, { method: 'DELETE' });
}

// ─── Lecturer: where the class is struggling ─────────────────────

export interface LecturerClassSignalDTO {
  course_id: string;
  course_code: string;
  topic: string;
  subtopic: string;
  total_students: number;
  struggling_count: number;
  struggling_percentage: number;
  recommendation?: string;
}

/** GET /academic/courses/:idOrCode/lecturer-signals → class-wide struggles per subtopic (catalogue courses). */
export function getLecturerSignals(courseIdOrCode: string): Promise<LecturerClassSignalDTO[]> {
  return apiRequest<LecturerClassSignalDTO[]>(`/academic/courses/${enc(courseIdOrCode)}/lecturer-signals`);
}

// ─── Missing information prompts ("context gaps") ────────────────

export interface ContextGapDTO {
  id: string;
  user_id: string;
  course_id: string;
  /** "missing_class_time" | "missing_venue" */
  gap_type: string;
  prompt_question: string;
  field_target: string;
  is_resolved: boolean;
}

/** GET /academic/context-gaps → open prompts about missing class times and venues. */
export function getContextGaps(): Promise<ContextGapDTO[]> {
  return apiRequest<ContextGapDTO[]>('/academic/context-gaps');
}

/**
 * POST /academic/context-gaps/:id/resolve { response_value }.
 * Only used for venues: the server ignores the answer for missing class times
 * (it always creates Monday 09:00–11:00), so those are answered by adding the
 * real class instead (BACKEND_REQUESTS #22).
 */
export async function resolveContextGap(id: string, responseValue: string): Promise<void> {
  await apiRequest(`/academic/context-gaps/${enc(id)}/resolve`, { method: 'POST', body: { response_value: responseValue } });
}

// ─── Analytics and notifications ─────────────────────────────────

export async function getStudyStats(): Promise<StudyStatsDTO | null> {
  const res = await apiRequest<{ data?: StudyStatsDTO }>('/analytics/study-stats');
  return res?.data ?? null;
}

export async function recordStudySession(payload: {
  duration_minutes: number;
  materials_reviewed?: number;
  quizzes_completed?: number;
  topics_studied?: string[];
}): Promise<void> {
  await apiRequest('/analytics/study-sessions', { method: 'POST', body: payload });
}

export async function updateNotificationPreferences(payload: {
  push_enabled?: boolean;
  email_enabled?: boolean;
  notify_on_study_reminder?: boolean;
  notify_on_quiz_completion?: boolean;
  notify_on_goal_completion?: boolean;
  notify_on_material_processed?: boolean;
  timezone?: string;
}): Promise<void> {
  await apiRequest('/notifications/preferences', { method: 'PUT', body: payload });
}

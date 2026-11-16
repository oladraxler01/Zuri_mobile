import { apiRequest } from '@/services/api-client';

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
}): Promise<CourseScheduleDTO> {
  return apiRequest<CourseScheduleDTO>('/academic/timetable/slots', { method: 'POST', body: payload });
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

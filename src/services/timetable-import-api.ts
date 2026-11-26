import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { ApiError, apiRequest } from '@/services/api-client';
import type { CourseDetailDTO, CourseScheduleDTO } from '@/services/academic-api';

/**
 * Timetable import on the Zuri API (needs a signed-in student).
 *
 *   POST /academic/timetable/import          photo, PDF or pasted text → classes to review (nothing saved)
 *   POST /academic/timetable/import/confirm  the reviewed classes → saved in the student's timetable
 *
 * The server reads the table itself (the AI looks at the page image for photos
 * and scanned PDFs), so the table's rows and columns are kept.
 */

/** Reading a page with the AI can take a while. */
const AI_TIMEOUT_MS = 120_000;

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
export const MAX_IMPORT_TEXT = 20_000;

export const IMPORT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export type ImportMimeType = (typeof IMPORT_MIME_TYPES)[number];

/** What saving will do with the row's course. */
export type CourseMatchKind = 'enrolled' | 'personal' | 'catalogue' | 'new';

export interface CourseMatchDTO {
  kind: CourseMatchKind;
  course_id: string | null;
  code: string;
  title?: string;
}

export interface ImportedClassDTO {
  key: string;
  course_code: string;
  course_title?: string | null;
  /** 1 = Monday … 6 = Saturday; Sunday is 0 (or 7). */
  day_of_week: number;
  day_name?: string;
  /** "08:00", 24-hour, in the student's timezone */
  start_time: string;
  end_time: string;
  venue?: string | null;
  recurrence?: string;
  course_match?: CourseMatchDTO | null;
  warnings?: string[];
}

export interface TimetableImportPreview {
  classes: ImportedClassDTO[];
  courses: (CourseMatchDTO & { classes: number })[];
  warnings: string[];
  source?: string;
  model?: string;
}

export interface ConfirmClassInput {
  course_id?: string;
  course_code: string;
  course_title?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  venue?: string;
  recurrence?: string;
}

export interface TimetableImportResult {
  courses: CourseDetailDTO[];
  slots: CourseScheduleDTO[];
  created_courses: number;
  warnings: string[];
}

/** The type the server expects for a picked file, or null if it can't read it. */
export function importMimeType(name: string, mimeType?: string | null): ImportMimeType | 'heic' | null {
  const type = (mimeType ?? '').toLowerCase();
  const ext = name.toLowerCase().split('.').pop() ?? '';
  if (type.includes('heic') || type.includes('heif') || ext === 'heic' || ext === 'heif') return 'heic';
  if (type === 'application/pdf' || ext === 'pdf') return 'application/pdf';
  if (type === 'image/png' || ext === 'png') return 'image/png';
  if (type === 'image/webp' || ext === 'webp') return 'image/webp';
  if (type === 'image/jpeg' || type === 'image/jpg' || ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  return null;
}

/** The picked file as base64 (the server also accepts a data: URL, which is what the web build reads). */
export async function readFileAsBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
  return new File(uri).base64();
}

/** Plain words for the errors this route can give. */
function friendly(e: unknown): unknown {
  if (!(e instanceof ApiError)) return e;
  const extra = { status: e.status, code: e.code, body: e.body };
  switch (e.status) {
    case 413:
      return new ApiError('server', 'That file is over 10 MB. Crop the photo to just the timetable, or paste the text instead.', extra);
    case 415:
      return new ApiError('server', 'Zuri can read JPEG, PNG or WebP photos and PDFs. Take a screenshot of the timetable and try that.', extra);
    case 429:
      return new ApiError('server', 'You’ve used today’s AI reads. Paste the timetable as text, or try again tomorrow.', extra);
    case 503:
      // Here 503 means the AI is busy, not that Zuri is down for maintenance.
      return new ApiError('server', 'Zuri couldn’t read it just now. Try again, or paste the timetable as text.', extra);
    default:
      return e;
  }
}

/** Read a timetable without saving anything. */
export async function previewTimetableImport(
  input: { file_base64: string; mime_type: ImportMimeType } | { text: string }
): Promise<TimetableImportPreview> {
  try {
    const res = await apiRequest<TimetableImportPreview>('/academic/timetable/import', {
      method: 'POST',
      body: input,
      timeoutMs: AI_TIMEOUT_MS,
    });
    return { classes: res?.classes ?? [], courses: res?.courses ?? [], warnings: res?.warnings ?? [], source: res?.source, model: res?.model };
  } catch (e) {
    throw friendly(e);
  }
}

/**
 * Save the reviewed classes. Send the same idempotencyKey on every retry of one
 * import, so a retry over a bad connection never saves twice.
 */
export async function confirmTimetableImport(
  classes: ConfirmClassInput[],
  replaceExisting: boolean,
  idempotencyKey: string
): Promise<TimetableImportResult> {
  try {
    const res = await apiRequest<TimetableImportResult>('/academic/timetable/import/confirm', {
      method: 'POST',
      body: { classes, replace_existing: replaceExisting },
      headers: { 'Idempotency-Key': idempotencyKey },
      timeoutMs: 60_000,
    });
    return { courses: res?.courses ?? [], slots: res?.slots ?? [], created_courses: res?.created_courses ?? 0, warnings: res?.warnings ?? [] };
  } catch (e) {
    throw friendly(e);
  }
}

/** A random v4 UUID for Idempotency-Key. */
export function newIdempotencyKey(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

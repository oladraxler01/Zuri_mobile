import { Platform } from 'react-native';
import type { IoniconName, LectureAnalysis, TranscriptSegment } from '@/types/lecture';
import { buildSampleAnalysis } from '@/data/sample-lecture-analysis';
import { API_BASE, isBackendConfigured } from '@/services/api-config';

export { API_BASE, isBackendConfigured };

/**
 * Lecture upload + processing.
 *
 * When the backend is connected (see api-config.ts), recordings are uploaded
 * to POST {API_BASE}/lectures/transcribe (see AUDIO_PROCESSING_SPEC.md).
 * Until then, a local stand-in simulates the upload and returns sample results.
 */

export type ProcessingStage = 'uploading' | 'processing';

/**
 * Errors the app reacts to differently:
 * - network: no connection → wait and retry when back online
 * - session-expired (401), update-required (426), maintenance (503) → full-screen status
 * - server: anything else → "try again"
 */
export type ApiErrorKind = 'network' | 'server' | 'session-expired' | 'update-required' | 'maintenance';

export class ApiError extends Error {
  kind: ApiErrorKind;
  constructor(kind: ApiErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

export function errorForStatus(status: number): ApiError {
  if (status === 401) return new ApiError('session-expired', 'Your session has expired. Please sign in again.');
  if (status === 426) return new ApiError('update-required', 'A newer version of the app is required.');
  if (status === 503) return new ApiError('maintenance', 'The service is down for maintenance.');
  return new ApiError('server', `The server had a problem (${status}). Please try again.`);
}

export interface ProcessLectureInput {
  audioUri: string;
  courseCode: string;
  courseTitle: string;
  durationSeconds: number;
}

export type ProgressCallback = (stage: ProcessingStage, progress?: number) => void;

export async function processLecture(
  input: ProcessLectureInput,
  onProgress: ProgressCallback
): Promise<LectureAnalysis> {
  if (isBackendConfigured) {
    return uploadToBackend(input, onProgress);
  }
  return simulateProcessing(input, onProgress);
}

// ─── Real backend ─────────────────────────────────────────────────

async function uploadToBackend(
  input: ProcessLectureInput,
  onProgress: ProgressCallback
): Promise<LectureAnalysis> {
  const form = new FormData();
  const name = `lecture-${Date.now()}${Platform.OS === 'web' ? '.webm' : '.m4a'}`;

  if (Platform.OS === 'web') {
    const blob = await (await fetch(input.audioUri)).blob();
    form.append('file', blob, name);
  } else {
    // React Native's FormData accepts { uri, name, type } file descriptors.
    form.append('file', { uri: input.audioUri, name, type: 'audio/m4a' } as unknown as Blob);
  }
  form.append('course_code', input.courseCode);
  form.append('course_title', input.courseTitle);

  // XMLHttpRequest (not fetch) so we get upload progress events.
  const json = await new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/lectures/transcribe`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress('uploading', e.loaded / e.total);
    };
    xhr.upload.onload = () => onProgress('processing');
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new ApiError('server', 'The server sent a response we could not read.'));
        }
      } else {
        reject(errorForStatus(xhr.status));
      }
    };
    xhr.onerror = () => reject(new ApiError('network', 'No connection. We’ll upload when you’re back online.'));
    xhr.ontimeout = () => reject(new ApiError('network', 'The upload timed out. We’ll try again shortly.'));
    onProgress('uploading', 0);
    xhr.send(form);
  });

  return mapServerResponse(json, input);
}

const ICON_MAP: Record<string, IoniconName> = {
  memory: 'hardware-chip-outline',
  'table-chart': 'grid-outline',
  'git-network': 'git-network-outline',
  layers: 'layers-outline',
  calculator: 'calculator-outline',
};

/** Map the backend payload (spec section 7) onto the app's LectureAnalysis. */
export function mapServerResponse(json: any, input: ProcessLectureInput): LectureAnalysis {
  const data = json?.data ?? json;
  const duration: number = data.audioDurationSeconds ?? input.durationSeconds;

  let transcript: TranscriptSegment[] = Array.isArray(data.segments)
    ? data.segments.map((s: any) => ({ start: s.start, end: s.end, text: String(s.text).trim() }))
    : [];
  if (!transcript.length && typeof data.transcription === 'string') {
    // No timestamps from the server: split into sentences spread evenly over the audio.
    const sentences = data.transcription.match(/[^.!?]+[.!?]*/g)?.map((s: string) => s.trim()).filter(Boolean) ?? [];
    const step = duration / Math.max(1, sentences.length);
    transcript = sentences.map((text: string, i: number) => ({ start: i * step, end: (i + 1) * step, text }));
  }

  const questions = Array.isArray(data.questions)
    ? data.questions
    : data.diagnosticQuestion
      ? [data.diagnosticQuestion]
      : [];

  return {
    source: 'server',
    title: data.lectureTitle ?? data.courseTitle ?? input.courseTitle,
    summary: data.summary ?? '',
    transcript,
    concepts: (data.bentoConcepts ?? []).map((c: any, i: number) => ({
      id: String(c.id ?? i),
      title: String(c.title).replace(/^\d+\.\s*/, ''),
      summary: c.summary,
      icon: ICON_MAP[c.icon] ?? 'bulb-outline',
    })),
    knowledgeGap: data.knowledgeGap,
    questions: questions.map((q: any, i: number) => ({
      id: String(q.id ?? i),
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation ?? '',
    })),
    flashcards: data.flashcards ?? [],
    notes: data.notes ?? [],
  };
}

// ─── Local stand-in ───────────────────────────────────────────────

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function simulateProcessing(
  input: ProcessLectureInput,
  onProgress: ProgressCallback
): Promise<LectureAnalysis> {
  for (let i = 0; i <= 10; i++) {
    onProgress('uploading', i / 10);
    await wait(180);
  }
  for (let i = 0; i <= 10; i++) {
    onProgress('processing', i / 10);
    await wait(340);
  }
  return buildSampleAnalysis(input);
}

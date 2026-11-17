import type { IoniconName, LectureAnalysis, TranscriptSegment } from '@/types/lecture';
import { API_BASE, isBackendConfigured } from '@/services/api-config';
import { ApiError, errorForStatus, type ApiErrorKind } from '@/services/api-client';
import { uploadToZuri } from '@/services/upload-api';

export { API_BASE, isBackendConfigured, ApiError, errorForStatus };
export type { ApiErrorKind };

/**
 * Lecture upload + processing.
 *
 * With the live API on (see api-config.ts) the recording is sent to Zuri as an
 * audio material (see upload-api.ts) and the finished record is mapped onto
 * the Lecture Intelligence screen. There is no on-phone stand-in: if the
 * server can't process it, the lecture shows why and the recording stays saved.
 */

export type ProcessingStage = 'uploading' | 'processing';

export interface ProcessLectureInput {
  audioUri: string;
  courseCode: string;
  courseTitle: string;
  durationSeconds: number;
  /** From an earlier attempt, so retries don't upload twice. */
  serverId?: string;
  uploaded?: boolean;
  onServerId?: (id: string) => void;
  onUploaded?: () => void;
}

export type ProgressCallback = (stage: ProcessingStage, progress?: number) => void;

export async function processLecture(
  input: ProcessLectureInput,
  onProgress: ProgressCallback
): Promise<LectureAnalysis> {
  if (!isBackendConfigured) {
    // No made-up results: lectures are only processed by Zuri's server.
    throw new ApiError('server', 'Lecture processing needs Zuri’s server, which is switched off in this build.');
  }
  return uploadToBackend(input, onProgress);
}

// ─── Real backend ─────────────────────────────────────────────────

async function uploadToBackend(input: ProcessLectureInput, onProgress: ProgressCallback): Promise<LectureAnalysis> {
  const isWebm = input.audioUri.startsWith('blob:') || input.audioUri.endsWith('.webm');
  const record = await uploadToZuri({
    uri: input.audioUri,
    name: `lecture-${Date.now()}${isWebm ? '.webm' : '.m4a'}`,
    mimeType: isWebm ? 'audio/webm' : 'audio/m4a',
    title: `${input.courseCode} lecture, ${new Date().toLocaleDateString()}`,
    serverId: input.serverId,
    uploaded: input.uploaded,
    onServerId: input.onServerId,
    onUploaded: input.onUploaded,
    onProgress,
    // Transcribing an hour of audio takes a while; keep checking for 3 minutes.
    waitMs: 180_000,
  });
  return mapServerResponse(record, input);
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

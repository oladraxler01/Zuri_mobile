import type { IoniconName, LectureAnalysis, TranscriptSegment } from '@/types/lecture';
import { API_BASE, isBackendConfigured } from '@/services/api-config';
import { ApiError, errorForStatus, type ApiErrorKind } from '@/services/api-client';
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { uploadToZuri } from '@/services/upload-api';
import { generateMaterialFlashcards, generateMaterialQuiz, summariseMaterial } from '@/services/ai-api';

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

// ─── Live transcript → notes ───────────────────────────────────────

export interface ProcessTranscriptInput {
  segments: TranscriptSegment[];
  courseCode: string;
  courseTitle: string;
  durationSeconds: number;
  createdAt: string;
  serverId?: string;
  onServerId?: (id: string) => void;
}

const stamp = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`;
};

/**
 * A lecture transcribed live on the phone becomes notes on Zuri's server:
 * the transcript is uploaded as a text material (the server's text pipeline),
 * then Zuri's AI writes the summary, key points, quiz and flashcards from it.
 * The transcript itself is always kept; if the AI is unavailable the lecture
 * opens with the transcript and a "notes not ready yet" note to try again.
 */
export async function processTranscript(input: ProcessTranscriptInput, onProgress: ProgressCallback): Promise<LectureAnalysis> {
  const transcript = input.segments;
  const base: LectureAnalysis = {
    source: 'server',
    title: `${input.courseCode} lecture`,
    summary: '',
    transcript,
    concepts: [],
    questions: [],
    flashcards: [],
    notes: [],
  };
  const words = transcript.reduce((n, s) => n + s.text.split(/\s+/).length, 0);
  if (words < 25) {
    return { ...base, notesPending: 'The transcript is too short to make notes from. Record a little more of the lecture next time.' };
  }

  onProgress('uploading', 0);
  let materialId = input.serverId;
  if (!materialId) {
    const date = new Date(input.createdAt).toLocaleDateString();
    const text =
      `${input.courseCode}: ${input.courseTitle}\nLecture transcript, ${date}\n\n` +
      transcript.map((s) => `[${stamp(s.start)}] ${s.text}`).join('\n');
    const name = `lecture-transcript-${Date.now()}.txt`;
    let uri: string;
    if (Platform.OS === 'web') {
      uri = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    } else {
      const f = new File(Paths.cache, name);
      if (f.exists) f.delete();
      f.write(text);
      uri = f.uri;
    }
    const rec = await uploadToZuri({
      uri,
      name,
      mimeType: 'text/plain',
      title: `${input.courseCode} lecture transcript, ${date}`,
      onServerId: (id) => {
        materialId = id;
        input.onServerId?.(id);
      },
      onProgress,
      waitMs: 120_000,
    });
    materialId = materialId ?? rec.id;
  }

  onProgress('processing', 0.5);
  const id = materialId!;
  const [summary, quiz, cards] = await Promise.allSettled([
    summariseMaterial(id),
    generateMaterialQuiz(id, 5),
    generateMaterialFlashcards(id, 8),
  ]);
  if (summary.status === 'rejected') {
    const why = summary.reason instanceof Error ? summary.reason.message : 'Zuri’s AI couldn’t be reached.';
    return { ...base, notesPending: `Your transcript is saved. Notes aren’t ready yet: ${why}` };
  }
  const s = summary.value;
  return {
    ...base,
    title: input.courseTitle ? `${input.courseCode}: ${input.courseTitle}` : base.title,
    summary: s.summary ?? '',
    concepts: (s.key_takeaways ?? []).slice(0, 8).map((k, i) => ({
      id: `k${i}`,
      title: k.split(/[.:;–-]/)[0].slice(0, 60),
      summary: k,
      icon: 'bulb-outline' as IoniconName,
    })),
    notes: [
      ...(s.key_takeaways?.length ? [{ heading: 'Key points', points: s.key_takeaways }] : []),
      ...(s.vocab_terms?.length ? [{ heading: 'Terms to know', points: s.vocab_terms.map((v) => `${v.term}: ${v.definition}`) }] : []),
    ],
    questions: quiz.status === 'fulfilled' ? quiz.value : [],
    flashcards: cards.status === 'fulfilled' ? cards.value.map((c) => ({ question: c.front, answer: c.back })) : [],
  };
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

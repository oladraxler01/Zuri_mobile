import type { Ionicons } from '@expo/vector-icons';

export type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** Where a lecture is in the pipeline: record → upload → process → ready. */
/** 'waiting' = saved, but no internet yet; uploads automatically when back online. */
export type LectureStatus = 'waiting' | 'uploading' | 'processing' | 'ready' | 'failed';

export interface TranscriptSegment {
  /** seconds from the start of the recording */
  start: number;
  end: number;
  text: string;
}

export interface LectureConcept {
  id: string;
  title: string;
  summary: string;
  icon: IoniconName;
}

export interface KnowledgeGap {
  concept: string;
  reason: string;
  explanation?: string;
}

export interface LectureQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Flashcard {
  question: string;
  answer: string;
}

export interface NoteSection {
  heading: string;
  points: string[];
}

export interface LectureAnalysis {
  /** 'sample' = placeholder content while the backend isn't connected */
  source: 'sample' | 'server';
  /** Topic of the lecture, e.g. "Introduction to Dynamic Programming" */
  title: string;
  summary: string;
  transcript: TranscriptSegment[];
  concepts: LectureConcept[];
  knowledgeGap?: KnowledgeGap;
  questions: LectureQuestion[];
  flashcards: Flashcard[];
  notes: NoteSection[];
}

export interface Lecture {
  id: string;
  courseId?: string;
  courseCode: string;
  courseTitle: string;
  /** ISO timestamp when recording finished */
  createdAt: string;
  durationSeconds: number;
  audioUri?: string;
  status: LectureStatus;
  /** 0–1 progress of the current stage, when known */
  progress?: number;
  error?: string;
  analysis?: LectureAnalysis;
  /** set once the user has seen the "processing complete" screen */
  seenAt?: string;
  quizBest?: { score: number; total: number };
}

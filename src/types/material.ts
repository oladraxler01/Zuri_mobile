import type { LectureConcept, LectureQuestion } from '@/types/lecture';

export type MaterialCategory = 'notes' | 'slides' | 'past-questions' | 'reading' | 'other';

export const MATERIAL_CATEGORIES: { key: MaterialCategory; label: string }[] = [
  { key: 'notes', label: 'Notes' },
  { key: 'slides', label: 'Slides' },
  { key: 'past-questions', label: 'Past questions' },
  { key: 'reading', label: 'Reading' },
  { key: 'other', label: 'Other' },
];

/** Who can see a material once sharing is live on the server. */
export type MaterialVisibility = 'private' | 'course';

export type MaterialStatus = 'waiting' | 'uploading' | 'processing' | 'ready' | 'failed';

/** A quotable passage from the document, used as a citation. */
export interface MaterialPassage {
  id: string;
  /** page or section label, e.g. "p. 4" or "Section 2" */
  location: string;
  text: string;
}

export interface MaterialAnalysis {
  source: 'sample' | 'server' | 'local';
  title: string;
  summary: string;
  concepts: LectureConcept[];
  questions: LectureQuestion[];
  passages: MaterialPassage[];
  /** The quiz saved on the server (POST /quizzes) and its question ids, in order. */
  serverQuiz?: { id: string; questionIds: string[] };
  /** The flashcard deck saved on the server (POST /flashcard-decks). */
  serverDeckId?: string;
  /** Last server-graded attempt of the quiz (POST /quizzes/:id/submit). */
  lastAttempt?: { score: number; maxScore: number; percentage: number; at: string };
  /** Made on request by Zuri's AI (study.flashcards.generate). */
  flashcards?: { front: string; back: string; topic?: string }[];
  /** Exam-style theory and applied questions with model answers (study.quiz.generate). */
  examQuestions?: { question: string; modelAnswer: string; markingGuide: string[]; marks: number; topic?: string }[];
}

export interface Material {
  id: string;
  courseId?: string;
  courseCode?: string;
  name: string;
  mimeType?: string;
  sizeBytes?: number;
  uri: string;
  addedAt: string;
  category: MaterialCategory;
  visibility: MaterialVisibility;
  status: MaterialStatus;
  progress?: number;
  error?: string;
  /** Id of this upload on the Zuri server, once created */
  serverId?: string;
  /** true once the file itself is on Zuri's storage */
  uploaded?: boolean;
  analysis?: MaterialAnalysis;
  pinned?: boolean;
}

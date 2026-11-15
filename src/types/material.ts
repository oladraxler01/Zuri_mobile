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
  analysis?: MaterialAnalysis;
  pinned?: boolean;
}

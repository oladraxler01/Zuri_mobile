export interface Paper {
  /** OpenAlex work id, e.g. "W1980516134" */
  id: string;
  title: string;
  authors: string[];
  year?: number;
  venue?: string;
  doi?: string;
  /** landing page */
  url?: string;
  /** open-access full text (PDF or page), when available */
  oaUrl?: string;
  abstract?: string;
  citedBy: number;
  referencesCount: number;
  /** topics + keywords, used for themes and the literature map */
  topics: string[];
  type?: string;
}

export type EvidenceStance = 'supports' | 'contradicts' | 'background';

export interface Evidence {
  id: string;
  paperId: string;
  quote: string;
  stance: EvidenceStance;
  theme?: string;
  note?: string;
  createdAt: string;
}

export interface ResearchNote {
  id: string;
  text: string;
  paperId?: string;
  createdAt: string;
  updatedAt: string;
}

export type CitationStyle = 'apa' | 'mla' | 'harvard' | 'bibtex';

export interface ResearchProject {
  id: string;
  title: string;
  question: string;
  courseId?: string;
  keywords: string[];
  sourceIds: string[];
  evidence: Evidence[];
  notes: ResearchNote[];
  /** themes the student added or renamed (on top of ones derived from sources) */
  themes: string[];
  citationStyle: CitationStyle;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

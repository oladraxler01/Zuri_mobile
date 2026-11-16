import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadJSON, saveJSON } from '@/utils/storage';
import { onReset } from '@/utils/reset';

const KEY = 'lexi.progress.v1';

/**
 * A log of what the student does: quiz answers, flashcards, study sessions,
 * concept reviews. Mastery, the strength map, study history and course
 * activity are all computed from it. Saved on the phone.
 */
export type ProgressEventType = 'quiz-answer' | 'flashcard' | 'study-session' | 'concept-reviewed';

export interface ProgressEvent {
  id: string;
  at: string;
  type: ProgressEventType;
  courseId?: string;
  courseCode?: string;
  /** concept the event is about, when known */
  concept?: string;
  /** for quiz answers and flashcards */
  correct?: boolean;
  /** lecture or material it came from */
  sourceId?: string;
  sourceKind?: 'lecture' | 'material';
  /** for study sessions */
  minutes?: number;
  label?: string;
}

interface ProgressContextType {
  events: ProgressEvent[];
  loaded: boolean;
  log: (e: Omit<ProgressEvent, 'id' | 'at'> & { at?: string }) => void;
  logMany: (es: (Omit<ProgressEvent, 'id' | 'at'> & { at?: string })[]) => void;
  clear: () => void;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  // "Delete all my data" empties this store.
  useEffect(() => onReset(() => setEvents([])), []);

  useEffect(() => {
    loadJSON<ProgressEvent[]>(KEY).then((v) => {
      if (v) setEvents(v);
      setLoaded(true);
    });
  }, []);
  useEffect(() => {
    if (loaded) saveJSON(KEY, events);
  }, [events, loaded]);

  const make = (e: Omit<ProgressEvent, 'id' | 'at'> & { at?: string }): ProgressEvent => ({
    ...e,
    id: `ev_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    at: e.at ?? new Date().toISOString(),
  });

  const value: ProgressContextType = {
    events,
    loaded,
    // Keep the most recent 3000 events; plenty for a semester.
    log: (e) => setEvents((x) => [...x, make(e)].slice(-3000)),
    logMany: (es) => setEvents((x) => [...x, ...es.map(make)].slice(-3000)),
    clear: () => setEvents([]),
  };

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within a ProgressProvider');
  return ctx;
}

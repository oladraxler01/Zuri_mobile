import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Evidence, Paper, ResearchNote, ResearchProject } from '@/types/research';
import { loadJSON, saveJSON } from '@/utils/storage';
import { onReset } from '@/utils/reset';

const KEY = 'lexi.research.v1';

interface ResearchState {
  /** every paper the student has saved or added to a project (cached so it works offline) */
  papers: Record<string, Paper>;
  saved: string[];
  projects: ResearchProject[];
}

interface ResearchContextType extends ResearchState {
  loaded: boolean;
  cachePaper: (p: Paper) => void;
  isSaved: (id: string) => boolean;
  toggleSaved: (p: Paper) => void;
  createProject: (p: Pick<ResearchProject, 'title' | 'question' | 'courseId' | 'keywords'>) => string;
  updateProject: (id: string, patch: Partial<ResearchProject>) => void;
  deleteProject: (id: string) => void;
  addSource: (projectId: string, p: Paper) => void;
  removeSource: (projectId: string, paperId: string) => void;
  addEvidence: (projectId: string, e: Omit<Evidence, 'id' | 'createdAt'>) => void;
  updateEvidence: (projectId: string, id: string, patch: Partial<Evidence>) => void;
  removeEvidence: (projectId: string, id: string) => void;
  saveNote: (projectId: string, n: { id?: string; text: string; paperId?: string }) => void;
  removeNote: (projectId: string, id: string) => void;
  projectPapers: (projectId: string) => Paper[];
}

const Ctx = createContext<ResearchContextType | undefined>(undefined);
const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export function ResearchProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<ResearchState>({ papers: {}, saved: [], projects: [] });
  const [loaded, setLoaded] = useState(false);

  // "Delete all my data" empties this store.
  useEffect(() => onReset(() => setS({ papers: {}, saved: [], projects: [] })), []);

  useEffect(() => {
    loadJSON<ResearchState>(KEY).then((v) => {
      if (v) setS(v);
      setLoaded(true);
    });
  }, []);
  useEffect(() => {
    if (loaded) saveJSON(KEY, s);
  }, [s, loaded]);

  const now = () => new Date().toISOString();
  const touch = (projectId: string, f: (p: ResearchProject) => ResearchProject) =>
    setS((x) => ({ ...x, projects: x.projects.map((p) => (p.id === projectId ? { ...f(p), updatedAt: now() } : p)) }));

  const value: ResearchContextType = {
    ...s,
    loaded,
    cachePaper: (p) => setS((x) => ({ ...x, papers: { ...x.papers, [p.id]: p } })),
    isSaved: (id) => s.saved.includes(id),
    toggleSaved: (p) =>
      setS((x) => ({
        ...x,
        papers: { ...x.papers, [p.id]: p },
        saved: x.saved.includes(p.id) ? x.saved.filter((i) => i !== p.id) : [p.id, ...x.saved],
      })),
    createProject: (p) => {
      const id = uid('rp');
      setS((x) => ({
        ...x,
        projects: [
          { ...p, id, sourceIds: [], evidence: [], notes: [], themes: [], citationStyle: 'apa', createdAt: now(), updatedAt: now(), archived: false },
          ...x.projects,
        ],
      }));
      return id;
    },
    updateProject: (id, patch) => touch(id, (p) => ({ ...p, ...patch })),
    deleteProject: (id) => setS((x) => ({ ...x, projects: x.projects.filter((p) => p.id !== id) })),
    addSource: (projectId, paper) =>
      setS((x) => ({
        ...x,
        papers: { ...x.papers, [paper.id]: paper },
        projects: x.projects.map((p) =>
          p.id === projectId && !p.sourceIds.includes(paper.id) ? { ...p, sourceIds: [...p.sourceIds, paper.id], updatedAt: now() } : p
        ),
      })),
    removeSource: (projectId, paperId) =>
      touch(projectId, (p) => ({
        ...p,
        sourceIds: p.sourceIds.filter((i) => i !== paperId),
        evidence: p.evidence.filter((e) => e.paperId !== paperId),
      })),
    addEvidence: (projectId, e) => touch(projectId, (p) => ({ ...p, evidence: [{ ...e, id: uid('ev'), createdAt: now() }, ...p.evidence] })),
    updateEvidence: (projectId, id, patch) => touch(projectId, (p) => ({ ...p, evidence: p.evidence.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
    removeEvidence: (projectId, id) => touch(projectId, (p) => ({ ...p, evidence: p.evidence.filter((e) => e.id !== id) })),
    saveNote: (projectId, n) =>
      touch(projectId, (p) => {
        if (n.id) return { ...p, notes: p.notes.map((x) => (x.id === n.id ? { ...x, text: n.text, paperId: n.paperId, updatedAt: now() } : x)) };
        const note: ResearchNote = { id: uid('rn'), text: n.text, paperId: n.paperId, createdAt: now(), updatedAt: now() };
        return { ...p, notes: [note, ...p.notes] };
      }),
    removeNote: (projectId, id) => touch(projectId, (p) => ({ ...p, notes: p.notes.filter((n) => n.id !== id) })),
    projectPapers: (projectId) => {
      const p = s.projects.find((x) => x.id === projectId);
      return (p?.sourceIds ?? []).map((id) => s.papers[id]).filter(Boolean);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useResearch() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useResearch must be used within a ResearchProvider');
  return c;
}

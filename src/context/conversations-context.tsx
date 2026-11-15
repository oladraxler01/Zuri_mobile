import React, { createContext, useContext, useEffect, useState } from 'react';
import type { SourceHit } from '@/utils/source-search';
import { loadJSON, saveJSON } from '@/utils/storage';

const KEY = 'lexi.conversations.v1';

export interface ChatMessage {
  role: 'user' | 'lexi';
  text: string;
  sources?: SourceHit[];
}

export interface Conversation {
  id: string;
  title: string;
  scope: { courseId?: string; materialId?: string };
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  /** starred / saved by the student */
  saved: boolean;
}

interface ConversationsContextType {
  conversations: Conversation[];
  get: (id: string) => Conversation | undefined;
  /** create a conversation with its first messages; returns its id */
  start: (scope: Conversation['scope'], messages: ChatMessage[]) => string;
  append: (id: string, messages: ChatMessage[]) => void;
  toggleSaved: (id: string) => void;
  rename: (id: string, title: string) => void;
  remove: (id: string) => void;
}

const Ctx = createContext<ConversationsContextType | undefined>(undefined);

export function ConversationsProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<Conversation[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadJSON<Conversation[]>(KEY).then((v) => {
      if (v) setList(v);
      setLoaded(true);
    });
  }, []);
  useEffect(() => {
    if (loaded) saveJSON(KEY, list);
  }, [list, loaded]);

  const now = () => new Date().toISOString();
  const value: ConversationsContextType = {
    conversations: [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    get: (id) => list.find((c) => c.id === id),
    start: (scope, messages) => {
      const id = `cv_${Date.now().toString(36)}`;
      const firstQ = messages.find((m) => m.role === 'user')?.text ?? 'Conversation';
      const title = firstQ.length > 60 ? `${firstQ.slice(0, 57)}…` : firstQ;
      setList((x) => [{ id, title, scope, messages, createdAt: now(), updatedAt: now(), saved: false }, ...x].slice(0, 200));
      return id;
    },
    append: (id, messages) =>
      setList((x) => x.map((c) => (c.id === id ? { ...c, messages: [...c.messages, ...messages], updatedAt: now() } : c))),
    toggleSaved: (id) => setList((x) => x.map((c) => (c.id === id ? { ...c, saved: !c.saved } : c))),
    rename: (id, title) => setList((x) => x.map((c) => (c.id === id ? { ...c, title } : c))),
    remove: (id) => setList((x) => x.filter((c) => c.id !== id)),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConversations() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useConversations must be used within a ConversationsProvider');
  return c;
}

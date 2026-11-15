import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAcademic } from '@/context/academic-context';
import { useLectures } from '@/context/lectures-context';
import { useMaterials } from '@/context/materials-context';
import { usePlanner } from '@/context/planner-context';
import { buildFeed, type FeedItem } from '@/utils/recommendations';
import { loadJSON, saveJSON } from '@/utils/storage';

const KEY = 'lexi.feed.v1';

interface FeedState {
  read: string[];
  /** id → ISO time until which it's hidden (dismissed = far future, snoozed = tomorrow) */
  hidden: Record<string, string>;
}

interface FeedContextType {
  items: FeedItem[];
  unread: number;
  isRead: (id: string) => boolean;
  /** dismissed or snoozed right now (works for ids not in the feed, e.g. 'welcome') */
  isHidden: (id: string) => boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  snooze: (id: string) => void;
  /** most important recommendation for Home, if any */
  top?: FeedItem;
}

const FeedContext = createContext<FeedContextType | undefined>(undefined);

export function FeedProvider({ children }: { children: React.ReactNode }) {
  const { state } = useAcademic();
  const { lectures } = useLectures();
  const { materials } = useMaterials();
  const { assessments } = usePlanner();
  const [s, setS] = useState<FeedState>({ read: [], hidden: {} });
  const [loaded, setLoaded] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    loadJSON<FeedState>(KEY).then((v) => {
      if (v) setS(v);
      setLoaded(true);
    });
    // Rebuild every minute so "starts in 12 min" stays current.
    const t = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (loaded) saveJSON(KEY, s);
  }, [s, loaded]);

  const items = useMemo(() => {
    const now = new Date();
    return buildFeed({
      timetable: state.timetable,
      courses: state.courses,
      lectures,
      materials,
      assessments,
      weeklyStudyHours: state.preferences.weeklyStudyHours,
      now,
    }).filter((i) => !(s.hidden[i.id] && new Date(s.hidden[i.id]) > now));
  }, [state.timetable, state.courses, state.preferences.weeklyStudyHours, lectures, materials, assessments, s.hidden, tick]);

  const readSet = new Set(s.read);
  const value: FeedContextType = {
    items,
    unread: items.filter((i) => !readSet.has(i.id)).length,
    isRead: (id) => readSet.has(id),
    isHidden: (id) => !!s.hidden[id] && new Date(s.hidden[id]) > new Date(),
    markRead: (id) => setS((x) => (x.read.includes(id) ? x : { ...x, read: [...x.read, id].slice(-300) })),
    markAllRead: () => setS((x) => ({ ...x, read: Array.from(new Set([...x.read, ...items.map((i) => i.id)])).slice(-300) })),
    dismiss: (id) => setS((x) => ({ ...x, hidden: { ...x.hidden, [id]: '2999-01-01T00:00:00.000Z' } })),
    snooze: (id) => {
      const t = new Date();
      t.setDate(t.getDate() + 1);
      t.setHours(8, 0, 0, 0);
      setS((x) => ({ ...x, hidden: { ...x.hidden, [id]: t.toISOString() } }));
    },
    top: items.find((i) => i.recommendation),
  };

  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
}

export function useFeed() {
  const ctx = useContext(FeedContext);
  if (!ctx) throw new Error('useFeed must be used within a FeedProvider');
  return ctx;
}

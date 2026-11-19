import { useEffect, useState } from 'react';
import { apiRequest, currentUser, onAuthChange } from '@/services/api-client';

/**
 * Which backend build phases are switched on for this student
 * (GET /academic/feature-flags → { onboarding_v1: true, proactive_worker: false, … }).
 * Flags are off unless an admin turns them on (per student, institution or everyone),
 * so features that depend on them check here first. Refreshed on every sign-in and
 * at most every 5 minutes; anything unknown or failed counts as off.
 */

export type FlagName = 'onboarding_v1' | 'proactive_worker' | 'class_session' | 'recording' | 'debrief' | 'readiness';
export type Flags = Partial<Record<FlagName, boolean>>;

let flags: Flags = {};
let loadedAt = 0;
let inflight: Promise<Flags> | null = null;
const listeners = new Set<(f: Flags) => void>();

/** Fetch the flags (cached for 5 minutes). Never throws. */
export async function loadFlags(force = false): Promise<Flags> {
  if (!currentUser()) {
    flags = {};
    return flags;
  }
  if (!force && Date.now() - loadedAt < 5 * 60_000) return flags;
  if (inflight) return inflight;
  inflight = apiRequest<Record<string, unknown>>('/academic/feature-flags', { timeoutMs: 10_000 })
    .then((res) => {
      flags = Object.fromEntries(Object.entries(res ?? {}).map(([k, v]) => [k, v === true])) as Flags;
      loadedAt = Date.now();
      listeners.forEach((fn) => fn(flags));
      return flags;
    })
    .catch(() => flags)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** The last loaded value of a flag (false until loaded). */
export function isOn(name: FlagName): boolean {
  return flags[name] === true;
}

onAuthChange((user) => {
  flags = {};
  loadedAt = 0;
  listeners.forEach((fn) => fn(flags));
  if (user) loadFlags(true);
});

/** React hook: re-renders when the flags change. */
export function useFlag(name: FlagName): boolean {
  const [on, setOn] = useState(isOn(name));
  useEffect(() => {
    const fn = (f: Flags) => setOn(f[name] === true);
    listeners.add(fn);
    loadFlags().then(fn);
    return () => {
      listeners.delete(fn);
    };
  }, [name]);
  return on;
}

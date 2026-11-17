import { useEffect, useState } from 'react';
import { loadJSON, saveJSON } from '@/utils/storage';

/**
 * The daily AI allowance, read from the gateway's headers on every /ai/* answer:
 *   X-Quota-Limit: 50        X-Quota-Remaining: 37
 * The gateway counts per server day (UTC), so the count resets at midnight UTC
 * (1 am in Nigeria). When it runs out, /ai/* answers 429 "daily AI quota exceeded".
 */

export interface AIQuota {
  limit: number;
  remaining: number;
  /** UTC day the numbers belong to, e.g. "2026-11-17". */
  day: string;
}

const KEY = 'zuri.ai-quota.v1';
const utcDay = () => new Date().toISOString().slice(0, 10);

let quota: AIQuota | null = null;
const listeners = new Set<(q: AIQuota | null) => void>();
const emit = () => listeners.forEach((fn) => fn(current()));

loadJSON<AIQuota>(KEY).then((saved) => {
  if (saved && !quota) {
    quota = saved;
    emit();
  }
});

/** The quota for today, or null if unknown (no AI call yet today). */
export function current(): AIQuota | null {
  if (!quota) return null;
  if (quota.day !== utcDay()) return { limit: quota.limit, remaining: quota.limit, day: utcDay() };
  return quota;
}

/** Called by the API client with every response's headers. */
export function noteQuotaHeaders(headers: Headers) {
  const limit = Number(headers.get('X-Quota-Limit'));
  const remaining = Number(headers.get('X-Quota-Remaining'));
  if (!Number.isFinite(limit) || limit <= 0 || !headers.get('X-Quota-Remaining') || !Number.isFinite(remaining)) return;
  quota = { limit, remaining: Math.max(0, remaining), day: utcDay() };
  saveJSON(KEY, quota);
  emit();
}

/** Called when the gateway says the allowance is used up (429 "daily AI quota exceeded"). */
export function noteQuotaExhausted() {
  quota = { limit: quota?.limit ?? 50, remaining: 0, day: utcDay() };
  saveJSON(KEY, quota);
  emit();
}

/** When the allowance resets, in the phone's local time, e.g. "1:00 AM". */
export function resetTimeLabel(): string {
  const next = new Date();
  next.setUTCHours(24, 0, 0, 0);
  return next.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export const QUOTA_EXHAUSTED_MESSAGE = () =>
  `You’ve used today’s AI requests. They reset at ${resetTimeLabel()}. Your notes, quizzes and flashcards still work.`;

export function useAIQuota(): AIQuota | null {
  const [q, setQ] = useState<AIQuota | null>(current());
  useEffect(() => {
    listeners.add(setQ);
    setQ(current());
    return () => {
      listeners.delete(setQ);
    };
  }, []);
  return q;
}

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '@/services/api-config';
import { onReset } from '@/utils/reset';

/**
 * One place for every call to the Zuri API gateway.
 *
 * - Adds `Authorization: Bearer <access token>` to signed-in requests.
 * - Access tokens live ~15 minutes. Before one expires (or when the server
 *   answers 401) we swap the refresh token for a new pair. The server rotates
 *   refresh tokens, so the new one is always saved.
 * - Tokens are kept in the phone's secure storage (Keychain / Keystore).
 *   The web build has no secure storage and falls back to AsyncStorage.
 */

// ─── Errors ──────────────────────────────────────────────────────

/**
 * Errors the app reacts to differently:
 * - network: no connection → wait and retry when back online
 * - session-expired (401), update-required (426), maintenance (503) → full-screen status
 * - still-processing: uploaded, but the server hasn't finished yet → check again later
 * - server: anything else → show the message / "try again"
 */
export type ApiErrorKind =
  | 'network'
  | 'server'
  | 'session-expired'
  | 'update-required'
  | 'maintenance'
  | 'still-processing';

export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;
  /** Machine-readable code from the server, e.g. EMAIL_NOT_VERIFIED */
  code?: string;
  /** The parsed error body, for callers that need extra fields (e.g. user_id). */
  body?: any;
  constructor(kind: ApiErrorKind, message: string, extra?: { status?: number; code?: string; body?: any }) {
    super(message);
    this.kind = kind;
    this.status = extra?.status;
    this.code = extra?.code;
    this.body = extra?.body;
  }
}

export function errorForStatus(status: number, serverMessage?: string, body?: any): ApiError {
  const code = typeof body?.code === 'string' ? body.code : typeof body?.error?.code === 'string' ? body.error.code : undefined;
  const extra = { status, code, body };
  if (status === 401) return new ApiError('session-expired', 'Your session has expired. Please sign in again.', extra);
  if (status === 426) return new ApiError('update-required', 'A newer version of the app is required.', extra);
  if (status === 503) return new ApiError('maintenance', 'The service is down for maintenance.', extra);
  return new ApiError('server', serverMessage || `The server had a problem (${status}). Please try again.`, extra);
}

// ─── Tokens ──────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  timezone?: string;
  email_verified?: boolean;
  created_at?: string;
}

interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  /** ms since epoch */
  expiresAt: number;
  user: AuthUser;
}

const AUTH_KEY = 'zuri.auth.v1';
const useSecureStore = Platform.OS !== 'web';

let auth: StoredAuth | null = null;
let loadPromise: Promise<StoredAuth | null> | null = null;
const listeners = new Set<(user: AuthUser | null) => void>();

/** Called whenever the signed-in user changes (sign in, sign out, session lost). */
export function onAuthChange(fn: (user: AuthUser | null) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

async function readStored(): Promise<StoredAuth | null> {
  try {
    const raw = useSecureStore ? await SecureStore.getItemAsync(AUTH_KEY) : await AsyncStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

async function writeStored(value: StoredAuth | null): Promise<void> {
  try {
    if (value) {
      const raw = JSON.stringify(value);
      if (useSecureStore) await SecureStore.setItemAsync(AUTH_KEY, raw);
      else await AsyncStorage.setItem(AUTH_KEY, raw);
    } else if (useSecureStore) {
      await SecureStore.deleteItemAsync(AUTH_KEY);
    } else {
      await AsyncStorage.removeItem(AUTH_KEY);
    }
  } catch (e) {
    console.warn('Could not save sign-in', e);
  }
}

/** Read saved tokens once at start-up. */
export function loadAuth(): Promise<StoredAuth | null> {
  if (!loadPromise) {
    loadPromise = readStored().then((saved) => {
      auth = saved;
      return saved;
    });
  }
  return loadPromise;
}

export function currentUser(): AuthUser | null {
  return auth?.user ?? null;
}

export function getRefreshToken(): string | null {
  return auth?.refreshToken ?? null;
}

/** Save the token pair the server returned from login or refresh. */
export async function saveSession(data: any): Promise<AuthUser> {
  const expiresAt = Date.parse(data?.expires_at) || Date.now() + 14 * 60 * 1000;
  auth = {
    accessToken: String(data.access_token),
    refreshToken: String(data.refresh_token),
    expiresAt,
    user: data.user,
  };
  loadPromise = Promise.resolve(auth);
  await writeStored(auth);
  listeners.forEach((fn) => fn(auth!.user));
  return auth.user;
}

export async function clearSession(): Promise<void> {
  auth = null;
  loadPromise = Promise.resolve(null);
  await writeStored(null);
  listeners.forEach((fn) => fn(null));
}

// "Delete all my data" also signs out on this device.
onReset(() => {
  clearSession();
});

let refreshing: Promise<boolean> | null = null;

/** Swap the refresh token for a new pair. Only one refresh runs at a time. */
function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = auth?.refreshToken;
      if (!refreshToken) return false;
      const res = await rawFetch('/auth/refresh', { method: 'POST', body: { refresh_token: refreshToken } });
      if (res.ok && res.json?.data?.access_token) {
        await saveSession(res.json.data);
        return true;
      }
      if (res.status === 401 || res.status === 400) {
        // Refresh token expired or revoked: the user must sign in again.
        await clearSession();
      }
      return false;
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function accessToken(): Promise<string | null> {
  await loadAuth();
  if (!auth) return null;
  // Refresh a minute early so a request never goes out with a dying token.
  if (auth.expiresAt - 60_000 < Date.now()) await refreshSession();
  return auth?.accessToken ?? null;
}

/** For uploads that don't go through apiRequest: a valid token or a session-expired error. */
export async function requireAccessToken(): Promise<string> {
  const token = await accessToken();
  if (!token) throw new ApiError('session-expired', 'Please sign in to upload to Zuri.', { status: 401 });
  return token;
}

// ─── Requests ────────────────────────────────────────────────────

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | undefined>;
  /** Send the access token (default true). */
  auth?: boolean;
  timeoutMs?: number;
}

interface RawResult {
  ok: boolean;
  status: number;
  json: any;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const qs = query
    ? Object.entries(query)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`)
        .join('&')
    : '';
  return `${API_BASE}${path}${qs ? `?${qs}` : ''}`;
}

async function rawFetch(path: string, opts: RequestOptions, token?: string | null): Promise<RawResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20_000);
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Client-Type': 'mobile' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { ok: res.ok, status: res.status, json };
  } catch (e) {
    if (e instanceof ApiError) throw e;
    const aborted = e instanceof Error && e.name === 'AbortError';
    throw new ApiError(
      'network',
      aborted ? 'The server took too long to answer. Please try again.' : 'No connection. Check your internet and try again.'
    );
  } finally {
    clearTimeout(timer);
  }
}

function messageFrom(json: any): string | undefined {
  const m = json?.message ?? json?.error?.message ?? (typeof json?.error === 'string' ? json.error : undefined);
  return typeof m === 'string' ? m : undefined;
}

/**
 * Call the API and return the parsed JSON body.
 * Throws ApiError on failure; on a 401 it refreshes the token and retries once.
 */
export async function apiRequest<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
  const sendAuth = opts.auth !== false;
  let token = sendAuth ? await accessToken() : null;
  if (sendAuth && !token) throw new ApiError('session-expired', 'Please sign in to continue.', { status: 401 });

  let res = await rawFetch(path, opts, token);
  if (res.status === 401 && sendAuth && (await refreshSession())) {
    token = auth?.accessToken ?? null;
    res = await rawFetch(path, opts, token);
  }
  if (!res.ok) {
    // Without a token (login, verify…) a 401 means wrong details, not an expired session.
    if (res.status === 401 && !sendAuth) {
      throw new ApiError('server', messageFrom(res.json) || 'Those details didn’t work. Please try again.', {
        status: 401,
        body: res.json,
      });
    }
    throw errorForStatus(res.status, messageFrom(res.json), res.json);
  }
  return res.json as T;
}

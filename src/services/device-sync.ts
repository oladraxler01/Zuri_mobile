import { AppState, Platform, type AppStateStatus } from 'react-native';
import { API_BASE } from '@/services/api-config';
import { apiRequest, currentUser, requireAccessToken } from '@/services/api-client';
import { loadJSON, saveJSON } from '@/utils/storage';

/**
 * Live sync between the student's devices (sync service).
 *
 *   WebSocket  /api/v1/ws?token=…&device_id=…&device_type=…
 *              ← { type: "event", payload: { event_type, data } }   (pushed to all the user's connections)
 *              → { type: "ping" } every 25 s                         ← { type: "pong" }
 *   POST       /api/v1/events { event_type, event_name, payload }  stored + pushed to the user's devices
 *
 * The backend doesn't publish changes itself yet, so devices tell each other:
 * after a change a phone announces e.g. "materials.changed"; the user's other
 * signed-in devices re-sync that area. Each event carries the sender's
 * device_id, so a phone ignores its own. After (re)connecting, every area
 * re-syncs once in case something was missed while offline.
 */

export type SyncArea = 'materials' | 'courses';

const DEVICE_KEY = 'zuri.device-id.v1';
let deviceId = '';
const ready = loadJSON<string>(DEVICE_KEY).then((saved) => {
  deviceId = saved || `dev_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  if (!saved) saveJSON(DEVICE_KEY, deviceId);
  return deviceId;
});

const handlers = new Map<SyncArea, Set<() => void>>();

/** Run `fn` when another device changes this area (and after reconnecting). Returns an unsubscribe. */
export function onRemoteChange(area: SyncArea, fn: () => void): () => void {
  if (!handlers.has(area)) handlers.set(area, new Set());
  handlers.get(area)!.add(fn);
  return () => {
    handlers.get(area)?.delete(fn);
  };
}

const run = (area: SyncArea) => handlers.get(area)?.forEach((fn) => {
  try {
    fn();
  } catch (e) {
    console.warn('[sync] handler failed', e);
  }
});

// ─── Announcing changes ──────────────────────────────────────────

const pending = new Map<SyncArea, ReturnType<typeof setTimeout>>();

/** Tell the user's other devices that this area changed (debounced 2 s; never throws). */
export function announceChange(area: SyncArea) {
  if (!currentUser()) return;
  const t = pending.get(area);
  if (t) clearTimeout(t);
  pending.set(
    area,
    setTimeout(async () => {
      pending.delete(area);
      try {
        await ready;
        await apiRequest('/events', {
          method: 'POST',
          timeoutMs: 10_000,
          body: { event_type: `${area}.changed`, event_name: `${area}.changed`, payload: { device_id: deviceId, at: new Date().toISOString() } },
        });
      } catch (e) {
        console.warn('[sync] could not announce change', e);
      }
    }, 2000)
  );
}

// ─── The live connection ─────────────────────────────────────────

let socket: WebSocket | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retries = 0;
let wanted = false;
// currentState can be null before the app has reported one; treat that as active.
let appState: AppStateStatus = (AppState.currentState as AppStateStatus | null) ?? 'active';

function cleanup() {
  if (pingTimer) clearInterval(pingTimer);
  pingTimer = null;
  if (socket) {
    socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
    try {
      socket.close();
    } catch {
      // already closed
    }
  }
  socket = null;
}

async function connect() {
  if (!wanted || socket || appState !== 'active' || !currentUser()) return;
  try {
    await ready;
    const token = await requireAccessToken();
    const url =
      `${API_BASE.replace(/^http/, 'ws')}/ws?` +
      `token=${encodeURIComponent(token)}&device_id=${encodeURIComponent(deviceId)}&device_type=${Platform.OS}`;
    const ws = new WebSocket(url);
    socket = ws;
    ws.onopen = () => {
      retries = 0;
      pingTimer = setInterval(() => {
        try {
          ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString(), payload: {} }));
        } catch {
          // reconnect via onclose
        }
      }, 25_000);
      // Catch up on anything missed while disconnected.
      run('materials');
      run('courses');
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(String(e.data));
        if (msg?.type !== 'event') return;
        const type: string = msg.payload?.event_type ?? '';
        const from: string | undefined = msg.payload?.data?.device_id;
        if (from && from === deviceId) return; // our own announcement
        if (type === 'materials.changed') run('materials');
        if (type === 'courses.changed') run('courses');
      } catch {
        // not JSON: ignore
      }
    };
    ws.onclose = () => {
      cleanup();
      scheduleReconnect();
    };
    ws.onerror = () => {
      // onclose follows
    };
  } catch {
    cleanup();
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (!wanted || retryTimer) return;
  const delay = Math.min(60_000, 2000 * 2 ** Math.min(retries, 5));
  retries += 1;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    connect();
  }, delay);
}

AppState.addEventListener('change', (next) => {
  appState = next;
  if (next === 'active') connect();
  else cleanup(); // the OS would drop it in the background anyway
});

/** Keep a live connection while signed in and the app is open. */
export function startDeviceSync() {
  wanted = true;
  connect();
}

/** Close the connection (sign-out). */
export function stopDeviceSync() {
  wanted = false;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  cleanup();
}

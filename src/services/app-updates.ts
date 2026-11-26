import { AppState, type AppStateStatus } from 'react-native';
import * as Updates from 'expo-updates';
import { isRecordingBusy } from '@/services/recording/busy';

/**
 * Keeps installed test APKs on the newest code (over-the-air updates from `npm run update:preview`).
 *
 * expo-updates on its own downloads an update at launch but only runs it after the
 * app is fully closed and reopened, which testers rarely do. So here:
 *  - check when the app opens and every time it comes back to the front (at most every 5 min);
 *  - once an update is downloaded, say so (UpdateBanner, with "Restart now"), and
 *  - switch to it by itself the next time the app comes back from the background,
 *    never while a lecture is being recorded or waiting to be saved.
 *
 * An update only reaches builds with the same runtime version (app.json "version",
 * see docs/BUILDS.md). Does nothing in development, on web or in Expo Go.
 */

export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'up-to-date' | 'error';

const CHECK_EVERY_MS = 5 * 60 * 1000;

let status: UpdateStatus = 'idle';
let lastCheck = 0;
let running: Promise<UpdateStatus> | null = null;
let started = false;
const listeners = new Set<(s: UpdateStatus) => void>();

const enabled = () => {
  try {
    return !__DEV__ && Updates.isEnabled;
  } catch {
    return false;
  }
};

function setStatus(next: UpdateStatus) {
  status = next;
  listeners.forEach((fn) => fn(next));
}

export function updateStatus(): UpdateStatus {
  return status;
}

export function onUpdateStatus(fn: (s: UpdateStatus) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Look for a newer update and download it. Safe to call often; one check runs at a time. */
export function checkForAppUpdate(force = false): Promise<UpdateStatus> {
  if (!enabled()) return Promise.resolve(status);
  if (status === 'ready') return Promise.resolve(status);
  if (running) return running;
  if (!force && Date.now() - lastCheck < CHECK_EVERY_MS) return Promise.resolve(status);
  lastCheck = Date.now();
  running = (async () => {
    try {
      setStatus('checking');
      const check = await Updates.checkForUpdateAsync();
      if (!check.isAvailable) {
        setStatus('up-to-date');
        return status;
      }
      setStatus('downloading');
      const fetched = await Updates.fetchUpdateAsync();
      setStatus(fetched.isNew ? 'ready' : 'up-to-date');
    } catch (e) {
      // Offline or the update server is unreachable: try again on the next resume.
      console.warn('[updates] check failed', e);
      setStatus('error');
    }
    return status;
  })().finally(() => {
    running = null;
  });
  return running;
}

/** Switch to the downloaded update now, unless a recording is in progress. Returns false if it can't. */
export async function restartIntoUpdate(): Promise<boolean> {
  if (status !== 'ready' || isRecordingBusy()) return false;
  try {
    await Updates.reloadAsync();
    return true;
  } catch (e) {
    console.warn('[updates] reload failed', e);
    return false;
  }
}

/** Start watching (once, from the root layout). */
export function startUpdateWatcher(): void {
  if (started || !enabled()) return;
  started = true;

  checkForAppUpdate(true);

  let previous: AppStateStatus | string | null | undefined = AppState.currentState;
  AppState.addEventListener('change', (next) => {
    const cameBack = next === 'active' && previous !== 'active';
    const wasAway = previous === 'background';
    previous = next;
    if (!cameBack) return;
    if (status === 'ready' && wasAway) {
      // The student was away: open the new version now rather than mid-task later.
      restartIntoUpdate();
      return;
    }
    checkForAppUpdate();
  });
}

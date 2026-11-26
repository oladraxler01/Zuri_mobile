/**
 * Whether a lecture is being recorded (or recorded and not saved yet) anywhere in the app.
 * Things that would throw that away, like restarting into an app update, check this first.
 */

let busy = false;
const listeners = new Set<(busy: boolean) => void>();

export function setRecordingBusy(next: boolean): void {
  if (busy === next) return;
  busy = next;
  listeners.forEach((fn) => fn(next));
}

export function isRecordingBusy(): boolean {
  return busy;
}

export function onRecordingBusyChange(fn: (busy: boolean) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

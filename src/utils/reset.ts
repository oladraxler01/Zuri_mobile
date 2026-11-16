import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, Paths } from 'expo-file-system';

/**
 * "Delete all my data": every store subscribes with onReset() and puts its
 * in-memory state back to empty, then saved data and files are removed.
 * Resetting memory first matters: otherwise a store would save its old
 * state straight back after the storage was cleared.
 */

type Listener = () => void;
const listeners = new Set<Listener>();

export function onReset(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export async function resetAllData(): Promise<void> {
  listeners.forEach((fn) => fn());
  // Let stores re-render with empty state before wiping storage.
  await new Promise((r) => setTimeout(r, 50));
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('lexi.'));
  await AsyncStorage.multiRemove(keys);
  if (Platform.OS !== 'web') {
    for (const name of ['lectures', 'materials']) {
      try {
        const dir = new Directory(Paths.document, name);
        if (dir.exists) dir.delete();
      } catch {
        // already gone
      }
    }
  }
}

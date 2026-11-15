import AsyncStorage from '@react-native-async-storage/async-storage';

/** Read a JSON value saved on the device; returns undefined if missing or unreadable. */
export async function loadJSON<T>(key: string): Promise<T | undefined> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch (e) {
    console.warn(`Could not read ${key}`, e);
    return undefined;
  }
}

/** Save a JSON value on the device (fire and forget). */
export function saveJSON(key: string, value: unknown): void {
  AsyncStorage.setItem(key, JSON.stringify(value)).catch((e) => console.warn(`Could not save ${key}`, e));
}

export function removeKey(key: string): void {
  AsyncStorage.removeItem(key).catch(() => {});
}

export const STORAGE_KEYS = {
  session: 'lexi.session.v1',
  academic: 'lexi.academic.v1',
  lectures: 'lexi.lectures.v1',
  materials: 'lexi.materials.v1',
  planner: 'lexi.planner.v1',
  lecturer: 'lexi.lecturer.v1',
  institution: 'lexi.institution.v1',
} as const;

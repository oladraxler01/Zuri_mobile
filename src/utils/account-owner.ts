import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetAllData } from '@/utils/reset';

/**
 * Which account the data saved on this phone belongs to. Without this, a
 * second account on the same phone (or a brand-new sign-up) would inherit the
 * previous account's courses, lectures, materials and planner.
 */
const OWNER_KEY = 'lexi.owner.v1';
const IGNORED = new Set([OWNER_KEY, 'lexi.session.v1']);

async function hasLocalData(): Promise<boolean> {
  const keys = await AsyncStorage.getAllKeys();
  return keys.some((k) => k.startsWith('lexi.') && !IGNORED.has(k));
}

/**
 * Call when an account signs in. If the phone's data belongs to a different
 * account, it is cleared first (the server copy is untouched and syncs back
 * for that account). Returns true when it cleared data.
 * Data with no recorded owner (installs from before this check) is kept.
 */
export async function claimLocalData(userId: string): Promise<boolean> {
  const owner = await AsyncStorage.getItem(OWNER_KEY);
  if (owner === userId) return false;
  let cleared = false;
  if (owner && (await hasLocalData())) {
    await resetAllData({ keepSignIn: true });
    cleared = true;
  }
  await AsyncStorage.setItem(OWNER_KEY, userId);
  return cleared;
}

/** A brand-new account was just created: nothing on this phone can be its data. */
export async function startFreshForNewAccount(): Promise<void> {
  if (await hasLocalData()) await resetAllData({ keepSignIn: true });
  await AsyncStorage.removeItem(OWNER_KEY);
}

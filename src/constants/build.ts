import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

/** Changed with each test build, so testers can see which code they're running. */
export const BUILD_LABEL = '26 Nov 2026 · assistant + live transcript';

/** "Zuri 1.1.0 · 26 Nov 2026 · … · built-in" (or "· update ab12cd34" when an over-the-air update is running). */
export function buildDescription(): string {
  const version = Constants.expoConfig?.version ?? '?';
  let source = 'built-in';
  try {
    if (!Updates.isEmbeddedLaunch && Updates.updateId) source = `update ${Updates.updateId.slice(0, 8)}`;
  } catch {
    // expo-updates isn't available (web, Expo Go)
  }
  return `Zuri ${version} · ${BUILD_LABEL} · ${source}`;
}

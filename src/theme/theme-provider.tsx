import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  darkColors,
  darkShadows,
  lightColors,
  lightShadows,
  radius,
  size,
  space,
  type,
  type ShadowToken,
  type ThemeColors,
} from './tokens';

/**
 * Dark mode stays off until every student-loop screen is on tokens
 * (roadmap Phase 0, design system §8 step 4). Flip this to true then.
 * While it's false the app always renders light, whatever the system or
 * the saved preference says, so nothing changes visually yet.
 */
export const DARK_MODE_ENABLED = false;

export type AppearancePreference = 'system' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';

const STORAGE_KEY = 'zuri.appearance';

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
  shadows: { readonly [K in ShadowToken]: string | undefined };
  space: typeof space;
  radius: typeof radius;
  size: typeof size;
  type: typeof type;
}

export function buildTheme(scheme: ColorScheme): Theme {
  return {
    scheme,
    colors: scheme === 'dark' ? darkColors : lightColors,
    shadows: scheme === 'dark' ? darkShadows : lightShadows,
    space,
    radius,
    size,
    type,
  };
}

const LIGHT = buildTheme('light');
const DARK = buildTheme('dark');

interface ThemeContextValue {
  theme: Theme;
  /** What the student chose in Settings → Appearance. */
  preference: AppearancePreference;
  setPreference: (p: AppearancePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<AppearancePreference>('system');

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (!cancelled && (v === 'system' || v === 'light' || v === 'dark')) setPreferenceState(v);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((p: AppearancePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  const scheme: ColorScheme = !DARK_MODE_ENABLED
    ? 'light'
    : preference === 'system'
      ? system === 'dark'
        ? 'dark'
        : 'light'
      : preference;

  const value = useMemo(
    () => ({ theme: scheme === 'dark' ? DARK : LIGHT, preference, setPreference }),
    [scheme, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * The current theme: `{ colors, shadows, space, radius, size, type, scheme }`.
 * Outside a ThemeProvider (tests, isolated previews) it returns the light theme.
 */
export function useTheme(): Theme {
  return useContext(ThemeContext)?.theme ?? LIGHT;
}

/** The Settings → Appearance preference and its setter. */
export function useAppearance() {
  const ctx = useContext(ThemeContext);
  return {
    preference: ctx?.preference ?? 'system',
    setPreference: ctx?.setPreference ?? (() => {}),
    darkModeAvailable: DARK_MODE_ENABLED,
  };
}

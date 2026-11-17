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
  type ColorName,
  type ShadowName,
} from './tokens';

/**
 * Dark mode stays off until every screen in the student loop is on tokens
 * (docs/MOBILE_ROADMAP.md Phase 0; design system migration step 4). Until
 * then useTheme() always returns the light theme, whatever the system or the
 * saved preference says, so migrated and unmigrated screens look the same.
 */
export const DARK_MODE_ENABLED = false;

export type AppearancePreference = 'system' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';
export type ThemeColors = Record<ColorName, string>;

const STORAGE_KEY = 'zuri.appearance';

export interface Theme {
  scheme: ColorScheme;
  /** Same as scheme === 'dark'. */
  dark: boolean;
  colors: ThemeColors;
  shadows: Record<ShadowName, string | undefined>;
  space: typeof space;
  radius: typeof radius;
  size: typeof size;
  type: typeof type;
}

export function buildTheme(scheme: ColorScheme): Theme {
  const dark = scheme === 'dark';
  return {
    scheme,
    dark,
    colors: dark ? darkColors : lightColors,
    shadows: dark ? darkShadows : lightShadows,
    space,
    radius,
    size,
    type,
  };
}

const LIGHT = buildTheme('light');
const DARK = buildTheme('dark');

function resolveScheme(preference: AppearancePreference, system: string | null | undefined): ColorScheme {
  if (!DARK_MODE_ENABLED) return 'light';
  if (preference === 'system') return system === 'dark' ? 'dark' : 'light';
  return preference;
}

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

  const scheme = resolveScheme(preference, system);
  const value = useMemo(
    () => ({ theme: scheme === 'dark' ? DARK : LIGHT, preference, setPreference }),
    [scheme, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * The design system's tokens for the current theme:
 * `{ colors, shadows, space, radius, size, type, scheme, dark }`.
 * Outside a ThemeProvider (tests, isolated previews) it follows the system
 * setting, which is light while DARK_MODE_ENABLED is false.
 */
export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  const system = useColorScheme();
  if (ctx) return ctx.theme;
  return resolveScheme('system', system) === 'dark' ? DARK : LIGHT;
}

/** The Settings → Appearance preference and its setter. */
export function useAppearance() {
  const ctx = useContext(ThemeContext);
  return {
    preference: ctx?.preference ?? ('system' as AppearancePreference),
    setPreference: ctx?.setPreference ?? (() => {}),
    darkModeAvailable: DARK_MODE_ENABLED,
  };
}

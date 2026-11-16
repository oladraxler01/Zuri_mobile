import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Href } from 'expo-router';
import { loadJSON, saveJSON, removeKey, STORAGE_KEYS } from '@/utils/storage';
import { onReset } from '@/utils/reset';
import { loadAuth, onAuthChange, currentUser, type AuthUser } from '@/services/api-client';
import { logout } from '@/services/auth-api';

/**
 * The three products. Each role gets its own navigation tree:
 *  - student     → /(tabs)
 *  - lecturer    → /lecturer
 *  - institution → /institution  (the "School Board" option in onboarding)
 */
export type UserRole = 'student' | 'lecturer' | 'institution';

export const ROLE_HOME: Record<UserRole, Href> = {
  student: '/(tabs)' as Href,
  lecturer: '/lecturer' as Href,
  institution: '/institution' as Href,
};

interface SessionContextType {
  role: UserRole | null;
  /** true once the saved session has been read from the device */
  hydrated: boolean;
  setRole: (role: UserRole) => void;
  /** The account signed in to the Zuri server, or null. */
  user: AuthUser | null;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// The role is saved on the device so the app reopens in the right place.
// Server sign-in (tokens) lives in services/api-client and is mirrored here as `user`.
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [user, setUser] = useState<AuthUser | null>(currentUser());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => onAuthChange(setUser), []);

  // "Delete all my data" empties this store.
  useEffect(() => onReset(() => setRoleState(null)), []);

  useEffect(() => {
    Promise.all([loadJSON<{ role: UserRole | null }>(STORAGE_KEYS.session), loadAuth()]).then(([saved, auth]) => {
      if (saved?.role) setRoleState(saved.role);
      setUser(auth?.user ?? null);
      setHydrated(true);
    });
  }, []);

  const setRole = (next: UserRole) => {
    setRoleState(next);
    saveJSON(STORAGE_KEYS.session, { role: next });
  };

  const signOut = () => {
    setRoleState(null);
    removeKey(STORAGE_KEYS.session);
    logout();
  };

  return (
    <SessionContext.Provider value={{ role, hydrated, setRole, user, signOut }}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

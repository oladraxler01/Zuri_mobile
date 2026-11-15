import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Href } from 'expo-router';
import { loadJSON, saveJSON, removeKey, STORAGE_KEYS } from '@/utils/storage';

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
  signOut: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Saved on the device so the app reopens in the right place.
// Real sign-in (tokens, expiry) replaces this when the backend lands.
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    loadJSON<{ role: UserRole | null }>(STORAGE_KEYS.session).then((saved) => {
      if (saved?.role) setRoleState(saved.role);
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
  };

  return (
    <SessionContext.Provider value={{ role, hydrated, setRole, signOut }}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

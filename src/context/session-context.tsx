import React, { createContext, useContext, useState } from 'react';
import type { Href } from 'expo-router';

/**
 * The three Lexi products. Each role gets its own navigation tree:
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
  setRole: (role: UserRole) => void;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// NOTE: in-memory for now. Persisting the session across restarts arrives
// with real authentication (see "Engineering foundations" in the checklist).
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole | null>(null);

  return (
    <SessionContext.Provider
      value={{
        role,
        setRole: setRoleState,
        signOut: () => setRoleState(null),
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

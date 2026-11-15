import React from 'react';
import { Redirect } from 'expo-router';
import type { Href } from 'expo-router';
import { useSession, type UserRole } from '@/context/session-context';

/**
 * Keeps each role inside its own app. If the signed-in role doesn't match,
 * send the user back to the root, which routes them to the right place.
 */
export function RoleGate({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const session = useSession();
  if (session.role !== role) {
    return <Redirect href={'/' as Href} />;
  }
  return <>{children}</>;
}

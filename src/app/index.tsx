import { Redirect } from 'expo-router';
import type { Href } from 'expo-router';
import { useSession, ROLE_HOME } from '@/context/session-context';

/**
 * Root entry: signed-out users go to onboarding, signed-in users go to
 * the app for their role (student, lecturer or institution).
 */
export default function RootIndex() {
  const { role } = useSession();

  if (!role) {
    return <Redirect href={'/onboarding' as Href} />;
  }

  return <Redirect href={ROLE_HOME[role]} />;
}

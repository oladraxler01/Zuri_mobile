import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { useSession, ROLE_HOME } from '@/context/session-context';
import {
  isAppleSignInAvailable,
  isGoogleSignInAvailable,
  socialSignIn,
  type SocialProvider,
} from '@/services/social-auth';

/**
 * Continue with Google / Apple on the sign-in and sign-up screens.
 * New accounts (and phones that held someone else's data) go through setup;
 * returning students go straight home, like an email sign-in.
 */
export function useSocialSignIn(onError: (message: string) => void) {
  const { role } = useSession();
  const [google] = useState(isGoogleSignInAvailable);
  const [apple, setApple] = useState(false);
  const [busy, setBusy] = useState<SocialProvider | null>(null);

  useEffect(() => {
    let alive = true;
    isAppleSignInAvailable().then((ok) => alive && setApple(ok));
    return () => {
      alive = false;
    };
  }, []);

  const signIn = async (provider: SocialProvider) => {
    if (busy) return;
    onError('');
    setBusy(provider);
    try {
      const result = await socialSignIn(provider);
      if (result.status === 'cancelled') return;
      const goHome = !result.isNewUser && !result.freshStart && role;
      router.replace((goHome ? ROLE_HOME[role] : '/onboarding/institution') as Href);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'That sign-in didn’t work. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return { google, apple, any: google || apple, busy, signIn };
}

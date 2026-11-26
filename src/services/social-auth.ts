import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import { ApiError, apiRequest, saveSession, type AuthUser } from '@/services/api-client';
import { claimLocalData } from '@/utils/account-owner';

/**
 * Continue with Google / Apple, without any third-party auth service.
 *
 * Google's or Apple's own sheet gives us an ID token; the Zuri API checks it
 * against their public keys and signs the student in (docs/api/SOCIAL_SIGN_IN.md
 * in the backend repo):
 *
 *   POST /auth/social { provider, id_token, nonce?, authorization_code?, first_name?, last_name? }
 *     → the same tokens as /auth/login, plus is_new_user
 *
 * Google client IDs come from EAS environment variables:
 *   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID   (the token's audience, required)
 *   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID   (iOS)
 */
export type SocialProvider = 'google' | 'apple';

export type SocialSignInResult =
  | { status: 'signed-in'; user: AuthUser; isNewUser: boolean; freshStart: boolean }
  | { status: 'cancelled' };

/** What DELETE /users/me needs from a fresh Google / Apple sign-in. */
export interface SocialProof {
  provider: SocialProvider;
  id_token: string;
  nonce?: string;
}

interface ProviderCredential extends SocialProof {
  authorization_code?: string;
  first_name?: string;
  last_name?: string;
}

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

/** Google needs its client IDs in the build; without them the button is hidden. */
export function isGoogleSignInAvailable(): boolean {
  if (Platform.OS === 'web' || !GOOGLE_WEB_CLIENT_ID) return false;
  return Platform.OS !== 'ios' || !!GOOGLE_IOS_CLIENT_ID;
}

/** Sign in with Apple exists on iPhone and iPad only. */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync().catch(() => false);
}

let googleConfigured = false;
function configureGoogle() {
  if (googleConfigured) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    scopes: ['email', 'profile'],
  });
  googleConfigured = true;
}

/** null = the student closed the sheet. */
async function googleCredential(): Promise<ProviderCredential | null> {
  if (!isGoogleSignInAvailable()) {
    throw new ApiError('server', 'Google sign-in isn’t set up in this version of the app.');
  }
  configureGoogle();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Always show the account picker, so a shared phone can choose another account.
    await GoogleSignin.signOut().catch(() => {});
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) return null;
    const idToken = res.data.idToken;
    if (!idToken) throw new ApiError('server', 'Google didn’t confirm your account. Please try again.');
    return { provider: 'google', id_token: idToken };
  } catch (e) {
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS) return null;
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new ApiError('server', 'Google sign-in needs Google Play services on this phone.');
      }
    }
    if (e instanceof ApiError) throw e;
    throw new ApiError('server', 'Google sign-in didn’t work. Please try again.');
  }
}

/** null = the student closed the sheet. */
async function appleCredential(): Promise<ProviderCredential | null> {
  // Apple is given the SHA-256 of the nonce; the server checks the raw one.
  const nonce = Crypto.randomUUID();
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
  try {
    const cred = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashed,
    });
    if (!cred.identityToken) throw new ApiError('server', 'Apple didn’t confirm your account. Please try again.');
    return {
      provider: 'apple',
      id_token: cred.identityToken,
      nonce,
      authorization_code: cred.authorizationCode ?? undefined,
      // Apple shares the name the first time only, and only with the app.
      first_name: cred.fullName?.givenName ?? undefined,
      last_name: cred.fullName?.familyName ?? undefined,
    };
  } catch (e: any) {
    if (e?.code === 'ERR_REQUEST_CANCELED') return null;
    if (e instanceof ApiError) throw e;
    throw new ApiError('server', 'Apple sign-in didn’t work. Please try again.');
  }
}

function credentialFor(provider: SocialProvider) {
  return provider === 'google' ? googleCredential() : appleCredential();
}

/** Continue with Google / Apple: signs in, creating the account the first time. */
export async function socialSignIn(provider: SocialProvider): Promise<SocialSignInResult> {
  const cred = await credentialFor(provider);
  if (!cred) return { status: 'cancelled' };
  try {
    const json = await apiRequest<{ data: any }>('/auth/social', { method: 'POST', auth: false, body: cred, timeoutMs: 20000 });
    const user = await saveSession(json.data);
    const freshStart = await claimLocalData(user.id).catch(() => false);
    return { status: 'signed-in', user, isNewUser: !!json.data?.is_new_user, freshStart };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      throw new ApiError('server', 'That sign-in didn’t work. If you deleted your account, it can’t be used again.', { status: 401 });
    }
    if (e instanceof ApiError && e.status === 503) {
      throw new ApiError('server', 'This sign-in option isn’t available yet. Use your email and password for now.', { status: 503 });
    }
    if (e instanceof ApiError && e.kind === 'server' && e.status === 400) {
      throw new ApiError('server', String(e.body?.message ?? e.message), { status: 400 });
    }
    throw e;
  }
}

/** A fresh Google / Apple sign-in, to confirm deleting an account that has no password. */
export async function socialProof(provider: SocialProvider): Promise<SocialProof | null> {
  const cred = await credentialFor(provider);
  if (!cred) return null;
  return { provider: cred.provider, id_token: cred.id_token, nonce: cred.nonce };
}

import {
  ApiError,
  apiRequest,
  clearSession,
  getRefreshToken,
  saveSession,
  type AuthUser,
} from '@/services/api-client';

/**
 * Sign-up, email verification and sign-in against the Zuri gateway.
 *
 *   POST /auth/register              { email, password }  → 201, emails a 6-digit code
 *   POST /auth/verify-email?user_id= { code }             → 200
 *   POST /auth/resend-verification   { email }
 *   POST /auth/login                 { email, password }  → tokens + user
 *                                     403 EMAIL_NOT_VERIFIED until verified
 *   POST /auth/refresh               { refresh_token }    (handled in api-client)
 *   GET  /users/me
 */

export const MIN_PASSWORD_LENGTH = 8;

/** Turn the server's validation text into something a student can act on. */
function friendly(e: unknown, fallback: string): ApiError {
  if (!(e instanceof ApiError)) return new ApiError('server', fallback);
  if (e.kind !== 'server') return e;
  const msg = e.message;
  const fix = (text: string) => new ApiError('server', text, { status: e.status, code: e.code, body: e.body });
  if (/'Email' failed on the 'email'/.test(msg)) return fix('Enter a valid email address.');
  if (/'Email' failed on the 'required'/.test(msg)) return fix('Enter your email address.');
  if (/'Password' failed on the 'min'/.test(msg)) return fix(`Your password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
  if (/'Password' failed on the 'required'/.test(msg)) return fix('Enter your password.');
  if (/already verified/i.test(msg)) return fix('Your email is already verified. Sign in to continue.');
  if (/already (exists|registered|in use)|duplicate/i.test(msg) || (e.status === 409 && /email|user|account/i.test(msg)))
    return fix('An account with this email already exists. Sign in instead.');
  if (/invalid credentials/i.test(msg)) return fix('That email and password don’t match. Please try again.');
  if (/invalid|expired/i.test(msg) && /code|otp|verification/i.test(msg))
    return fix('That code is wrong or has expired. Check the email or ask for a new code.');
  return e;
}

// ─── Pending sign-in (memory only) ───────────────────────────────
// Between sign-up and entering the emailed code we need the password once
// more to sign in. It is kept in memory only, never saved to the device.

interface PendingSignIn {
  email: string;
  password: string;
  userId: string;
}
let pending: PendingSignIn | null = null;

export function setPendingSignIn(value: PendingSignIn | null) {
  pending = value;
}
export function getPendingSignIn(): PendingSignIn | null {
  return pending;
}

// ─── Calls ───────────────────────────────────────────────────────

export async function register(email: string, password: string): Promise<AuthUser> {
  try {
    const json = await apiRequest<{ data: AuthUser }>('/auth/register', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });
    return json.data;
  } catch (e) {
    throw friendly(e, 'We couldn’t create your account. Please try again.');
  }
}

/** Resolves when the email is verified (including when it already was). */
export async function verifyEmail(userId: string, code: string): Promise<void> {
  try {
    await apiRequest('/auth/verify-email', {
      method: 'POST',
      auth: false,
      query: { user_id: userId },
      body: { code },
    });
  } catch (e) {
    if (e instanceof ApiError && /already verified/i.test(e.message)) return;
    if (e instanceof ApiError && e.kind === 'server' && (e.status === 400 || e.status === 401 || e.status === 422)) {
      throw new ApiError('server', 'That code is wrong or has expired. Check the email or ask for a new code.', {
        status: e.status,
      });
    }
    throw friendly(e, 'We couldn’t verify that code. Please try again.');
  }
}

export async function resendVerification(email: string): Promise<void> {
  try {
    await apiRequest('/auth/resend-verification', { method: 'POST', auth: false, body: { email } });
  } catch (e) {
    throw friendly(e, 'We couldn’t send a new code. Please try again.');
  }
}

export type LoginResult = { status: 'signed-in'; user: AuthUser } | { status: 'needs-verification'; userId: string };

export async function login(email: string, password: string): Promise<LoginResult> {
  try {
    const json = await apiRequest<{ data: any }>('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });
    const user = await saveSession(json.data);
    return { status: 'signed-in', user };
  } catch (e) {
    if (e instanceof ApiError && e.code === 'EMAIL_NOT_VERIFIED') {
      return { status: 'needs-verification', userId: String(e.body?.user_id ?? '') };
    }
    // Login answers 401 for a wrong password; that's not an expired session.
    if (e instanceof ApiError && e.status === 401) {
      throw new ApiError('server', 'That email and password don’t match. Please try again.', { status: 401 });
    }
    throw friendly(e, 'We couldn’t sign you in. Please try again.');
  }
}

export async function fetchMe(): Promise<AuthUser> {
  const json = await apiRequest<{ data: AuthUser }>('/users/me');
  return json.data;
}

/** Sign out on this device. Tells the server too when it can, but never blocks on it. */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    await apiRequest('/auth/logout', { method: 'POST', body: { refresh_token: refreshToken }, timeoutMs: 5000 }).catch(
      () => {}
    );
  }
  pending = null;
  await clearSession();
}

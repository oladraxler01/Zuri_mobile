import { claimLocalData } from '@/utils/account-owner';
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
  if (/deactivated/i.test(msg)) return fix('This account has been deactivated. Contact support@zurilearn.com.');
  if (e.status === 429 || /please wait before requesting/i.test(msg))
    return fix('Too many tries. Please wait a few minutes and try again.');
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

export type LoginResult = { status: 'signed-in'; user: AuthUser; /** this phone held another account's data, now cleared */ freshStart: boolean } | { status: 'needs-verification'; userId: string };

export async function login(email: string, password: string): Promise<LoginResult> {
  try {
    const json = await apiRequest<{ data: any }>('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });
    const user = await saveSession(json.data);
    const freshStart = await claimLocalData(user.id).catch(() => false);
    return { status: 'signed-in', user, freshStart };
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

/**
 * Sign out on this device. POST /auth/logout (no body: the server revokes the
 * access token it was called with). Never blocks on the server: local tokens
 * are cleared whatever happens, so a bad connection can't leave you signed in.
 */
export async function logout(): Promise<void> {
  if (getRefreshToken()) {
    await apiRequest('/auth/logout', { method: 'POST', timeoutMs: 5000 }).catch(() => {});
  }
  pending = null;
  await clearSession();
}

/** Sign out on every device (POST /auth/logout-all), then here. */
export async function logoutEverywhere(): Promise<void> {
  try {
    await apiRequest('/auth/logout-all', { method: 'POST', timeoutMs: 10000 });
  } catch (e) {
    throw friendly(e, 'We couldn’t sign out your other devices. Check your connection and try again.');
  }
  pending = null;
  await clearSession();
}

// ─── Passwords ───────────────────────────────────────────────────

/**
 * POST /auth/forgot-password { email } → always 200 (the server never says whether
 * the email has an account). Emails a reset code; 429 if asked again too soon.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await apiRequest('/auth/forgot-password', { method: 'POST', auth: false, body: { email: email.trim().toLowerCase() } });
  } catch (e) {
    if (e instanceof ApiError && e.status === 429) {
      throw new ApiError('server', 'We just sent you a code. Please wait a few minutes before asking for another.', { status: 429 });
    }
    throw friendly(e, 'We couldn’t send the reset email. Please try again.');
  }
}

/**
 * POST /auth/reset-password { token, new_password }. The token is the code from
 * the reset email (currently a long code; a 6-digit one is requested from the backend).
 */
export async function resetPassword(code: string, newPassword: string): Promise<void> {
  try {
    await apiRequest('/auth/reset-password', {
      method: 'POST',
      auth: false,
      body: { token: code.replace(/\s+/g, ''), new_password: newPassword },
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 400 && /token|reset/i.test(e.message)) {
      throw new ApiError('server', 'That reset code is wrong or has expired. Ask for a new one.', { status: 400 });
    }
    if (e instanceof ApiError && /'NewPassword' failed on the 'min'/.test(e.message)) {
      throw new ApiError('server', `Your new password needs at least ${MIN_PASSWORD_LENGTH} characters.`, { status: 400 });
    }
    throw friendly(e, 'We couldn’t reset your password. Please try again.');
  }
}

/** POST /users/me/change-password { current_password, new_password } (signed in). */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  try {
    await apiRequest('/users/me/change-password', {
      method: 'POST',
      body: { current_password: currentPassword, new_password: newPassword },
    });
  } catch (e) {
    if (e instanceof ApiError && /current password is incorrect/i.test(e.message)) {
      throw new ApiError('server', 'Your current password is wrong.', { status: e.status });
    }
    if (e instanceof ApiError && /'NewPassword' failed on the 'min'/.test(e.message)) {
      throw new ApiError('server', `Your new password needs at least ${MIN_PASSWORD_LENGTH} characters.`, { status: 400 });
    }
    throw friendly(e, 'We couldn’t change your password. Please try again.');
  }
}

// ─── Devices (sessions) ──────────────────────────────────────────

export interface DeviceSession {
  id: string;
  device_name: string;
  device_type: string;
  os: string;
  browser: string;
  ip_address: string;
  location?: string;
  last_active_at: string;
  created_at: string;
  is_current: boolean;
}

/** GET /users/me/sessions → { data: DeviceSession[] } */
export async function listSessions(): Promise<DeviceSession[]> {
  const json = await apiRequest<{ data: DeviceSession[] | null }>('/users/me/sessions');
  return json.data ?? [];
}

/** DELETE /users/me/sessions/:id signs that device out. */
export async function revokeSession(id: string): Promise<void> {
  try {
    await apiRequest(`/users/me/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (e) {
    throw friendly(e, 'We couldn’t sign that device out. Please try again.');
  }
}

// ─── Profile ─────────────────────────────────────────────────────

export interface ProfileUpdate {
  first_name?: string;
  last_name?: string;
  school?: string;
  department?: string;
  academic_level?: string;
  timezone?: string;
}

/** PUT /users/me with the fields that changed → { data: user } */
export async function updateProfile(patch: ProfileUpdate): Promise<AuthUser> {
  const body = Object.fromEntries(Object.entries(patch).filter(([, v]) => typeof v === 'string' && v.trim() !== ''));
  try {
    const json = await apiRequest<{ data: AuthUser }>('/users/me', { method: 'PUT', body });
    return json.data;
  } catch (e) {
    throw friendly(e, 'We couldn’t save your profile. Please try again.');
  }
}

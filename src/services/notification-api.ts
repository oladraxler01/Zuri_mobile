import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { apiRequest, currentUser } from '@/services/api-client';
import { loadJSON, removeKey, saveJSON } from '@/utils/storage';

/**
 * Notifications on the Zuri server (notification service; responses are NOT
 * wrapped in { data }).
 *
 *   GET    /notifications/preferences            → NotificationPrefs
 *   PUT    /notifications/preferences            { any NotificationPrefs field } → { message }
 *   POST   /notifications/devices/register       { device_token, device_type } → { message }
 *   DELETE /notifications/devices/:token         → { message }
 *   GET    /notifications/history?limit=50       → ServerNotification[]
 *
 * Note: the server's push sender is still a stub (BACKEND_REQUESTS #3), so
 * registered phones don't receive server pushes yet. Class and deadline
 * reminders are scheduled on the phone (services/notifications.ts) so they
 * work offline; they are deliberately not duplicated as server reminders.
 */

export interface NotificationPrefs {
  push_enabled: boolean;
  email_enabled: boolean;
  email_frequency?: string;
  quiet_hours_start?: number;
  quiet_hours_end?: number;
  timezone?: string;
  notify_on_quiz_completion: boolean;
  notify_on_streak_achievement: boolean;
  notify_on_goal_completion: boolean;
  notify_on_material_processed: boolean;
  notify_on_study_reminder: boolean;
}

export interface ServerNotification {
  id: string;
  notification_type: string;
  channel: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  sent_at: string;
  opened_at?: string | null;
}

export async function getPreferences(): Promise<NotificationPrefs> {
  return apiRequest<NotificationPrefs>('/notifications/preferences');
}

export async function savePreferences(patch: Partial<NotificationPrefs>): Promise<void> {
  await apiRequest('/notifications/preferences', { method: 'PUT', body: patch });
}

export async function getHistory(limit = 50): Promise<ServerNotification[]> {
  const res = await apiRequest<ServerNotification[] | null>('/notifications/history', { query: { limit: String(limit) } });
  return res ?? [];
}

// ─── This phone ──────────────────────────────────────────────────

const DEVICE_KEY = 'zuri.push.device.v1';

/**
 * Register this phone for server pushes. Needs notification permission and a
 * development/production build (Expo Go and the web can't give a device token).
 * Uses the native FCM/APNs token, which is what the server's sender expects.
 * Never throws.
 */
export async function registerThisDevice(): Promise<'registered' | 'no-permission' | 'unsupported' | 'failed'> {
  if (Platform.OS === 'web' || !currentUser()) return 'unsupported';
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return 'no-permission';
    const { data } = await Notifications.getDevicePushTokenAsync();
    const token = typeof data === 'string' ? data : JSON.stringify(data);
    const saved = await loadJSON<{ token: string; userId: string }>(DEVICE_KEY);
    if (saved?.token === token && saved.userId === currentUser()?.id) return 'registered';
    await apiRequest('/notifications/devices/register', {
      method: 'POST',
      body: { device_token: token, device_type: Platform.OS },
    });
    await saveJSON(DEVICE_KEY, { token, userId: currentUser()!.id });
    return 'registered';
  } catch (e) {
    console.warn('[push] could not register this phone', e);
    return 'failed';
  }
}

/** Stop server pushes to this phone (before signing out). Never throws. */
export async function unregisterThisDevice(): Promise<void> {
  try {
    const saved = await loadJSON<{ token: string }>(DEVICE_KEY);
    if (!saved?.token) return;
    if (currentUser()) {
      await apiRequest(`/notifications/devices/${encodeURIComponent(saved.token)}`, { method: 'DELETE', timeoutMs: 5000 });
    }
    await removeKey(DEVICE_KEY);
  } catch (e) {
    console.warn('[push] could not unregister this phone', e);
  }
}

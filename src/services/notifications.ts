import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { CourseItem, TimetableSlot } from '@/context/academic-context';
import { parseTimeOfDay } from '@/utils/time';

/**
 * Local lecture reminders, scheduled on the phone from the timetable.
 * No server needed: each class gets a weekly repeating reminder
 * `leadMinutes` before it starts.
 */

export const notificationsSupported = Platform.OS !== 'web';

const CHANNEL_ID = 'lectures';
const SLOT_TO_WEEKDAY: Record<TimetableSlot['day'], number> = {
  // expo-notifications weekday: 1 = Sunday … 7 = Saturday
  Mon: 2,
  Tue: 3,
  Wed: 4,
  Thu: 5,
  Fri: 6,
  Sat: 7,
};

export type NotificationPermission = 'granted' | 'undetermined' | 'denied' | 'unsupported';

if (notificationsSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported) return 'unsupported';
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (perm.granted) return 'granted';
    return perm.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'unsupported';
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported) return 'unsupported';
  try {
    const perm = await Notifications.requestPermissionsAsync();
    if (perm.granted) return 'granted';
    return perm.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'unsupported';
  }
}

/** Replace all scheduled reminders with one weekly reminder per timetable slot. */
export async function syncLectureReminders(opts: {
  enabled: boolean;
  leadMinutes: number;
  timetable: TimetableSlot[];
  courses: CourseItem[];
}): Promise<number> {
  if (!notificationsSupported) return 0;
  if ((await getNotificationPermission()) !== 'granted') return 0;

  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!opts.enabled || !opts.timetable.length) return 0;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Lecture reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  let count = 0;
  for (const slot of opts.timetable) {
    const course = opts.courses.find((c) => c.id === slot.courseId);
    // Minutes into the week, minus the lead time (wraps to the previous day if needed).
    const weekMinutes = 7 * 24 * 60;
    let at = (SLOT_TO_WEEKDAY[slot.day] - 1) * 24 * 60 + parseTimeOfDay(slot.startTime) - opts.leadMinutes;
    at = ((at % weekMinutes) + weekMinutes) % weekMinutes;
    const weekday = Math.floor(at / (24 * 60)) + 1;
    const hour = Math.floor((at % (24 * 60)) / 60);
    const minute = at % 60;

    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `lecture-${slot.id}`,
        content: {
          title: `${slot.courseCode} starts in ${opts.leadMinutes} min`,
          body: `${course?.title ?? 'Your class'} · ${slot.venue}. Tap to get ready and record it.`,
          data: { slotId: slot.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
          channelId: CHANNEL_ID,
        },
      });
      count++;
    } catch (e) {
      console.warn('Could not schedule reminder', slot.id, e);
    }
  }
  return count;
}

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { CourseItem, TimetableSlot } from '@/context/academic-context';
import type { Assessment } from '@/types/planner';
import { parseTimeOfDay } from '@/utils/time';
import { registerThisDevice } from '@/services/notification-api';

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
  Sun: 1,
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
    if (perm.granted) {
      // Also let Zuri's server reach this phone (no-op when signed out).
      registerThisDevice();
      return 'granted';
    }
    return perm.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'unsupported';
  }
}

/**
 * Replace all scheduled reminders:
 * - one weekly reminder per timetable class (`leadMinutes` before)
 * - deadline reminders the day before and a few hours before each
 *   assignment/project (assignmentAlerts) and test/exam (examAlerts)
 */
export async function syncLectureReminders(opts: {
  enabled: boolean;
  leadMinutes: number;
  timetable: TimetableSlot[];
  courses: CourseItem[];
  assessments?: Assessment[];
  assignmentAlerts?: boolean;
  examAlerts?: boolean;
}): Promise<number> {
  if (!notificationsSupported) return 0;
  if ((await getNotificationPermission()) !== 'granted') return 0;

  await Notifications.cancelAllScheduledNotificationsAsync();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Class and deadline reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const deadlineCount = await scheduleDeadlines(opts);
  if (!opts.enabled || !opts.timetable.length) return deadlineCount;

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
  return count + deadlineCount;
}

async function scheduleDeadlines(opts: {
  assessments?: Assessment[];
  assignmentAlerts?: boolean;
  examAlerts?: boolean;
}): Promise<number> {
  const now = Date.now();
  let count = 0;
  for (const a of opts.assessments ?? []) {
    if (a.status === 'done') continue;
    const timed = a.kind === 'exam' || a.kind === 'test';
    if (timed ? !opts.examAlerts : !opts.assignmentAlerts) continue;
    const due = new Date(a.dueAt).getTime();
    const label = timed ? 'starts' : 'is due';
    const reminders = [
      { at: due - 24 * 60 * 60 * 1000, when: 'tomorrow' },
      { at: due - (timed ? 2 : 3) * 60 * 60 * 1000, when: `in ${timed ? 2 : 3} hours` },
    ];
    for (const [i, r] of reminders.entries()) {
      if (r.at <= now) continue;
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: `due-${a.id}-${i}`,
          content: {
            title: `${a.courseCode} ${a.kind} ${label} ${r.when}`,
            body: `${a.title}${a.venue ? ` · ${a.venue}` : ''}. Tap to see your checklist.`,
            data: { assessmentId: a.id },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(r.at), channelId: CHANNEL_ID },
        });
        count++;
      } catch (e) {
        console.warn('Could not schedule deadline reminder', a.id, e);
      }
    }
  }
  return count;
}

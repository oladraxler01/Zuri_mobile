import { useEffect } from 'react';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useSession } from '@/context/session-context';
import { useAcademic } from '@/context/academic-context';
import { notificationsSupported, syncLectureReminders } from '@/services/notifications';

/**
 * Keeps lecture reminders in step with the timetable and preferences,
 * and opens the class when a reminder is tapped. Renders nothing.
 */
export function ReminderSync() {
  const { role } = useSession();
  const { state, hydrated } = useAcademic();
  const { lectureReminders, reminderLeadMinutes } = state.preferences;

  useEffect(() => {
    if (!hydrated || !notificationsSupported) return;
    syncLectureReminders({
      enabled: role === 'student' && lectureReminders,
      leadMinutes: reminderLeadMinutes,
      timetable: state.timetable,
      courses: state.courses,
    }).catch((e) => console.warn('Reminder sync failed', e));
  }, [hydrated, role, lectureReminders, reminderLeadMinutes, state.timetable, state.courses]);

  useEffect(() => {
    if (!notificationsSupported) return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const slotId = response.notification.request.content.data?.slotId;
      if (typeof slotId === 'string') {
        router.push({ pathname: '/upcoming-lecture', params: { slotId } } as unknown as Href);
      }
    });
    return () => sub.remove();
  }, []);

  return null;
}

import { useEffect } from 'react';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useSession } from '@/context/session-context';
import { useAcademic } from '@/context/academic-context';
import { usePlanner } from '@/context/planner-context';
import { notificationsSupported, syncLectureReminders } from '@/services/notifications';

/**
 * Keeps lecture reminders in step with the timetable and preferences,
 * and opens the class when a reminder is tapped. Renders nothing.
 */
export function ReminderSync() {
  const { role } = useSession();
  const { state, hydrated } = useAcademic();
  const { lectureReminders, reminderLeadMinutes, assignmentAlerts, examCountdown } = state.preferences;
  const { assessments, hydrated: plannerReady } = usePlanner();

  useEffect(() => {
    if (!hydrated || !plannerReady || !notificationsSupported) return;
    const student = role === 'student';
    // Wait for a pause so rapid edits (ticking steps) reschedule once.
    const timer = setTimeout(() => {
    syncLectureReminders({
      enabled: student && lectureReminders,
      leadMinutes: reminderLeadMinutes,
      timetable: state.timetable,
      courses: state.courses,
      assessments: student ? assessments : [],
      assignmentAlerts,
      examAlerts: examCountdown,
    }).catch((e) => console.warn('Reminder sync failed', e));
    }, 800);
    return () => clearTimeout(timer);
  }, [hydrated, plannerReady, role, lectureReminders, reminderLeadMinutes, assignmentAlerts, examCountdown, state.timetable, state.courses, assessments]);

  useEffect(() => {
    if (!notificationsSupported) return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data ?? {};
      if (typeof data.slotId === 'string') {
        router.push({ pathname: '/upcoming-lecture', params: { slotId: data.slotId } } as unknown as Href);
      } else if (typeof data.assessmentId === 'string') {
        router.push(`/assessment/${data.assessmentId}` as Href);
      }
    });
    return () => sub.remove();
  }, []);

  return null;
}

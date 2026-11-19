import { useEffect } from 'react';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useSession } from '@/context/session-context';
import { useAcademic } from '@/context/academic-context';
import { usePlanner } from '@/context/planner-context';
import { notificationsSupported, syncLectureReminders } from '@/services/notifications';
import { useFlag } from '@/services/feature-flags';
import { saveAcademicProfile } from '@/services/academic-api';

/**
 * Keeps lecture reminders in step with the timetable and preferences,
 * and opens the class when a reminder is tapped. Renders nothing.
 */
export function ReminderSync() {
  const { role } = useSession();
  const { state, hydrated } = useAcademic();
  const { lectureReminders, reminderLeadMinutes, assignmentAlerts, examCountdown } = state.preferences;
  const { assessments, hydrated: plannerReady } = usePlanner();
  // Phase 2: Zuri's server sends class reminders (at the profile's lead time, honouring
  // quiet hours, cancellations and moves). Then the phone mustn't schedule its own too.
  const serverReminders = useFlag('proactive_worker');

  // Keep the server's reminder lead time in step with the app setting.
  useEffect(() => {
    if (!serverReminders || !hydrated) return;
    saveAcademicProfile({ reminder_lead_minutes: lectureReminders ? reminderLeadMinutes : 0 }).catch(() => {});
  }, [serverReminders, hydrated, lectureReminders, reminderLeadMinutes]);

  useEffect(() => {
    if (!hydrated || !plannerReady || !notificationsSupported) return;
    const student = role === 'student';
    // Wait for a pause so rapid edits (ticking steps) reschedule once.
    const timer = setTimeout(() => {
    syncLectureReminders({
      enabled: student && lectureReminders && !serverReminders,
      leadMinutes: reminderLeadMinutes,
      timetable: state.timetable,
      courses: state.courses,
      assessments: student ? assessments : [],
      assignmentAlerts,
      examAlerts: examCountdown,
    }).catch((e) => console.warn('Reminder sync failed', e));
    }, 800);
    return () => clearTimeout(timer);
  }, [hydrated, plannerReady, role, lectureReminders, reminderLeadMinutes, assignmentAlerts, examCountdown, state.timetable, state.courses, assessments, serverReminders]);

  useEffect(() => {
    if (!notificationsSupported) return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data ?? {};
      if (typeof data.slotId === 'string') {
        router.push({ pathname: '/upcoming-lecture', params: { slotId: data.slotId } } as unknown as Href);
      } else if (typeof data.assessmentId === 'string') {
        router.push(`/assessment/${data.assessmentId}` as Href);
      } else if ((data.type === 'classmate_request' || data.type === 'classmate_share') && typeof data.request_id === 'string') {
        // Server push from "Ask classmates" (BACKEND_REQUESTS #25).
        router.push({ pathname: '/classmates/[id]', params: { id: data.request_id } } as unknown as Href);
      }
    });
    return () => sub.remove();
  }, []);

  return null;
}

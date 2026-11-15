import type { IoniconName } from '@/types/lecture';

/** Sections of the institution Settings hub (/admin/settings/<key>). */
export const SETTINGS_SECTIONS: { key: string; title: string; icon: IoniconName; desc: string }[] = [
  { key: 'institution', title: 'Institution settings', icon: 'business-outline', desc: 'Name, academic year, semester, time zone' },
  { key: 'roles', title: 'Roles & permissions', icon: 'key-outline', desc: 'What each role can see and do' },
  { key: 'staff', title: 'Staff management', icon: 'people-outline', desc: 'Invite staff and assign roles' },
  { key: 'notifications', title: 'Notification management', icon: 'notifications-outline', desc: 'Send notices to students or staff' },
  { key: 'audit', title: 'Audit logs', icon: 'list-outline', desc: 'Who changed what, and when' },
  { key: 'privacy', title: 'Data & privacy controls', icon: 'shield-checkmark-outline', desc: 'Retention, analytics, exports, deletion' },
  { key: 'integrations', title: 'Integrations', icon: 'git-network-outline', desc: 'Student records, LMS, single sign-on, timetable' },
  { key: 'api', title: 'API & webhooks', icon: 'code-slash-outline', desc: 'Keys and event delivery for your IT team' },
];

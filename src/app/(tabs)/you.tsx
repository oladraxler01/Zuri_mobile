import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useAcademic } from '@/context/academic-context';
import { useSession } from '@/context/session-context';
import { useLectures } from '@/context/lectures-context';
import { useProgress } from '@/context/progress-context';
import { ScreenShell, Panel, ListRow, Divider, StatusBadge } from '@/components/dashboard';
import { localDateKey } from '@/utils/planner';
import { formatDuration } from '@/utils/time';
import type { IoniconName } from '@/types/lecture';

type Row = { icon: IoniconName; title: string; subtitle: string; href: string };

/** Profile hub: identity, quick stats, and every profile, preference and account screen. */
export default function YouScreen() {
  const { state } = useAcademic();
  const { signOut } = useSession();
  const { lectures } = useLectures();
  const { events } = useProgress();
  const p = state.preferences;

  const name = state.studentName || 'Student';
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'S';
  const minutes = events.filter((e) => e.type === 'study-session').reduce((n, e) => n + (e.minutes ?? 0), 0);
  const streak = useMemo(() => {
    const active = new Set(events.map((e) => localDateKey(new Date(e.at))));
    let n = 0;
    const d = new Date();
    if (!active.has(localDateKey(d))) d.setDate(d.getDate() - 1);
    while (active.has(localDateKey(d))) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }, [events]);

  const profile: Row[] = [
    { icon: 'school-outline', title: 'Academic profile', subtitle: `${state.department} · ${state.level} · ${state.semester}`, href: '/profile/academic' },
    { icon: 'analytics-outline', title: 'Learning profile', subtitle: 'Strengths, growth areas and study habits', href: '/profile/learning' },
    { icon: 'flag-outline', title: 'Goals', subtitle: `Target ${p.targetGpa} · ${state.goals.filter((g) => !g.done).length} open goals`, href: '/profile/goals' },
    { icon: 'server-outline', title: 'Knowledge & memory', subtitle: 'What Zuri keeps about your learning', href: '/profile/knowledge' },
  ];
  const prefs: Row[] = [
    { icon: 'book-outline', title: 'Study preferences', subtitle: `${p.weeklyStudyHours} h a week · ${p.sessionSize}-item sessions`, href: '/settings/study' },
    { icon: 'notifications-outline', title: 'Notifications', subtitle: p.lectureReminders ? `Class reminders ${p.reminderLeadMinutes} min before` : 'Class reminders off', href: '/settings/notifications' },
    { icon: 'mic-outline', title: 'Recording', subtitle: `${p.recordingQuality === 'high' ? 'High' : 'Standard'} quality · ${p.keepAudio ? 'keep audio' : 'delete audio after processing'}`, href: '/settings/recording' },
    { icon: 'sparkles-outline', title: 'Zuri assistant', subtitle: `${p.aiAnswerStyle === 'concise' ? 'Concise' : 'Detailed'} answers · personalisation ${p.aiPersonalise ? 'on' : 'off'}`, href: '/settings/ai' },
  ];
  const account: Row[] = [
    { icon: 'business-outline', title: 'Connected university', subtitle: state.university, href: '/settings/university' },
    { icon: 'shield-checkmark-outline', title: 'Privacy & data', subtitle: 'Export or delete your data', href: '/settings/privacy' },
    { icon: 'person-circle-outline', title: 'Account', subtitle: state.email || 'Email, password, sign out', href: '/settings/account' },
    { icon: 'help-circle-outline', title: 'Help & support', subtitle: 'FAQs, report a problem, app version', href: '/settings/help' },
  ];

  const verification =
    state.verification === 'verified'
      ? { status: 'good' as const, label: 'Verified student' }
      : state.verification === 'pending'
        ? { status: 'warning' as const, label: 'Verification pending' }
        : { status: 'critical' as const, label: 'Not verified' };

  return (
    <ScreenShell eyebrow="YOU" title="Profile">
      <Pressable style={styles.idCard} onPress={() => router.push('/profile/academic' as Href)} accessibilityRole="button">
        <View style={styles.avatar}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.uni}>{state.university}</Text>
          <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
            <StatusBadge status={verification.status} label={verification.label} />
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={UI.muted} />
      </Pressable>

      <View style={styles.stats}>
        <Stat value={`${lectures.length}`} label="lectures" />
        <View style={styles.divider} />
        <Stat value={formatDuration(minutes * 60)} label="studied" />
        <View style={styles.divider} />
        <Stat value={`${streak}`} label="day streak" />
      </View>

      <Section title="Profile" rows={profile} />
      <Section title="Preferences" rows={prefs} />
      <Section title="Account" rows={account} />

      <Pressable
        style={styles.signOut}
        onPress={() => {
          signOut();
          router.replace('/onboarding/welcome' as Href);
        }}
      >
        <Ionicons name="log-out-outline" size={18} color={UI.error} />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScreenShell>
  );
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <View>
      <Text style={styles.sectionLabel}>{title.toUpperCase()}</Text>
      <Panel>
        {rows.map((r, i) => (
          <View key={r.title}>
            {i > 0 && <Divider />}
            <ListRow icon={r.icon} title={r.title} subtitle={r.subtitle} onPress={() => router.push(r.href as Href)} />
          </View>
        ))}
      </Panel>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  idCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: UI.card, borderRadius: 18, borderWidth: 1, borderColor: UI.border, padding: 16 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: UI.amberSoft, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: ZuriFonts.headlineMd, fontSize: 22, color: UI.ink },
  name: { fontFamily: ZuriFonts.headlineMd, fontSize: 21, color: UI.ink },
  uni: { fontFamily: ZuriFonts.bodyRegular, fontSize: 13, color: UI.muted, marginTop: 2 },
  stats: { flexDirection: 'row', alignItems: 'center', backgroundColor: UI.card, borderRadius: 16, borderWidth: 1, borderColor: UI.border, paddingVertical: 14 },
  divider: { width: 1, height: 28, backgroundColor: UI.border },
  statValue: { fontFamily: ZuriFonts.headlineMd, fontSize: 20, color: UI.ink },
  statLabel: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 2 },
  sectionLabel: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, letterSpacing: 1.2, color: UI.muted, marginBottom: 8, marginTop: 4 },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 25, borderWidth: 1, borderColor: UI.errorSoft, backgroundColor: '#fff8f7' },
  signOutText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 14, color: UI.error },
});

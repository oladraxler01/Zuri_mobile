import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Switch, Linking, Platform, Share, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useAcademic } from '@/context/academic-context';
import { useSession } from '@/context/session-context';
import { useLectures } from '@/context/lectures-context';
import { useMaterials } from '@/context/materials-context';
import { usePlanner } from '@/context/planner-context';
import { useProgress } from '@/context/progress-context';
import { useConversations } from '@/context/conversations-context';
import { useResearch } from '@/context/research-context';
import { ScreenShell, Panel, ListRow, Divider, StatusBadge } from '@/components/dashboard';
import { Chip } from '@/components/ui/chip';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { EmptyState } from '@/components/states/state-view';
import { getNotificationPermission, requestNotificationPermission, type NotificationPermission } from '@/services/notifications';
import { resetAllData } from '@/utils/reset';
import { isBackendConfigured } from '@/services/lecture-api';
import {
  getPreferences as getServerNotificationPrefs,
  savePreferences as saveServerNotificationPrefs,
  type NotificationPrefs,
} from '@/services/notification-api';

const TITLES: Record<string, string> = {
  study: 'Study preferences',
  notifications: 'Notifications',
  recording: 'Recording',
  ai: 'Zuri assistant',
  university: 'Connected university',
  privacy: 'Privacy & data',
  account: 'Account',
  help: 'Help & support',
};

/** Student settings: /settings/<study|notifications|recording|ai|university|privacy|account|help> */
export default function SettingsScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  return (
    <ScreenShell back eyebrow="SETTINGS" title={TITLES[section] ?? 'Settings'} edges={['top', 'bottom']}>
      {section === 'study' && <Study />}
      {section === 'notifications' && <Notifications />}
      {section === 'recording' && <Recording />}
      {section === 'ai' && <Assistant />}
      {section === 'university' && <University />}
      {section === 'privacy' && <Privacy />}
      {section === 'account' && <Account />}
      {section === 'help' && <Help />}
      {!TITLES[section] && <EmptyState icon="settings-outline" title="Unknown setting" />}
    </ScreenShell>
  );
}

function Toggle({ title, desc, value, onChange }: { title: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleTitle}>{title}</Text>
        {!!desc && <Text style={styles.toggleDesc}>{desc}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: '#e4e2dd', true: '#c5832b' }} accessibilityLabel={title} />
    </View>
  );
}

function Options<T extends string | number>({ label, options, value, onChange }: { label: string; options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ gap: 8, paddingVertical: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.wrap}>
        {options.map((o) => (
          <Chip key={String(o.key)} label={o.label} on={value === o.key} onPress={() => onChange(o.key)} />
        ))}
      </View>
    </View>
  );
}

function Study() {
  const { state, updatePreferences } = useAcademic();
  const p = state.preferences;
  return (
    <Panel>
      <Options label="WEEKLY STUDY GOAL" options={[6, 10, 14, 20, 28].map((h) => ({ key: h, label: `${h} h` }))} value={p.weeklyStudyHours} onChange={(v) => updatePreferences({ weeklyStudyHours: v })} />
      <Divider />
      <Options label="STUDY SESSION LENGTH" options={[{ key: 5, label: 'Short · 5' }, { key: 8, label: 'Standard · 8' }, { key: 12, label: 'Long · 12' }]} value={p.sessionSize} onChange={(v) => updatePreferences({ sessionSize: v })} />
      <Divider />
      <Options
        label="PREFERRED STUDY TIME"
        options={[{ key: 'morning', label: 'Morning' }, { key: 'afternoon', label: 'Afternoon' }, { key: 'evening', label: 'Evening' }]}
        value={p.preferredStudyTime}
        onChange={(v) => updatePreferences({ preferredStudyTime: v as 'morning' | 'afternoon' | 'evening' })}
      />
      <Text style={styles.hint}>Your weekly plan spreads study sessions across the days before each deadline within your goal.</Text>
    </Panel>
  );
}

function Notifications() {
  const { state, updatePreferences } = useAcademic();
  const p = state.preferences;
  const [perm, setPerm] = useState<NotificationPermission | null>(null);
  useEffect(() => {
    getNotificationPermission().then(setPerm);
  }, []);
  return (
    <>
      <Panel>
        <View style={styles.toggle}>
          <Text style={[styles.toggleTitle, { flex: 1 }]}>Permission</Text>
          <StatusBadge
            status={perm === 'granted' ? 'good' : perm === 'denied' ? 'critical' : 'warning'}
            label={perm === 'granted' ? 'Allowed' : perm === 'denied' ? 'Turned off' : perm === 'unsupported' ? 'Not on web' : 'Not asked yet'}
          />
        </View>
        {perm === 'undetermined' && (
          <Pressable style={styles.primarySm} onPress={async () => setPerm(await requestNotificationPermission())}>
            <Text style={styles.primarySmText}>Allow notifications</Text>
          </Pressable>
        )}
        {perm === 'denied' && Platform.OS !== 'web' && (
          <Pressable style={styles.primarySm} onPress={() => Linking.openSettings()}>
            <Text style={styles.primarySmText}>Open phone settings</Text>
          </Pressable>
        )}
      </Panel>
      <Panel>
        <Toggle title="Class reminders" desc="Before each class on your timetable" value={p.lectureReminders} onChange={(v) => updatePreferences({ lectureReminders: v })} />
        {p.lectureReminders && (
          <Options label="REMIND ME" options={[10, 15, 30, 45].map((m) => ({ key: m, label: `${m} min before` }))} value={p.reminderLeadMinutes} onChange={(v) => updatePreferences({ reminderLeadMinutes: v })} />
        )}
        <Divider />
        <Toggle title="Assignment & project deadlines" desc="The day before and 3 hours before" value={p.assignmentAlerts} onChange={(v) => updatePreferences({ assignmentAlerts: v })} />
        <Divider />
        <Toggle title="Tests & exams" desc="The day before and 2 hours before" value={p.examCountdown} onChange={(v) => updatePreferences({ examCountdown: v })} />
      </Panel>
      <ServerNotificationPrefs />
    </>
  );
}

/** Account-level notification settings (GET/PUT /notifications/preferences). */
function ServerNotificationPrefs() {
  const { user } = useSession();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    getServerNotificationPrefs()
      .then(setPrefs)
      .catch((e) => setError(e instanceof Error ? e.message : 'Couldn’t load your account settings.'));
  }, [user]);

  if (!user) return null;

  const set = (key: keyof NotificationPrefs, value: boolean) => {
    if (!prefs) return;
    const before = prefs;
    setPrefs({ ...prefs, [key]: value });
    setError('');
    saveServerNotificationPrefs({ [key]: value }).catch((e) => {
      setPrefs(before);
      setError(e instanceof Error ? e.message : 'Couldn’t save that. Please try again.');
    });
  };

  return (
    <Panel title="From Zuri" subtitle="Saved in your account. Phone alerts from Zuri’s server start once its sender is live; class and deadline reminders above already work.">
      {!prefs ? (
        <Text style={styles.toggleDesc}>{error || 'Loading…'}</Text>
      ) : (
        <>
          <Toggle title="Phone notifications" desc="Allow Zuri’s server to notify this account" value={prefs.push_enabled} onChange={(v) => set('push_enabled', v)} />
          <Divider />
          <Toggle title="Email" desc="Summaries and important updates by email" value={prefs.email_enabled} onChange={(v) => set('email_enabled', v)} />
          <Divider />
          <Toggle title="Document ready" desc="When Zuri has finished reading an upload" value={prefs.notify_on_material_processed} onChange={(v) => set('notify_on_material_processed', v)} />
          <Divider />
          <Toggle title="Study reminders" desc="Nudges to keep your streak going" value={prefs.notify_on_study_reminder} onChange={(v) => set('notify_on_study_reminder', v)} />
          <Divider />
          <Toggle title="Quiz results" desc="When a quiz is graded" value={prefs.notify_on_quiz_completion} onChange={(v) => set('notify_on_quiz_completion', v)} />
          <Divider />
          <Toggle title="Streaks" desc="When you reach a study streak" value={prefs.notify_on_streak_achievement} onChange={(v) => set('notify_on_streak_achievement', v)} />
          <Divider />
          <Toggle title="Goals" desc="When you complete a goal" value={prefs.notify_on_goal_completion} onChange={(v) => set('notify_on_goal_completion', v)} />
          {!!error && <Text style={[styles.toggleDesc, { color: UI.error }]}>{error}</Text>}
        </>
      )}
    </Panel>
  );
}

function Recording() {
  const { state, updatePreferences } = useAcademic();
  const p = state.preferences;
  return (
    <Panel>
      <Options
        label="AUDIO QUALITY"
        options={[{ key: 'standard', label: 'Standard (recommended)' }, { key: 'high', label: 'High' }]}
        value={p.recordingQuality}
        onChange={(v) => updatePreferences({ recordingQuality: v as 'standard' | 'high' })}
      />
      <Text style={styles.hint}>
        Standard records 16 kHz mono speech, which transcribes just as accurately and uses about half the space (roughly 30 MB per hour). High uses
        44.1 kHz.
      </Text>
      <Divider />
      <Toggle
        title="Keep audio after processing"
        desc="Off: delete each recording once its transcript and notes are ready, to save space. You won’t be able to replay it."
        value={p.keepAudio}
        onChange={(v) => updatePreferences({ keepAudio: v })}
      />
    </Panel>
  );
}

function Assistant() {
  const { state, updatePreferences } = useAcademic();
  const p = state.preferences;
  return (
    <>
      <Panel>
        <Options
          label="ANSWER STYLE"
          options={[{ key: 'concise', label: 'Concise · 2 sources' }, { key: 'detailed', label: 'Detailed · 4 sources' }]}
          value={p.aiAnswerStyle}
          onChange={(v) => updatePreferences({ aiAnswerStyle: v as 'concise' | 'detailed' })}
        />
        <Divider />
        <Toggle
          title="Personalised recommendations"
          desc="Use your quiz answers and study history to suggest what to review. Off: you’ll still get deadline and class alerts."
          value={p.aiPersonalise}
          onChange={(v) => updatePreferences({ aiPersonalise: v })}
        />
        <Divider />
        <Toggle title="Always show sources" desc="Every answer links to the lecture moment or passage it came from" value onChange={() => {}} />
      </Panel>
      <Text style={styles.hint}>
        {isBackendConfigured
          ? 'Answers come from the Zuri server using your sources.'
          : 'Ask Zuri currently answers by quoting your own lectures and materials. AI-written answers arrive when the server is connected.'}
      </Text>
    </>
  );
}

function University() {
  const { state } = useAcademic();
  return (
    <>
      <Panel>
        <ListRow icon="business-outline" title={state.university} subtitle={`${state.faculty} · ${state.department}`} />
        <Divider />
        <ListRow
          icon="id-card-outline"
          title={state.matricNumber || 'No matric number'}
          subtitle="Student verification"
          right={
            <StatusBadge
              status={state.verification === 'verified' ? 'good' : state.verification === 'pending' ? 'warning' : 'critical'}
              label={state.verification === 'verified' ? 'Verified' : state.verification === 'pending' ? 'Pending' : 'Not verified'}
            />
          }
          onPress={() => router.push('/profile/academic' as Href)}
        />
      </Panel>
      <Panel title="University systems">
        {['Student records & enrollment', 'Official timetable', 'Learning management system'].map((s, i) => (
          <View key={s}>
            {i > 0 && <Divider />}
            <ListRow title={s} right={<StatusBadge status="warning" label="Not connected" />} />
          </View>
        ))}
        <Text style={styles.hint}>When your university connects to Zuri, your courses, timetable and verification sync here automatically.</Text>
      </Panel>
    </>
  );
}

function Privacy() {
  const { state } = useAcademic();
  const { signOut } = useSession();
  const { lectures } = useLectures();
  const { materials } = useMaterials();
  const { assessments } = usePlanner();
  const { events } = useProgress();
  const { conversations } = useConversations();
  const research = useResearch();
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState('');

  const exportData = async () => {
    const data = {
      exportedAt: new Date().toISOString(),
      app: 'Zuri',
      profile: { ...state },
      lectures: lectures.map(({ audioUri, ...l }) => l),
      materials: materials.map(({ uri, ...m }) => m),
      assessments,
      learningHistory: events,
      conversations,
      research: { projects: research.projects, papers: research.papers, saved: research.saved },
    };
    const json = JSON.stringify(data, null, 2);
    try {
      if (Platform.OS === 'web') {
        await Share.share({ message: json });
      } else {
        const file = new File(Paths.cache, 'zuri-data-export.json');
        await file.write(json);
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Your Zuri data' });
      }
      setMsg(`Exported ${(json.length / 1024).toFixed(0)} KB of data.`);
    } catch {
      setMsg('Export didn’t complete. Try again.');
    }
  };

  return (
    <>
      <Panel title="What’s stored">
        <Text style={styles.body}>
          Your profile, courses, timetable, {lectures.length} lectures, {materials.length} materials, deadlines, learning history, conversations and
          research are saved on this phone. Recordings and files stay on the phone until you choose to process them.
        </Text>
      </Panel>
      <Panel>
        <ListRow icon="download-outline" title="Export my data" subtitle="Everything above as a JSON file (recordings and files not included)" onPress={exportData} />
        <Divider />
        <ListRow icon="trash-outline" title="Delete all my data" subtitle="Remove everything from this phone and sign out" onPress={() => setConfirm(true)} />
      </Panel>
      {!!msg && <Text style={styles.hint}>{msg}</Text>}
      <ConfirmSheet
        visible={confirm}
        title="Delete all your data?"
        message="Lectures, recordings, materials, notes, deadlines, history, conversations and research are permanently removed from this phone. This can’t be undone."
        confirmLabel="Delete everything"
        destructive
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          setConfirm(false);
          await resetAllData();
          signOut();
          router.replace('/onboarding/welcome' as Href);
        }}
      />
    </>
  );
}

function Account() {
  const { state } = useAcademic();
  const { signOut, user } = useSession();
  return (
    <>
      <Panel>
        <ListRow icon="person-outline" title={state.studentName || 'Name not set'} subtitle="Name" onPress={() => router.push('/profile/academic' as Href)} />
        <Divider />
        <ListRow icon="mail-outline" title={user?.email || state.email || 'Not set'} subtitle="Email" />
        <Divider />
        <ListRow
          icon="key-outline"
          title="Change password"
          subtitle={user ? 'Needs your current password' : 'Sign in first'}
          onPress={user ? () => router.push('/account/password' as Href) : undefined}
        />
        <Divider />
        <ListRow
          icon="phone-portrait-outline"
          title="Signed-in devices"
          subtitle="See where you’re signed in, or sign out everywhere"
          onPress={user ? () => router.push('/account/devices' as Href) : undefined}
        />
      </Panel>
      <Panel>
        <ListRow
          icon="log-out-outline"
          title="Sign out"
          onPress={() => {
            signOut();
            router.replace('/onboarding/welcome' as Href);
          }}
        />
        <Divider />
        <ListRow icon="trash-outline" title="Delete account" subtitle="Removes your data from this phone" onPress={() => router.push('/settings/privacy' as Href)} />
      </Panel>
    </>
  );
}

const FAQ = [
  { q: 'How do I record a lecture?', a: 'Tap Start Recording on Home, or Record on a course. Keep your phone face-up near the lecturer. When you stop, tap Save & process.' },
  { q: 'Which files can Zuri read?', a: 'PDFs with selectable text and plain text files. Word, PowerPoint, photos and lecture recordings can’t be read yet; recordings stay saved on your phone until they can.' },
  { q: 'Does Zuri work offline?', a: 'Yes. Recordings, notes, quizzes and saved papers work offline. Uploads wait and resume automatically when you’re back online.' },
  { q: 'How are mastery levels worked out?', a: 'From your recent quiz answers and flashcard ratings on each topic. Newer answers count more. Topics stay “Not tested yet” until you practise them.' },
  { q: 'Where is my data stored?', a: 'On this phone, and in your Zuri account when you’re signed in: uploads, practice quizzes, study progress, goals and notification settings. You can export or delete what’s on this phone in Privacy & data.' },
];

function Help() {
  const [open, setOpen] = useState<number | null>(0);
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const report = () =>
    Share.share({
      message: `Zuri problem report\n\nWhat happened:\n\nWhat I expected:\n\nApp version ${version} · ${Platform.OS} ${String(Platform.Version)}`,
    });
  return (
    <>
      <Panel title="Frequently asked questions">
        {FAQ.map((f, i) => (
          <View key={f.q}>
            {i > 0 && <Divider />}
            <Pressable style={styles.faqQ} onPress={() => setOpen(open === i ? null : i)} accessibilityRole="button" accessibilityState={{ expanded: open === i }}>
              <Text style={styles.toggleTitle}>{f.q}</Text>
              <Ionicons name={open === i ? 'chevron-up' : 'chevron-down'} size={18} color={UI.muted} />
            </Pressable>
            {open === i && <Text style={styles.faqA}>{f.a}</Text>}
          </View>
        ))}
      </Panel>
      <Panel>
        <ListRow icon="chatbox-ellipses-outline" title="Report a problem" subtitle="Share a report by email or messaging" onPress={report} />
        <Divider />
        <ListRow icon="play-circle-outline" title="Watch the intro again" onPress={() => router.push('/onboarding' as Href)} />
        <Divider />
        <ListRow icon="information-circle-outline" title={`Zuri ${version}`} subtitle={`${Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web'} · Expo SDK 58`} />
      </Panel>
    </>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  toggleTitle: { fontFamily: ZuriFonts.bodyMedium, fontSize: 15, color: UI.ink, flexShrink: 1 },
  toggleDesc: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, lineHeight: 17, color: UI.muted, marginTop: 2 },
  label: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, letterSpacing: 1.2, color: UI.muted },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, lineHeight: 18, color: UI.muted, marginTop: 6 },
  body: { fontFamily: ZuriFonts.bodyRegular, fontSize: 14, lineHeight: 21, color: UI.inkSoft },
  primarySm: { alignSelf: 'flex-start', backgroundColor: UI.ink, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9, marginBottom: 6 },
  primarySmText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 13, color: '#fff' },
  faqQ: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 12 },
  faqA: { fontFamily: ZuriFonts.bodyRegular, fontSize: 14, lineHeight: 21, color: UI.inkSoft, paddingBottom: 12 },
});

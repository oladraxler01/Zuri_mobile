import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Switch, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { useInstitution } from '@/context/institution-context';
import { ScreenShell, Panel, ListRow, Divider, StatusBadge } from '@/components/dashboard';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/states/state-view';
import { PERMISSIONS, ROLES } from '@/data/sample-institution';
import { SETTINGS_SECTIONS } from '@/constants/settings-sections';
import { formatLectureDate } from '@/utils/time';

/** One settings section: /admin/settings/<institution|roles|staff|notifications|audit|privacy|integrations|api> */
export default function SettingsSectionScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const meta = SETTINGS_SECTIONS.find((s) => s.key === section);
  return (
    <ScreenShell back eyebrow="SETTINGS" title={meta?.title ?? 'Settings'} edges={['top', 'bottom']}>
      {section === 'institution' && <InstitutionSection />}
      {section === 'roles' && <RolesSection />}
      {section === 'staff' && <StaffSection />}
      {section === 'notifications' && <NotificationsSection />}
      {section === 'audit' && <AuditSection />}
      {section === 'privacy' && <PrivacySection />}
      {section === 'integrations' && <IntegrationsSection />}
      {section === 'api' && <ApiSection />}
      {!meta && <EmptyState icon="settings-outline" title="Unknown section" />}
    </ScreenShell>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChange} placeholderTextColor={UI.muted} />
    </View>
  );
}

function InstitutionSection() {
  const { settings, updateSettings } = useInstitution();
  const [draft, setDraft] = useState(settings);
  const changed = JSON.stringify(draft) !== JSON.stringify(settings);
  return (
    <Panel>
      <Field label="INSTITUTION NAME" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
      <Field label="SHORT NAME" value={draft.shortName} onChange={(v) => setDraft({ ...draft, shortName: v })} />
      <Field label="ACADEMIC YEAR" value={draft.academicYear} onChange={(v) => setDraft({ ...draft, academicYear: v })} />
      <Text style={styles.label}>SEMESTER</Text>
      <View style={[styles.wrap, { marginBottom: 12 }]}>
        {['First Semester', 'Second Semester'].map((s) => (
          <Chip key={s} label={s} on={draft.semester === s} onPress={() => setDraft({ ...draft, semester: s })} />
        ))}
      </View>
      <Field label="TIME ZONE" value={draft.timezone} onChange={(v) => setDraft({ ...draft, timezone: v })} />
      <Pressable style={[styles.primary, !changed && { opacity: 0.4 }]} disabled={!changed} onPress={() => updateSettings(draft)}>
        <Text style={styles.primaryText}>Save changes</Text>
      </Pressable>
    </Panel>
  );
}

function RolesSection() {
  const { roles, togglePermission } = useInstitution();
  return (
    <>
      <Text style={styles.muted}>Tap to grant or remove a permission. Administrators always keep full access.</Text>
      {ROLES.map((role) => (
        <Panel key={role} title={role} subtitle={`${roles[role]?.length ?? 0} of ${PERMISSIONS.length} permissions`}>
          {PERMISSIONS.map((p, i) => {
            const on = roles[role]?.includes(p);
            const locked = role === 'Administrator';
            return (
              <View key={p}>
                {i > 0 && <Divider />}
                <Pressable
                  style={styles.permRow}
                  disabled={locked}
                  onPress={() => togglePermission(role, p)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: !!on, disabled: locked }}
                >
                  <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? UI.success : UI.muted} />
                  <Text style={[styles.permText, locked && { color: UI.muted }]}>{p}</Text>
                </Pressable>
              </View>
            );
          })}
        </Panel>
      ))}
    </>
  );
}

function StaffSection() {
  const { staff, inviteStaff, updateStaff } = useInstitution();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', department: '', role: ROLES[2] as string });
  const valid = form.name.trim() && /\S+@\S+\.\S+/.test(form.email);

  return (
    <>
      <Panel title="Invite staff" action={{ label: adding ? 'Cancel' : 'Invite', onPress: () => setAdding(!adding) }}>
        {adding ? (
          <View>
            <Field label="FULL NAME" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="WORK EMAIL" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Field label="DEPARTMENT" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
            <Text style={styles.label}>ROLE</Text>
            <View style={[styles.wrap, { marginBottom: 12 }]}>
              {ROLES.map((r) => (
                <Chip key={r} label={r} on={form.role === r} onPress={() => setForm({ ...form, role: r })} />
              ))}
            </View>
            <Pressable
              style={[styles.primary, !valid && { opacity: 0.4 }]}
              disabled={!valid}
              onPress={() => {
                inviteStaff({ name: form.name.trim(), email: form.email.trim(), department: form.department.trim() || '—', role: form.role });
                setForm({ name: '', email: '', department: '', role: ROLES[2] });
                setAdding(false);
              }}
            >
              <Text style={styles.primaryText}>Send invite</Text>
            </Pressable>
            <Text style={styles.hint}>Invites are emailed once the backend is connected.</Text>
          </View>
        ) : (
          <Text style={styles.muted}>Add lecturers, heads of department and registry staff.</Text>
        )}
      </Panel>

      <Panel title={`${staff.length} staff`}>
        {staff.map((m, i) => (
          <View key={m.id}>
            {i > 0 && <Divider />}
            <View style={styles.staffRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.staffName}>{m.name}</Text>
                <Text style={styles.staffMeta}>
                  {m.role} · {m.department}
                </Text>
                <Text style={styles.staffMeta}>{m.email}</Text>
              </View>
              <StatusBadge
                status={m.status === 'active' ? 'good' : m.status === 'invited' ? 'warning' : 'critical'}
                label={m.status === 'active' ? 'Active' : m.status === 'invited' ? 'Invited' : 'Suspended'}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 10 }}>
              {ROLES.map((r) => (
                <Chip key={r} label={r} on={m.role === r} onPress={() => updateStaff(m.id, { role: r })} />
              ))}
              <Chip
                label={m.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                on={false}
                onPress={() => updateStaff(m.id, { status: m.status === 'suspended' ? 'active' : 'suspended' })}
              />
            </ScrollView>
          </View>
        ))}
      </Panel>
    </>
  );
}

function NotificationsSection() {
  const { broadcasts, sendBroadcast } = useInstitution();
  const [audience, setAudience] = useState<'everyone' | 'students' | 'staff'>('everyone');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const ok = title.trim() && body.trim();
  return (
    <>
      <Panel title="Send a notice">
        <Text style={styles.label}>AUDIENCE</Text>
        <View style={[styles.wrap, { marginBottom: 12 }]}>
          {(['everyone', 'students', 'staff'] as const).map((a) => (
            <Chip key={a} label={a[0].toUpperCase() + a.slice(1)} on={audience === a} onPress={() => setAudience(a)} />
          ))}
        </View>
        <Field label="TITLE" value={title} onChange={setTitle} />
        <Text style={styles.label}>MESSAGE</Text>
        <TextInput
          style={[styles.input, { height: 110, paddingTop: 12 }]}
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
          placeholder="e.g. The library will close early on Friday."
          placeholderTextColor={UI.muted}
        />
        <Pressable
          style={[styles.primary, { marginTop: 12 }, !ok && { opacity: 0.4 }]}
          disabled={!ok}
          onPress={() => {
            sendBroadcast({ audience, title: title.trim(), body: body.trim() });
            setTitle('');
            setBody('');
          }}
        >
          <Text style={styles.primaryText}>Send notice</Text>
        </Pressable>
        <Text style={styles.hint}>Delivered as a push notification once the backend is connected.</Text>
      </Panel>
      <Panel title="Sent" subtitle={broadcasts.length ? undefined : 'Nothing sent yet'}>
        {broadcasts.map((b, i) => (
          <View key={b.id}>
            {i > 0 && <Divider />}
            <ListRow icon="megaphone-outline" title={b.title} subtitle={`To ${b.audience} · ${formatLectureDate(b.sentAt)} · ${b.body}`} />
          </View>
        ))}
      </Panel>
    </>
  );
}

function AuditSection() {
  const { audit } = useInstitution();
  return (
    <Panel title={`${audit.length} entries`} subtitle="Newest first. Changes you make in Settings are recorded here.">
      {audit.map((a, i) => (
        <View key={a.id}>
          {i > 0 && <Divider />}
          <View style={styles.auditRow}>
            <Text style={styles.auditWhen}>{formatLectureDate(a.at)}</Text>
            <Text style={styles.auditText}>
              <Text style={styles.auditActor}>{a.actor}</Text> {a.action.toLowerCase()} · {a.target}
            </Text>
          </View>
        </View>
      ))}
    </Panel>
  );
}

function PrivacySection() {
  const { privacy, updatePrivacy } = useInstitution();
  const Toggle = ({ title, desc, value, onChange }: { title: string; desc: string; value: boolean; onChange: (v: boolean) => void }) => (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleDesc}>{desc}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: '#e4e2dd', true: '#c5832b' }} />
    </View>
  );
  return (
    <>
      <Panel title="Recording retention" subtitle="Lecture audio older than this is deleted automatically">
        <View style={styles.wrap}>
          {[6, 12, 24, 48].map((m) => (
            <Chip key={m} label={`${m} months`} on={privacy.retainRecordingsMonths === m} onPress={() => updatePrivacy({ retainRecordingsMonths: m })} />
          ))}
        </View>
      </Panel>
      <Panel>
        <Toggle title="Learning analytics" desc="Use engagement and quiz data to show insights to lecturers" value={privacy.allowAnalytics} onChange={(v) => updatePrivacy({ allowAnalytics: v })} />
        <Divider />
        <Toggle title="Anonymise exports" desc="Remove names and IDs from data exports" value={privacy.anonymiseExports} onChange={(v) => updatePrivacy({ anonymiseExports: v })} />
        <Divider />
        <Toggle title="Student data deletion requests" desc="Let students delete their account and data from the app" value={privacy.studentDataDeletion} onChange={(v) => updatePrivacy({ studentDataDeletion: v })} />
      </Panel>
    </>
  );
}

function IntegrationsSection() {
  const { integrations, toggleIntegration } = useInstitution();
  return (
    <Panel subtitle="Connections to your university systems">
      {integrations.map((it, i) => (
        <View key={it.id}>
          {i > 0 && <Divider />}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>{it.name}</Text>
              <Text style={styles.toggleDesc}>{it.description}</Text>
              <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                <StatusBadge status={it.connected ? 'good' : 'warning'} label={it.connected ? 'Connected' : 'Not connected'} />
              </View>
            </View>
            <Pressable style={it.connected ? styles.outline : styles.primarySm} onPress={() => toggleIntegration(it.id)}>
              <Text style={it.connected ? styles.outlineText : styles.primaryText}>{it.connected ? 'Disconnect' : 'Connect'}</Text>
            </Pressable>
          </View>
        </View>
      ))}
      <Text style={styles.hint}>Status here is saved on this device; live connections are set up with your IT team.</Text>
    </Panel>
  );
}

function ApiSection() {
  const { apiKeyLast4, rotateApiKey, webhookUrl, setWebhook } = useInstitution();
  const [url, setUrl] = useState(webhookUrl);
  return (
    <>
      <Panel title="API key" subtitle="Used by your IT team to read analytics and sync data">
        <View style={styles.keyRow}>
          <Text style={styles.key}>lx_live_••••••••••••{apiKeyLast4}</Text>
          <Pressable style={styles.outline} onPress={rotateApiKey}>
            <Text style={styles.outlineText}>Rotate</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>Rotating invalidates the old key immediately. The full key is shown once, on the web dashboard.</Text>
      </Panel>
      <Panel title="Webhook" subtitle="We'll send events (lecture processed, quiz published) to this URL">
        <TextInput style={styles.input} value={url} onChangeText={setUrl} placeholder="https://it.university.edu/lexi-events" placeholderTextColor={UI.muted} autoCapitalize="none" />
        <Pressable style={[styles.primary, { marginTop: 12 }, url === webhookUrl && { opacity: 0.4 }]} disabled={url === webhookUrl} onPress={() => setWebhook(url.trim())}>
          <Text style={styles.primaryText}>Save webhook</Text>
        </Pressable>
      </Panel>
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: LexiFonts.labelSmBold, fontSize: 11, letterSpacing: 1.2, color: UI.muted, marginBottom: 8 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.bg,
    paddingHorizontal: 14,
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 15,
    color: UI.ink,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primary: { height: 48, borderRadius: 24, backgroundColor: UI.ink, alignItems: 'center', justifyContent: 'center' },
  primarySm: { borderRadius: 20, backgroundColor: UI.ink, paddingHorizontal: 14, paddingVertical: 8 },
  primaryText: { fontFamily: LexiFonts.labelSmBold, fontSize: 14, color: '#fff' },
  outline: { borderRadius: 20, borderWidth: 1, borderColor: UI.border, paddingHorizontal: 14, paddingVertical: 8 },
  outlineText: { fontFamily: LexiFonts.labelSmBold, fontSize: 14, color: UI.ink },
  muted: { fontFamily: LexiFonts.bodyRegular, fontSize: 13, color: UI.muted },
  hint: { fontFamily: LexiFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 8 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  permText: { flex: 1, fontFamily: LexiFonts.bodyRegular, fontSize: 15, color: UI.ink },
  staffRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 12, paddingBottom: 8 },
  staffName: { fontFamily: LexiFonts.bodyMedium, fontSize: 15, color: UI.ink },
  staffMeta: { fontFamily: LexiFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 2 },
  auditRow: { paddingVertical: 10 },
  auditWhen: { fontFamily: LexiFonts.labelSmBold, fontSize: 11, color: UI.amber },
  auditText: { fontFamily: LexiFonts.bodyRegular, fontSize: 14, lineHeight: 20, color: UI.inkSoft, marginTop: 2 },
  auditActor: { fontFamily: LexiFonts.labelSmBold, color: UI.ink },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  toggleTitle: { fontFamily: LexiFonts.bodyMedium, fontSize: 15, color: UI.ink },
  toggleDesc: { fontFamily: LexiFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 2 },
  keyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  key: { flex: 1, fontFamily: LexiFonts.bodyMedium, fontSize: 14, color: UI.ink, letterSpacing: 0.5 },
});

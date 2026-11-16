import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useLecturer } from '@/context/lecturer-context';
import { useSession } from '@/context/session-context';
import { ScreenShell, Panel, ListRow, Divider, StatusBadge } from '@/components/dashboard';

/** Lecturer profile, verification and account. */
export default function LecturerProfileScreen() {
  const { profile, courses, updateProfile } = useLecturer();
  const { signOut } = useSession();
  const [staffId, setStaffId] = useState(profile.staffId);

  const initials = profile.fullName.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'L';
  const verification = profile.verified
    ? { status: 'good' as const, label: 'Verified' }
    : profile.staffId
      ? { status: 'warning' as const, label: 'Pending verification' }
      : { status: 'critical' as const, label: 'Not verified' };

  return (
    <ScreenShell eyebrow="LECTURER" title="Profile">
      <Panel>
        <View style={styles.idRow}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {profile.title} {profile.fullName || 'Your name'}
            </Text>
            <Text style={styles.dept}>{profile.department}</Text>
            <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
              <StatusBadge status={verification.status} label={verification.label} />
            </View>
          </View>
        </View>
      </Panel>

      <Panel title="Verification" subtitle="Your university confirms your staff ID before courses go live to students">
        <View style={styles.idInputRow}>
          <TextInput
            style={styles.input}
            value={staffId}
            onChangeText={setStaffId}
            placeholder="Staff ID e.g. VU/STF/1042"
            placeholderTextColor={UI.muted}
            autoCapitalize="characters"
          />
          <Pressable
            style={[styles.save, staffId.trim() === profile.staffId && { opacity: 0.4 }]}
            disabled={staffId.trim() === profile.staffId}
            onPress={() => updateProfile({ staffId: staffId.trim(), verified: false })}
          >
            <Text style={styles.saveText}>Submit</Text>
          </Pressable>
        </View>
        {!!profile.staffId && !profile.verified && (
          <Text style={styles.hint}>Submitted. Verification completes when your university account is connected.</Text>
        )}
      </Panel>

      <Panel title="Teaching">
        <ListRow
          icon="library-outline"
          title="Courses you teach"
          subtitle={courses.map((c) => c.code).join(', ') || 'None'}
          onPress={() => router.push('/onboarding/lecturer-setup' as Href)}
        />
        <Divider />
        <ListRow icon="person-outline" title="Edit profile" subtitle="Title, name, department" onPress={() => router.push('/onboarding/lecturer-setup' as Href)} />
      </Panel>

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

const styles = StyleSheet.create({
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: UI.amberSoft, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: ZuriFonts.headlineMd, fontSize: 22, color: UI.ink },
  name: { fontFamily: ZuriFonts.headlineMd, fontSize: 20, color: UI.ink },
  dept: { fontFamily: ZuriFonts.bodyRegular, fontSize: 14, color: UI.muted, marginTop: 2 },
  idInputRow: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.bg,
    paddingHorizontal: 14,
    fontFamily: ZuriFonts.bodyRegular,
    fontSize: 15,
    color: UI.ink,
  },
  save: { height: 48, borderRadius: 12, backgroundColor: UI.ink, paddingHorizontal: 16, justifyContent: 'center' },
  saveText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 14, color: '#fff' },
  hint: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 8 },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: UI.errorSoft,
    backgroundColor: '#fff8f7',
  },
  signOutText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 14, color: UI.error },
});

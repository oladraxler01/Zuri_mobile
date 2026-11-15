import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { useInstitution } from '@/context/institution-context';
import { useSession } from '@/context/session-context';
import { ScreenShell, Panel, ListRow, Divider } from '@/components/dashboard';
import { SETTINGS_SECTIONS } from '@/constants/settings-sections';

/** Institution settings hub. */
export default function InstitutionSettingsScreen() {
  const { settings, staff, integrations } = useInstitution();
  const { signOut } = useSession();
  const detail: Record<string, string> = {
    institution: `${settings.name} · ${settings.academicYear}`,
    staff: `${staff.length} staff · ${staff.filter((s) => s.status === 'invited').length} invited`,
    integrations: `${integrations.filter((i) => i.connected).length} of ${integrations.length} connected`,
  };

  return (
    <ScreenShell eyebrow="ADMINISTRATION" title="Settings">
      <Panel>
        {SETTINGS_SECTIONS.map((s, i) => (
          <View key={s.key}>
            {i > 0 && <Divider />}
            <ListRow icon={s.icon} title={s.title} subtitle={detail[s.key] ?? s.desc} onPress={() => router.push(`/admin/settings/${s.key}` as Href)} />
          </View>
        ))}
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
  signOutText: { fontFamily: LexiFonts.labelSmBold, fontSize: 14, color: UI.error },
});

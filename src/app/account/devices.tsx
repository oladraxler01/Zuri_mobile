import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { ScreenShell, Panel, Divider, StatusBadge } from '@/components/dashboard';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { listSessions, logoutEverywhere, revokeSession, type DeviceSession } from '@/services/auth-api';
import { useSession } from '@/context/session-context';

/** Settings → Account → Signed-in devices (GET/DELETE /users/me/sessions, POST /auth/logout-all). */
export default function DevicesScreen() {
  const styles = useStyles();
  const { colors, space, size } = useTheme();
  const { user, signOut } = useSession();
  const [sessions, setSessions] = useState<DeviceSession[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const list = await listSessions();
      list.sort((a, b) => Number(b.is_current) - Number(a.is_current) || b.last_active_at.localeCompare(a.last_active_at));
      setSessions(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn’t load your devices.');
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const remove = async (s: DeviceSession) => {
    setBusyId(s.id);
    try {
      await revokeSession(s.id);
      if (s.is_current) {
        signOut();
        router.replace('/onboarding/welcome' as Href);
        return;
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn’t sign that device out.');
    } finally {
      setBusyId(null);
    }
  };

  const signOutAll = async () => {
    setConfirmAll(false);
    setBusyId('all');
    try {
      await logoutEverywhere();
      signOut();
      router.replace('/onboarding/welcome' as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn’t sign out your devices.');
      setBusyId(null);
    }
  };

  return (
    <ScreenShell back eyebrow="ACCOUNT" title="Signed-in devices" edges={['top', 'bottom']}>
      {!user ? (
        <Panel>
          <Text style={styles.body}>Sign in to see your devices.</Text>
        </Panel>
      ) : (
        <>
          <Panel subtitle="Phones and browsers where your Zuri account is signed in. Sign out any you don’t recognise.">
            {sessions === null ? (
              <ActivityIndicator color={colors.text} style={{ paddingVertical: space[5] }} />
            ) : sessions.length === 0 ? (
              <Text style={styles.body}>{error || 'No devices found.'}</Text>
            ) : (
              sessions.map((s, i) => (
                <View key={s.id}>
                  {i > 0 && <Divider />}
                  <View style={styles.row}>
                    <Ionicons
                      name={/mobile|phone|android|ios/i.test(`${s.device_type} ${s.os}`) ? 'phone-portrait-outline' : 'laptop-outline'}
                      size={size['icon-lg']}
                      color={colors.text}
                    />
                    <View style={styles.rowText}>
                      <Text style={styles.title}>{describe(s)}</Text>
                      <Text style={styles.meta}>
                        {[s.location, s.ip_address, `Active ${when(s.last_active_at)}`].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    {s.is_current ? (
                      <StatusBadge status="good" label="This phone" />
                    ) : (
                      <Pressable
                        onPress={() => remove(s)}
                        disabled={!!busyId}
                        hitSlop={12}
                        style={styles.actionWrap}
                        accessibilityRole="button"
                        accessibilityLabel={`Sign out ${describe(s)}`}
                      >
                        {busyId === s.id ? <ActivityIndicator size="small" color={colors.text} /> : <Text style={styles.action}>Sign out</Text>}
                      </Pressable>
                    )}
                  </View>
                </View>
              ))
            )}
            {!!error && sessions !== null && sessions.length > 0 && <Text style={styles.error}>{error}</Text>}
          </Panel>

          <Panel>
            <Pressable style={styles.danger} onPress={() => setConfirmAll(true)} disabled={!!busyId} accessibilityRole="button">
              {busyId === 'all' ? <ActivityIndicator color={colors.danger} /> : <Text style={styles.dangerText}>Sign out of all devices</Text>}
            </Pressable>
            <Text style={[styles.meta, styles.centerNote]}>Including this phone. You’ll need to sign in again everywhere.</Text>
          </Panel>
        </>
      )}

      <ConfirmSheet
        visible={confirmAll}
        title="Sign out everywhere?"
        message="Every phone and browser signed in to your account will be signed out, including this one."
        confirmLabel="Sign out everywhere"
        destructive
        onConfirm={signOutAll}
        onCancel={() => setConfirmAll(false)}
      />
    </ScreenShell>
  );
}

function describe(s: DeviceSession) {
  const name = s.device_name?.trim();
  if (name) return name;
  const parts = [s.os, s.browser].filter((x) => x && x.trim());
  return parts.length ? parts.join(' · ') : 'Unknown device';
}

function when(iso: string) {
  const t = new Date(iso).getTime();
  if (!t) return 'recently';
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 2) return 'now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return new Date(iso).toLocaleDateString();
}

function useStyles() {
  const { colors, space, radius, size, type } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], minHeight: size['touch-target'] },
        rowText: { flex: 1, gap: space[1] },
        title: { ...type.subhead, color: colors.text },
        meta: { ...type.caption, color: colors['text-subtle'] },
        centerNote: { textAlign: 'center', marginTop: space[2] },
        body: { ...type.callout, color: colors['text-muted'] },
        actionWrap: { minHeight: size['touch-target'], justifyContent: 'center' },
        action: { ...type.subhead, color: colors.danger },
        error: { ...type.footnote, color: colors.danger, marginTop: space[2] },
        danger: {
          height: size['control-height'],
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.danger,
          alignItems: 'center',
          justifyContent: 'center',
        },
        dangerText: { ...type.headline, color: colors.danger },
      }),
    [colors]
  );
}

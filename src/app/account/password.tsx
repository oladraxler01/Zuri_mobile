import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { ScreenShell, Panel } from '@/components/dashboard';
import { changePassword, MIN_PASSWORD_LENGTH } from '@/services/auth-api';
import { useSession } from '@/context/session-context';

/** Settings → Account → Change password (POST /users/me/change-password). */
export default function ChangePasswordScreen() {
  const { user } = useSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const save = async () => {
    if (busy) return;
    if (!current) return setError('Enter your current password.');
    if (next.length < MIN_PASSWORD_LENGTH) return setError(`Your new password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
    if (next !== confirm) return setError('The two new passwords don’t match.');
    if (next === current) return setError('Choose a password different from your current one.');
    setError('');
    setBusy(true);
    try {
      await changePassword(current, next);
      setDone(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn’t change your password. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenShell back eyebrow="ACCOUNT" title="Change password" edges={['top', 'bottom']}>
      {!user ? (
        <Panel>
          <Text style={styles.body}>Sign in to change your password.</Text>
        </Panel>
      ) : done ? (
        <Panel>
          <Text style={styles.title}>Password changed</Text>
          <Text style={styles.body}>Use your new password the next time you sign in.</Text>
          <Pressable style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Done</Text>
          </Pressable>
        </Panel>
      ) : (
        <Panel>
          <View style={{ gap: 14 }}>
            <Field label="Current password" value={current} onChange={setCurrent} />
            <Field label="New password" value={next} onChange={setNext} placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`} />
            <Field label="Confirm new password" value={confirm} onChange={setConfirm} onSubmit={save} />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <Pressable style={[styles.button, busy && { opacity: 0.7 }]} onPress={save} disabled={busy} accessibilityRole="button">
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Change password</Text>}
            </Pressable>
            <Pressable
              onPress={() => router.push({ pathname: '/onboarding/forgot-password', params: { email: user.email } } as Href)}
              style={{ alignSelf: 'center' }}
            >
              <Text style={styles.link}>Forgot your current password?</Text>
            </Pressable>
          </View>
        </Panel>
      )}
    </ScreenShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  onSubmit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={UI.muted}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={onSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: ZuriFonts.headlineMd, fontSize: 18, color: UI.ink, marginBottom: 6 },
  body: { fontFamily: ZuriFonts.bodyRegular, fontSize: 14, lineHeight: 21, color: UI.inkSoft },
  label: { fontFamily: ZuriFonts.labelSm, fontSize: 13, color: UI.muted },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.cardMuted,
    paddingHorizontal: 14,
    fontFamily: ZuriFonts.bodyRegular,
    fontSize: 15,
    color: UI.ink,
  },
  error: { fontFamily: ZuriFonts.bodyRegular, fontSize: 13, color: UI.error },
  button: { height: 50, borderRadius: 25, backgroundColor: UI.ink, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  buttonText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 15, color: '#fff' },
  link: { fontFamily: ZuriFonts.labelSm, fontSize: 13, color: UI.ink, textDecorationLine: 'underline' },
});

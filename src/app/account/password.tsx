import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { useTheme } from '@/theme';
import { ScreenShell, Panel } from '@/components/dashboard';
import { changePassword, MIN_PASSWORD_LENGTH } from '@/services/auth-api';
import { useSession } from '@/context/session-context';

/** Settings → Account → Change password (POST /users/me/change-password). */
export default function ChangePasswordScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
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
          <Pressable style={styles.button} onPress={() => router.back()} accessibilityRole="button">
            <Text style={styles.buttonText}>Done</Text>
          </Pressable>
        </Panel>
      ) : (
        <Panel>
          <View style={styles.form}>
            <Field label="Current password" value={current} onChange={setCurrent} />
            <Field label="New password" value={next} onChange={setNext} placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`} />
            <Field label="Confirm new password" value={confirm} onChange={setConfirm} onSubmit={save} />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <Pressable style={[styles.button, busy && { opacity: 0.7 }]} onPress={save} disabled={busy} accessibilityRole="button">
              {busy ? <ActivityIndicator color={colors['on-primary']} /> : <Text style={styles.buttonText}>Change password</Text>}
            </Pressable>
            <Pressable
              onPress={() => router.push({ pathname: '/onboarding/forgot-password', params: { email: user.email } } as Href)}
              style={styles.linkWrap}
              accessibilityRole="link"
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
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors['text-subtle']}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={onSubmit}
      />
    </View>
  );
}

function useStyles() {
  const { colors, space, radius, size, type } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        form: { gap: space[4] },
        field: { gap: space[2] },
        title: { ...type['title-2'], color: colors.text, marginBottom: space[2] },
        body: { ...type.callout, color: colors['text-muted'] },
        label: { ...type.subhead, color: colors['text-muted'] },
        input: {
          height: size['control-height'],
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors['border-strong'],
          backgroundColor: colors['surface-sunken'],
          paddingHorizontal: space[4],
          ...type.body,
          color: colors.text,
        },
        error: { ...type.footnote, color: colors.danger },
        button: {
          height: size['control-height'],
          borderRadius: radius.md,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: space[2],
        },
        buttonText: { ...type.headline, color: colors['on-primary'] },
        linkWrap: { alignSelf: 'center', minHeight: size['touch-target'], justifyContent: 'center' },
        link: { ...type.subhead, color: colors['accent-text'], textDecorationLine: 'underline' },
      }),
    [colors]
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { useTheme } from '@/theme';
import { ScreenShell, Panel } from '@/components/dashboard';
import { deleteAccount, type DeleteProof } from '@/services/auth-api';
import {
  isAppleSignInAvailable,
  isGoogleSignInAvailable,
  socialProof,
  type SocialProvider,
} from '@/services/social-auth';
import { useSession } from '@/context/session-context';
import { resetAllData } from '@/utils/reset';

/**
 * Settings → Account → Delete account (DELETE /users/me).
 * Required by Google Play and the App Store: deletes the account and all its
 * data on the server, not just on this phone.
 */
export default function DeleteAccountScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { user, signOut } = useSession();
  const [password, setPassword] = useState('');
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Accounts made with Google / Apple may have no password: confirm with them instead.
  const noPassword = user?.has_password === false;
  const [apple, setApple] = useState(false);
  const google = isGoogleSignInAvailable();
  useEffect(() => {
    if (noPassword) isAppleSignInAvailable().then(setApple);
  }, [noPassword]);

  const finish = async (proof: DeleteProof) => {
    await deleteAccount(proof);
    await resetAllData();
    signOut();
    router.replace('/onboarding/welcome' as Href);
    Alert.alert('Account deleted', 'Your account is closed, and all your data will be permanently deleted within 24 hours.');
  };

  const remove = async () => {
    if (busy) return;
    if (!sure) return setError('Tick the box to confirm.');
    if (!password) return setError('Enter your password.');
    setError('');
    setBusy(true);
    try {
      await finish({ password });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn’t delete your account. Please try again.');
      setBusy(false);
    }
  };

  const removeWith = async (provider: SocialProvider) => {
    if (busy) return;
    if (!sure) return setError('Tick the box to confirm.');
    setError('');
    setBusy(true);
    try {
      const proof = await socialProof(provider);
      if (!proof) {
        setBusy(false);
        return;
      }
      await finish(proof);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn’t delete your account. Please try again.');
      setBusy(false);
    }
  };

  return (
    <ScreenShell back eyebrow="ACCOUNT" title="Delete account" edges={['top', 'bottom']}>
      {!user ? (
        <Panel>
          <Text style={styles.body}>Sign in to delete your account.</Text>
        </Panel>
      ) : (
        <Panel>
          <View style={styles.form}>
            <Text style={styles.title}>This can’t be undone</Text>
            <Text style={styles.body}>
              Deleting your account signs you out on every device and permanently deletes your profile, courses and
              timetable, lecture recordings and transcripts, notes, AI chats, quizzes, flashcards, study plans, progress
              and uploaded files. Everything is gone within 24 hours.
            </Text>
            <Text style={styles.body}>Signed in as {user.email}</Text>

            <Pressable
              style={styles.check}
              onPress={() => setSure((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: sure }}
            >
              <View style={[styles.box, sure && { backgroundColor: colors.danger, borderColor: colors.danger }]}>
                {sure && <Text style={styles.tick}>✓</Text>}
              </View>
              <Text style={styles.checkText}>I understand my account and data will be permanently deleted.</Text>
            </Pressable>

            {noPassword ? (
              <>
                <Text style={styles.body}>Confirm it’s you by signing in again with the account you used for Zuri.</Text>
                {!!error && <Text style={styles.error}>{error}</Text>}
                {busy && <ActivityIndicator color={colors.danger} />}
                {google && (
                  <Pressable style={[styles.button, busy && { opacity: 0.7 }]} onPress={() => removeWith('google')} disabled={busy} accessibilityRole="button">
                    <Text style={styles.buttonText}>Confirm with Google and delete</Text>
                  </Pressable>
                )}
                {apple && (
                  <Pressable style={[styles.button, busy && { opacity: 0.7 }]} onPress={() => removeWith('apple')} disabled={busy} accessibilityRole="button">
                    <Text style={styles.buttonText}>Confirm with Apple and delete</Text>
                  </Pressable>
                )}
                {!google && !apple && (
                  <Text style={styles.body}>
                    This phone can’t confirm with Google or Apple. Set a password with “Forgot your password?” on the sign-in
                    screen, or use the link below.
                  </Text>
                )}
              </>
            ) : (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Your password</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={remove}
                  />
                </View>
                {!!error && <Text style={styles.error}>{error}</Text>}
                <Pressable
                  style={[styles.button, busy && { opacity: 0.7 }]}
                  onPress={remove}
                  disabled={busy}
                  accessibilityRole="button"
                >
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Delete my account</Text>}
                </Pressable>
                <Pressable
                  onPress={() => router.push({ pathname: '/onboarding/forgot-password', params: { email: user.email } } as Href)}
                  style={styles.linkWrap}
                  accessibilityRole="link"
                >
                  <Text style={styles.link}>Forgot your password?</Text>
                </Pressable>
              </>
            )}
            <Pressable
              onPress={() => Linking.openURL('https://zurilearn.com/delete-account')}
              style={styles.linkWrap}
              accessibilityRole="link"
            >
              <Text style={styles.link}>Other ways to delete your account</Text>
            </Pressable>
          </View>
        </Panel>
      )}
    </ScreenShell>
  );
}

function useStyles() {
  const { colors, space, radius, size, type } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        form: { gap: space[4] },
        field: { gap: space[2] },
        title: { ...type['title-2'], color: colors.text },
        body: { ...type.callout, color: colors['text-muted'] },
        label: { ...type.subhead, color: colors['text-muted'] },
        check: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: size['touch-target'] },
        box: {
          width: 24,
          height: 24,
          borderRadius: radius.sm,
          borderWidth: 2,
          borderColor: colors['border-strong'],
          alignItems: 'center',
          justifyContent: 'center',
        },
        tick: { color: '#fff', fontWeight: '700' },
        checkText: { ...type.callout, color: colors.text, flex: 1 },
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
          backgroundColor: colors.danger,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: space[2],
        },
        buttonText: { ...type.headline, color: '#fff' },
        linkWrap: { alignSelf: 'center', minHeight: size['touch-target'], justifyContent: 'center' },
        link: { ...type.subhead, color: colors['accent-text'], textDecorationLine: 'underline' },
      }),
    [colors]
  );
}

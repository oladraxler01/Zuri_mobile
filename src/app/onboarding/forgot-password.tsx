import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { MIN_PASSWORD_LENGTH, requestPasswordReset, resetPassword } from '@/services/auth-api';
import { isValidEmail } from '@/utils/validation';

/**
 * Forgot password, in two steps:
 *   1. email → POST /auth/forgot-password (emails a reset code)
 *   2. code + new password → POST /auth/reset-password
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const styles = useStyles();
  const { colors, size } = useTheme();
  const params = useLocalSearchParams<{ email?: string }>();
  const [step, setStep] = useState<'email' | 'reset' | 'done'>('email');
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const back = () => (router.canGoBack() ? router.back() : router.replace('/onboarding/sign-in' as Href));

  const sendCode = async () => {
    if (busy) return;
    const clean = email.trim().toLowerCase();
    if (!isValidEmail(clean)) return setError('Enter a valid email address.');
    setError('');
    setBusy(true);
    try {
      await requestPasswordReset(clean);
      setInfo(`If ${clean} has a Zuri account, we’ve emailed it a reset code. Check your spam folder too.`);
      setStep('reset');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn’t send the reset email. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (busy) return;
    if (!code.trim()) return setError('Paste the reset code from the email.');
    if (password.length < MIN_PASSWORD_LENGTH) return setError(`Your new password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
    if (password !== confirm) return setError('The two passwords don’t match.');
    setError('');
    setBusy(true);
    try {
      await resetPassword(code, password);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn’t reset your password. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Pressable onPress={back} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={size['icon-lg']} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Zuri</Text>
        <View style={{ width: size['touch-target'] }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 'done' ? (
            <>
              <Text style={styles.headline}>Password changed.</Text>
              <Text style={styles.subtitle}>You can now sign in with your new password.</Text>
              <Pressable style={styles.button} onPress={() => router.replace('/onboarding/sign-in' as Href)} accessibilityRole="button">
                <Text style={styles.buttonText}>Go to sign in</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.headline}>{step === 'email' ? 'Forgot your password?' : 'Set a new password'}</Text>
              <Text style={styles.subtitle}>
                {step === 'email' ? 'Enter your email and we’ll send you a reset code.' : info}
              </Text>

              {step === 'email' ? (
                <View style={styles.field}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="name@example.com"
                    placeholderTextColor={colors['text-subtle']}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="send"
                    onSubmitEditing={sendCode}
                  />
                </View>
              ) : (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Reset code from the email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Paste the code here"
                      placeholderTextColor={colors['text-subtle']}
                      value={code}
                      onChangeText={setCode}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Text style={styles.hint}>Tip: copy the whole code from the email and paste it here.</Text>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>New password</Text>
                    <View>
                      <TextInput
                        style={[styles.input, styles.inputWithIcon]}
                        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                        placeholderTextColor={colors['text-subtle']}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!show}
                        autoCapitalize="none"
                      />
                      <Pressable style={styles.eye} onPress={() => setShow((s) => !s)} hitSlop={12} accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'}>
                        <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={size['icon-md']} color={colors['text-muted']} />
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Confirm new password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Type it again"
                      placeholderTextColor={colors['text-subtle']}
                      value={confirm}
                      onChangeText={setConfirm}
                      secureTextEntry={!show}
                      autoCapitalize="none"
                      returnKeyType="done"
                      onSubmitEditing={reset}
                    />
                  </View>
                </>
              )}

              {!!error && <Text style={styles.error}>{error}</Text>}

              <Pressable
                style={[styles.button, busy && { opacity: 0.7 }]}
                onPress={step === 'email' ? sendCode : reset}
                disabled={busy}
                accessibilityRole="button"
              >
                {busy ? (
                  <ActivityIndicator color={colors['on-primary']} />
                ) : (
                  <Text style={styles.buttonText}>{step === 'email' ? 'Send reset code' : 'Change password'}</Text>
                )}
              </Pressable>

              {step === 'reset' && (
                <Pressable onPress={() => { setStep('email'); setError(''); }} style={styles.linkWrap} accessibilityRole="button">
                  <Text style={styles.link}>Didn’t get it? Send another code</Text>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function useStyles() {
  const { colors, space, radius, size, type } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.surface },
        header: {
          height: 56,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: space[4],
        },
        back: { width: size['touch-target'], height: size['touch-target'], justifyContent: 'center' },
        headerTitle: { ...type['title-2'], color: colors.text },
        content: {
          paddingHorizontal: space[5],
          paddingTop: space[6],
          paddingBottom: space[8],
          gap: space[4],
          maxWidth: 420,
          width: '100%',
          alignSelf: 'center',
        },
        headline: { ...type['title-1'], color: colors.text },
        subtitle: { ...type.callout, color: colors['text-muted'] },
        field: { gap: space[2] },
        label: { ...type.subhead, color: colors['text-muted'] },
        hint: { ...type.caption, color: colors['text-subtle'] },
        input: {
          height: size['control-height'],
          backgroundColor: colors['surface-sunken'],
          borderWidth: 1,
          borderColor: colors['border-strong'],
          borderRadius: radius.md,
          paddingHorizontal: space[4],
          ...type.body,
          color: colors.text,
        },
        inputWithIcon: { paddingRight: size['touch-target'] + space[2] },
        eye: {
          position: 'absolute',
          right: 0,
          top: 0,
          width: size['touch-target'],
          height: size['control-height'],
          alignItems: 'center',
          justifyContent: 'center',
        },
        error: { ...type.footnote, color: colors.danger },
        button: {
          height: size['control-height'],
          backgroundColor: colors.primary,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: space[2],
        },
        buttonText: { ...type.headline, color: colors['on-primary'] },
        linkWrap: { alignSelf: 'center', minHeight: size['touch-target'], justifyContent: 'center', marginTop: space[2] },
        link: { ...type.subhead, color: colors['accent-text'], textDecorationLine: 'underline' },
      }),
    [colors]
  );
}

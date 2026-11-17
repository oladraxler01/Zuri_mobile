import { useState } from 'react';
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
import { ZuriColors, ZuriFonts, ZuriSpacing } from '@/constants/zuri-theme';
import { MIN_PASSWORD_LENGTH, requestPasswordReset, resetPassword } from '@/services/auth-api';
import { isValidEmail } from '@/utils/validation';

/**
 * Forgot password, in two steps:
 *   1. email → POST /auth/forgot-password (emails a reset code)
 *   2. code + new password → POST /auth/reset-password
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();
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
        <Pressable onPress={back} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={ZuriColors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Zuri</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 'done' ? (
            <>
              <Text style={styles.headline}>Password changed.</Text>
              <Text style={styles.subtitle}>You can now sign in with your new password.</Text>
              <Pressable style={styles.button} onPress={() => router.replace('/onboarding/sign-in' as Href)}>
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
                    placeholderTextColor={ZuriColors.onSurfaceVariant}
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
                      placeholderTextColor={ZuriColors.onSurfaceVariant}
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
                        style={[styles.input, { paddingRight: 48 }]}
                        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                        placeholderTextColor={ZuriColors.onSurfaceVariant}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!show}
                        autoCapitalize="none"
                      />
                      <Pressable style={styles.eye} onPress={() => setShow((s) => !s)} hitSlop={8} accessibilityLabel="Show or hide password">
                        <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={ZuriColors.onSurfaceVariant} />
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Confirm new password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Type it again"
                      placeholderTextColor={ZuriColors.onSurfaceVariant}
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
                  <ActivityIndicator color={ZuriColors.onPrimary} />
                ) : (
                  <Text style={styles.buttonText}>{step === 'email' ? 'Send reset code' : 'Change password'}</Text>
                )}
              </Pressable>

              {step === 'reset' && (
                <Pressable onPress={() => { setStep('email'); setError(''); }} style={{ alignSelf: 'center', marginTop: 16 }}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ZuriColors.background },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ZuriSpacing.containerPaddingH,
  },
  headerTitle: { fontFamily: ZuriFonts.headlineMd, fontSize: 22, color: ZuriColors.primary },
  content: {
    paddingHorizontal: ZuriSpacing.containerPaddingH,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 18,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  headline: { fontFamily: ZuriFonts.headlineLgMobile, fontSize: 28, lineHeight: 34, color: ZuriColors.primary },
  subtitle: { fontFamily: ZuriFonts.bodyMd, fontSize: 14, lineHeight: 20, color: ZuriColors.onSurfaceVariant, marginTop: -8 },
  field: { gap: 6 },
  label: { fontFamily: ZuriFonts.labelSm, fontSize: 13, color: '#8A8A8A', marginLeft: 4 },
  hint: { fontFamily: ZuriFonts.bodyMd, fontSize: 12, color: ZuriColors.onSurfaceVariant, marginLeft: 4 },
  input: {
    height: 52,
    backgroundColor: '#F5F3EF',
    borderWidth: 1,
    borderColor: '#E5E3DF',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: ZuriFonts.bodyMd,
    fontSize: 15,
    color: ZuriColors.onSurface,
  },
  eye: { position: 'absolute', right: 14, top: 16 },
  error: { fontFamily: ZuriFonts.bodyMd, fontSize: 13, color: '#ba1a1a' },
  button: {
    height: 56,
    backgroundColor: ZuriColors.primaryContainer,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 15, color: ZuriColors.onPrimary },
  link: { fontFamily: ZuriFonts.labelSm, fontSize: 13, color: ZuriColors.primary, textDecorationLine: 'underline' },
});

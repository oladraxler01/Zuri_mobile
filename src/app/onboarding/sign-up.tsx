import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Platform, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useZuriFonts } from '@/hooks/use-zuri-fonts';
import { startFreshForNewAccount } from '@/utils/account-owner';
import { useAcademic } from '@/context/academic-context';
import { register, login, resendVerification, setPendingSignIn, MIN_PASSWORD_LENGTH } from '@/services/auth-api';
import { isValidEmail } from '@/utils/validation';
import { useSocialSignIn } from '@/hooks/use-social-sign-in';
import { makeStyles, useTheme } from '@/theme';

export default function SignUpScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const [fontsLoaded] = useZuriFonts();

  const [fullName, setFullName] = useState('');
  const { setAcademicInfo } = useAcademic();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const social = useSocialSignIn(setFormError);

  if (!fontsLoaded) {
    return <View style={styles.container} />;
  }

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/onboarding/welcome' as Href);
    }
  };

  const handleContinue = async () => {
    if (busy) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!fullName.trim()) return setFormError('Enter your full name.');
    if (!isValidEmail(cleanEmail)) return setFormError('Enter a valid email address.');
    if (password.length < MIN_PASSWORD_LENGTH)
      return setFormError(`Your password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
    if (password !== confirmPassword) {
      Alert.alert('Passwords Mismatch', 'Your passwords do not match. Please re-enter.');
      return;
    }
    setFormError('');

    setBusy(true);
    try {
      const user = await register(cleanEmail, password);
      // A new account starts clean: nothing saved on this phone is theirs.
      await startFreshForNewAccount();
      setAcademicInfo({ studentName: fullName.trim(), email: cleanEmail });
      setPendingSignIn({ email: cleanEmail, password, userId: user.id });
      router.push({ pathname: '/onboarding/verify', params: { email: cleanEmail, userId: user.id } } as any);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (/already exists/i.test(msg)) {
        // Signed up before but may never have entered the code: if the password
        // matches, email a fresh code (unverified) or continue (verified).
        try {
          const result = await login(cleanEmail, password);
          if (result.status === 'needs-verification') {
            setPendingSignIn({ email: cleanEmail, password, userId: result.userId });
            await resendVerification(cleanEmail).catch(() => {});
            router.push({ pathname: '/onboarding/verify', params: { email: cleanEmail, userId: result.userId } } as any);
          } else {
            setAcademicInfo({ studentName: fullName.trim(), email: cleanEmail });
            router.replace('/onboarding/institution' as Href);
          }
          return;
        } catch {
          // wrong password for an existing account: fall through to the message
        }
      }
      setFormError(msg || 'We couldn’t create your account. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleGoToSignIn = () => {
    router.replace('/onboarding/sign-in' as Href);
  };


  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Top App Bar */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Zuri</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={{ flex: 1 }}>
        <KeyboardAwareScrollView bottomOffset={24}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Headline */}
          <Text style={styles.headline}>Create your account</Text>

          {/* Form Group */}
          <View style={styles.formGroup}>
            {/* Full Name */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={colors['text-muted']}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            {/* Email Address */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor={colors['text-muted']}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                placeholder="Password"
                placeholderTextColor={colors['text-muted']}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="next"
              />
              <Pressable
                style={styles.visibilityToggle}
                onPress={() => setShowPassword((prev) => !prev)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Toggle password visibility"
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors['text-muted']}
                />
              </Pressable>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                placeholder="Confirm Password"
                placeholderTextColor={colors['text-muted']}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />
              <Pressable
                style={styles.visibilityToggle}
                onPress={() => setShowConfirmPassword((prev) => !prev)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Toggle confirm password visibility"
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors['text-muted']}
                />
              </Pressable>
            </View>

            {!!formError && (
              <Text style={styles.formError} accessibilityLiveRegion="polite">
                {formError}
              </Text>
            )}

            {/* Continue Button */}
            <Pressable
              style={({ pressed }) => [
                styles.continueButton,
                pressed && styles.continueButtonPressed,
                busy && styles.continueButtonBusy,
              ]}
              onPress={handleContinue}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Continue"
              accessibilityState={{ busy, disabled: busy }}
            >
              {busy ? (
                <ActivityIndicator color={colors['on-primary']} />
              ) : (
                <Text style={styles.continueButtonText}>CONTINUE</Text>
              )}
            </Pressable>
          </View>

          {/* Sign In Link */}
          <View style={styles.signInPrompt}>
            <Text style={styles.signInPromptText}>
              Already have an account?{' '}
              <Text style={styles.signInLink} onPress={handleGoToSignIn}>
                Sign In
              </Text>
            </Text>
          </View>

          {social.any && (
            <>
              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Buttons */}
              <View style={styles.socialGroup}>
                {social.google && (
                  <Pressable
                    style={({ pressed }) => [styles.socialButton, pressed && styles.socialButtonPressed]}
                    onPress={() => social.signIn('google')}
                    disabled={!!social.busy}
                    accessibilityRole="button"
                    accessibilityLabel="Continue with Google"
                  >
                    {social.busy === 'google' ? (
                      <ActivityIndicator color={colors.text} />
                    ) : (
                      <>
                        {/* Google brand colour: a third-party mark, not a Zuri token. */}
                        {/* eslint-disable-next-line no-restricted-syntax */}
                        <Ionicons name="logo-google" size={20} color={'#EA4335'} />
                        <Text style={styles.socialButtonText}>Continue with Google</Text>
                      </>
                    )}
                  </Pressable>
                )}

                {social.apple && (
                  <Pressable
                    style={({ pressed }) => [styles.socialButton, pressed && styles.socialButtonPressed]}
                    onPress={() => social.signIn('apple')}
                    disabled={!!social.busy}
                    accessibilityRole="button"
                    accessibilityLabel="Continue with Apple"
                  >
                    {social.busy === 'apple' ? (
                      <ActivityIndicator color={colors.text} />
                    ) : (
                      <>
                        <Ionicons name="logo-apple" size={22} color={colors.text} />
                        <Text style={styles.socialButtonText}>Continue with Apple</Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            </>
          )}
        </KeyboardAwareScrollView>
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.surface,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: t.space[5],
  },
  backButton: {
    padding: 6,
    marginLeft: -6,
    borderRadius: t.radius.md,
  },
  backButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  headerTitle: { ...t.type['title-2'], color: t.colors.text,
    },
  headerSpacer: {
    width: 32,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: t.space[5],
    paddingTop: 16,
    paddingBottom: 32,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  headline: { ...t.type['title-1'], color: t.colors.text,
    marginBottom: 28,
    marginTop: 8,
  },
  formGroup: {
    gap: 16,
    width: '100%',
  },
  inputContainer: {
    position: 'relative',
    width: '100%',
  },
  input: { ...t.type.callout, width: '100%',
    height: 52,
    backgroundColor: t.colors['surface-sunken'],
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.md,
    paddingHorizontal: 16,
    color: t.colors.text,
  },
  inputWithIcon: {
    paddingRight: 48,
  },
  visibilityToggle: {
    position: 'absolute',
    right: 14,
    top: 16,
  },
  continueButton: {
    height: 56,
    marginTop: 8,
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.full,
    alignItems: 'center',
    justifyContent: 'center', boxShadow: t.shadows.card,},
  continueButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  continueButtonBusy: {
    opacity: 0.7,
  },
  formError: { ...t.type.footnote, color: t.colors.danger,
    marginTop: -4,
  },
  continueButtonText: { ...t.type.subhead, color: t.colors['on-primary'],
    letterSpacing: 1,
    },
  signInPrompt: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  signInPromptText: { ...t.type.callout, color: t.colors['text-muted'],
  },
  signInLink: {
    color: t.colors.text,
    fontFamily: t.type.subhead.fontFamily,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(195, 200, 194, 0.6)',
  },
  dividerText: { ...t.type.caption, color: t.colors['text-muted'],
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  socialGroup: {
    gap: 12,
    width: '100%',
  },
  socialButton: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors['surface-raised'],
  },
  socialButtonPressed: {
    backgroundColor: t.colors['surface-sunken'],
    transform: [{ scale: 0.99 }],
  },
  socialButtonText: { ...t.type.callout, color: t.colors.text,
    },
}));

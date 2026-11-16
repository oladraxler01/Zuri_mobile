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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriColors, ZuriFonts, ZuriSpacing } from '@/constants/zuri-theme';
import { useZuriFonts } from '@/hooks/use-zuri-fonts';
import { useAcademic } from '@/context/academic-context';
import { API_BASE } from '@/services/api-config';
import { register, setPendingSignIn, MIN_PASSWORD_LENGTH } from '@/services/auth-api';
import { isValidEmail } from '@/utils/validation';

export default function SignUpScreen() {
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
    setAcademicInfo({ studentName: fullName.trim(), email: cleanEmail });

    if (!API_BASE) {
      // No server configured (offline demo build): continue without an account.
      router.push({ pathname: '/onboarding/verify', params: { email: cleanEmail } } as any);
      return;
    }

    setBusy(true);
    try {
      const user = await register(cleanEmail, password);
      setPendingSignIn({ email: cleanEmail, password, userId: user.id });
      router.push({ pathname: '/onboarding/verify', params: { email: cleanEmail, userId: user.id } } as any);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'We couldn’t create your account. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleGoToSignIn = () => {
    router.replace('/onboarding/sign-in' as Href);
  };

  const handleSocialSignUp = (provider: 'Google' | 'Apple') => {
    Alert.alert(`${provider} sign-up is coming soon`, 'For now, create your account with your email address.');
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
          <Ionicons name="arrow-back" size={24} color={ZuriColors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Zuri</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
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
                placeholderTextColor={ZuriColors.onSurfaceVariant}
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
                placeholderTextColor={ZuriColors.onSurfaceVariant}
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
                placeholderTextColor={ZuriColors.onSurfaceVariant}
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
                  color={ZuriColors.onSurfaceVariant}
                />
              </Pressable>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                placeholder="Confirm Password"
                placeholderTextColor={ZuriColors.onSurfaceVariant}
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
                  color={ZuriColors.onSurfaceVariant}
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
                <ActivityIndicator color={ZuriColors.onPrimary} />
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

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialGroup}>
            <Pressable
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.socialButtonPressed,
              ]}
              onPress={() => handleSocialSignUp('Google')}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              <Ionicons name="logo-google" size={20} color="#EA4335" />
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.socialButtonPressed,
              ]}
              onPress={() => handleSocialSignUp('Apple')}
              accessibilityRole="button"
              accessibilityLabel="Continue with Apple"
            >
              <Ionicons name="logo-apple" size={22} color={ZuriColors.primary} />
              <Text style={styles.socialButtonText}>Continue with Apple</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ZuriColors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ZuriSpacing.containerPaddingH,
  },
  backButton: {
    padding: 6,
    marginLeft: -6,
    borderRadius: 8,
  },
  backButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  headerTitle: {
    fontFamily: ZuriFonts.headlineMd,
    fontSize: 22,
    color: ZuriColors.primary,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 32,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: ZuriSpacing.containerPaddingH,
    paddingTop: 16,
    paddingBottom: 32,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  headline: {
    fontFamily: ZuriFonts.headlineLgMobile,
    fontSize: 28,
    lineHeight: 34,
    color: ZuriColors.primary,
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
  input: {
    width: '100%',
    height: 52,
    backgroundColor: '#F5F3EF',
    borderWidth: 1,
    borderColor: '#E0DDD8',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: ZuriFonts.bodyLg,
    fontSize: 15,
    color: ZuriColors.onSurface,
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
    backgroundColor: ZuriColors.primaryContainer,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ZuriColors.primaryContainer,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  continueButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  continueButtonBusy: {
    opacity: 0.7,
  },
  formError: {
    fontFamily: ZuriFonts.bodyMd,
    fontSize: 13,
    color: '#ba1a1a',
    marginTop: -4,
  },
  continueButtonText: {
    fontFamily: ZuriFonts.labelSmBold,
    fontSize: 14,
    color: ZuriColors.onPrimary,
    letterSpacing: 1,
    fontWeight: '600',
  },
  signInPrompt: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  signInPromptText: {
    fontFamily: ZuriFonts.bodyMd,
    fontSize: 14,
    color: ZuriColors.onSurfaceVariant,
  },
  signInLink: {
    color: ZuriColors.primaryContainer,
    fontFamily: ZuriFonts.bodyMdMedium,
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
  dividerText: {
    fontFamily: ZuriFonts.bodyMd,
    fontSize: 12,
    color: ZuriColors.onSurfaceVariant,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ZuriColors.outlineVariant,
    backgroundColor: ZuriColors.surfaceContainerLowest,
  },
  socialButtonPressed: {
    backgroundColor: ZuriColors.surfaceContainerLow,
    transform: [{ scale: 0.99 }],
  },
  socialButtonText: {
    fontFamily: ZuriFonts.bodyLg,
    fontSize: 15,
    color: ZuriColors.onSurface,
    fontWeight: '500',
  },
});

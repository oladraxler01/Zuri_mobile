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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriColors, ZuriFonts, ZuriSpacing } from '@/constants/zuri-theme';
import { useZuriFonts } from '@/hooks/use-zuri-fonts';

export default function SignInScreen() {
  const router = useRouter();
  const [fontsLoaded] = useZuriFonts();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

  const handleSignIn = () => {
    router.push({
      pathname: '/onboarding/verify',
      params: { email: email.trim() || 'j***@university.edu' },
    } as any);
  };

  const handleGoToSignUp = () => {
    router.replace('/onboarding/sign-up' as Href);
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Reset Password',
      'Password reset instructions will be sent to your registered email address.'
    );
  };

  const handleSocialSignIn = (provider: 'Google' | 'Apple') => {
    router.push({
      pathname: '/onboarding/verify',
      params: { email: `${provider.toLowerCase()}user@university.edu` },
    } as any);
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
          {/* Heading Group */}
          <View style={styles.headingGroup}>
            <Text style={styles.headline}>Welcome back.</Text>
            <Text style={styles.subtitle}>Sign in to continue to your library.</Text>
          </View>

          {/* Form Group */}
          <View style={styles.formGroup}>
            {/* Email Address */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
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
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.input, styles.inputWithIcon]}
                  placeholder="••••••••"
                  placeholderTextColor={ZuriColors.onSurfaceVariant}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
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
            </View>

            {/* Forgot Password Link */}
            <Pressable
              style={styles.forgotPasswordContainer}
              onPress={handleForgotPassword}
              hitSlop={8}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </Pressable>

            {/* Sign In Button */}
            <Pressable
              style={({ pressed }) => [
                styles.signInButton,
                pressed && styles.signInButtonPressed,
              ]}
              onPress={handleSignIn}
              accessibilityRole="button"
              accessibilityLabel="Sign In"
            >
              <Text style={styles.signInButtonText}>Sign In</Text>
            </Pressable>
          </View>

          {/* Create Account Link */}
          <View style={styles.signUpPrompt}>
            <Text style={styles.signUpPromptText}>
              Don't have an account?{' '}
              <Text style={styles.signUpLink} onPress={handleGoToSignUp}>
                Create Account
              </Text>
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialGroup}>
            <Pressable
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.socialButtonPressed,
              ]}
              onPress={() => handleSocialSignIn('Google')}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              <Ionicons name="logo-google" size={20} color="#EA4335" />
              <Text style={styles.socialButtonText}>Google</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.socialButtonPressed,
              ]}
              onPress={() => handleSocialSignIn('Apple')}
              accessibilityRole="button"
              accessibilityLabel="Continue with Apple"
            >
              <Ionicons name="logo-apple" size={22} color={ZuriColors.primary} />
              <Text style={styles.socialButtonText}>Apple</Text>
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
  headingGroup: {
    gap: 8,
    marginBottom: 32,
    marginTop: 8,
  },
  headline: {
    fontFamily: ZuriFonts.headlineLgMobile,
    fontSize: 28,
    lineHeight: 34,
    color: ZuriColors.primary,
  },
  subtitle: {
    fontFamily: ZuriFonts.bodyMd,
    fontSize: 14,
    lineHeight: 20,
    color: ZuriColors.onSurfaceVariant,
  },
  formGroup: {
    gap: 18,
    width: '100%',
  },
  fieldBlock: {
    gap: 6,
    width: '100%',
  },
  fieldLabel: {
    fontFamily: ZuriFonts.labelSm,
    fontSize: 13,
    color: '#8A8A8A',
    marginLeft: 4,
  },
  passwordInputContainer: {
    position: 'relative',
    width: '100%',
  },
  input: {
    width: '100%',
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
  inputWithIcon: {
    paddingRight: 48,
  },
  visibilityToggle: {
    position: 'absolute',
    right: 14,
    top: 16,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: -6,
  },
  forgotPasswordText: {
    fontFamily: ZuriFonts.labelSm,
    fontSize: 13,
    color: ZuriColors.primary,
    textDecorationLine: 'underline',
  },
  signInButton: {
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
  signInButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  signInButtonText: {
    fontFamily: ZuriFonts.labelSmBold,
    fontSize: 15,
    color: ZuriColors.onPrimary,
    fontWeight: '600',
  },
  signUpPrompt: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 28,
  },
  signUpPromptText: {
    fontFamily: ZuriFonts.bodyMd,
    fontSize: 14,
    color: ZuriColors.onSurfaceVariant,
  },
  signUpLink: {
    color: ZuriColors.primary,
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
    backgroundColor: ZuriColors.surfaceContainerHigh,
  },
  dividerText: {
    fontFamily: ZuriFonts.labelSm,
    fontSize: 11,
    color: ZuriColors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  socialGroup: {
    gap: 12,
    width: '100%',
  },
  socialButton: {
    height: 54,
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
    fontFamily: ZuriFonts.labelSm,
    fontSize: 14,
    color: ZuriColors.onSurface,
    fontWeight: '500',
  },
});

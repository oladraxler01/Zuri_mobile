import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
  type TextInputInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriColors, ZuriFonts, ZuriSpacing } from '@/constants/zuri-theme';
import { useZuriFonts } from '@/hooks/use-zuri-fonts';
import { verifyEmail, resendVerification, login, getPendingSignIn, setPendingSignIn } from '@/services/auth-api';
import { useSession, ROLE_HOME } from '@/context/session-context';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; userId?: string }>();
  const [fontsLoaded] = useZuriFonts();
  const { role } = useSession();
  const [busy, setBusy] = useState(false);

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [resendTimer, setResendTimer] = useState<number>(45);
  const [canResend, setCanResend] = useState<boolean>(false);

  const inputsRef = useRef<(TextInputInstance | null)[]>([]);

  // Mask email for display
  const displayEmail = params.email
    ? maskEmail(params.email)
    : 'j***@university.edu';

  function maskEmail(email: string) {
    const parts = email.split('@');
    if (parts.length < 2) return email;
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}***`;
    return `${maskedName}@${domain}`;
  }

  // Resend Countdown
  useEffect(() => {
    if (resendTimer <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleOtpChange = (value: string, index: number) => {
    // If user pastes full 6 digit string
    if (value.length > 1) {
      const cleaned = value.replace(/[^0-9]/g, '').slice(0, 6);
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = cleaned[i] || '';
      }
      setOtp(newOtp);
      const nextIndex = Math.min(cleaned.length, 5);
      inputsRef.current[nextIndex]?.focus();
      return;
    }

    const cleaned = value.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = cleaned;
    setOtp(newOtp);

    // Auto advance if digit entered
    if (cleaned && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setResendTimer(45);
    setCanResend(false);
    if (params.email) {
      try {
        await resendVerification(params.email);
      } catch (e) {
        setCanResend(true);
        setResendTimer(0);
        Alert.alert('Couldn’t send a new code', e instanceof Error ? e.message : 'Please try again.');
        return;
      }
    }
    setOtp(['', '', '', '', '', '']);
    setCodeError('');
    Alert.alert('Code Resent', `A fresh 6-digit code was sent to ${displayEmail}`);
  };

  const codeComplete = otp.every((d) => /^\d$/.test(d));
  const [codeError, setCodeError] = useState('');

  const handleVerify = async () => {
    if (busy) return;
    if (!codeComplete) {
      setCodeError('Enter all 6 digits from the email we sent you.');
      return;
    }
    setCodeError('');

    const pending = getPendingSignIn();
    const userId = params.userId || pending?.userId;
    if (!userId) {
      setCodeError('Something went wrong. Please sign in again to get a new code.');
      return;
    }

    setBusy(true);
    try {
      await verifyEmail(userId, otp.join(''));
    } catch (e) {
      setBusy(false);
      setCodeError(e instanceof Error ? e.message : 'We couldn’t verify that code. Please try again.');
      return;
    }

    // Verified. Sign in with the details from the previous screen (kept in memory only).
    try {
      if (!pending) throw new Error('no-credentials');
      const result = await login(pending.email, pending.password);
      if (result.status !== 'signed-in') throw new Error('not-signed-in');
      setPendingSignIn(null);
      router.replace((role ? ROLE_HOME[role] : '/onboarding/institution') as Href);
    } catch {
      Alert.alert('Email verified', 'Your email is confirmed. Please sign in to continue.');
      router.replace('/onboarding/sign-in' as Href);
    } finally {
      setBusy(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/onboarding/welcome' as Href);
    }
  };

  if (!fontsLoaded) {
    return <View style={styles.container} />;
  }

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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
        <View style={styles.content}>
          {/* Header Group */}
          <View style={styles.headerGroup}>
            <Text style={styles.headline}>Verify your email</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit code to{' '}
              <Text style={styles.emailHighlight}>{displayEmail}</Text>
            </Text>
          </View>

          {/* OTP Input Row */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => {
              const isFocused = focusedIndex === index;
              return (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputsRef.current[index] = ref;
                  }}
                  style={[
                    styles.otpBox,
                    isFocused && styles.otpBoxFocused,
                    digit ? styles.otpBoxFilled : null,
                  ]}
                  value={digit}
                  onChangeText={(val) => handleOtpChange(val, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  onFocus={() => setFocusedIndex(index)}
                  keyboardType="number-pad"
                  maxLength={index === 0 ? 6 : 1}
                  selectTextOnFocus
                  textAlign="center"
                  accessibilityLabel={`Digit ${index + 1}`}
                />
              );
            })}
          </View>

          {/* Bottom Actions */}
          <View style={styles.bottomActions}>
            {/* Verify Button */}
            <Pressable
              style={({ pressed }) => [
                styles.verifyButton,
                pressed && styles.verifyButtonPressed,
              ]}
              onPress={handleVerify}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Verify"
              accessibilityState={{ busy, disabled: busy }}
            >
              {busy ? (
                <ActivityIndicator color={ZuriColors.onPrimary} />
              ) : (
                <Text style={styles.verifyButtonText}>Verify</Text>
              )}
            </Pressable>
            {!!codeError && <Text style={{ color: '#ba1a1a', fontSize: 13, textAlign: 'center', marginTop: 10 }}>{codeError}</Text>}

            {/* Resend Code Section */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendQuestion}>Didn't receive a code?</Text>
              {canResend ? (
                <Pressable onPress={handleResend} hitSlop={8}>
                  <Text style={styles.resendActive}>Resend Code</Text>
                </Pressable>
              ) : (
                <Text style={styles.resendDisabled}>
                  Resend in {formatTimer(resendTimer)}
                </Text>
              )}
            </View>
          </View>
        </View>
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(228, 226, 225, 0.4)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    marginLeft: -8,
  },
  backButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  headerTitle: {
    fontFamily: ZuriFonts.headlineMd,
    fontSize: 22,
    color: ZuriColors.primary,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 40,
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: ZuriSpacing.containerPaddingH,
    paddingTop: 32,
    paddingBottom: 32,
    justifyContent: 'space-between',
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  headerGroup: {
    gap: 8,
    marginBottom: 32,
  },
  headline: {
    fontFamily: ZuriFonts.headlineLgMobile,
    fontSize: 28,
    lineHeight: 34,
    color: ZuriColors.primary,
  },
  subtitle: {
    fontFamily: ZuriFonts.bodyLg,
    fontSize: 16,
    lineHeight: 24,
    color: ZuriColors.onSurfaceVariant,
  },
  emailHighlight: {
    color: ZuriColors.primary,
    fontFamily: ZuriFonts.bodyMdMedium,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
    marginBottom: 'auto',
    paddingTop: 8,
  },
  otpBox: {
    flex: 1,
    maxWidth: 52,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F5F3EF',
    borderWidth: 1.5,
    borderColor: ZuriColors.outlineVariant,
    fontFamily: ZuriFonts.headlineMd,
    fontSize: 22,
    color: ZuriColors.primary,
    fontWeight: '600',
  },
  otpBoxFocused: {
    borderColor: ZuriColors.primary,
    backgroundColor: ZuriColors.surfaceContainerLowest,
    shadowColor: ZuriColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  otpBoxFilled: {
    borderColor: ZuriColors.primaryContainer,
  },
  bottomActions: {
    gap: 20,
    width: '100%',
    paddingBottom: 8,
  },
  verifyButton: {
    width: '100%',
    height: 56,
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
  verifyButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  verifyButtonText: {
    fontFamily: ZuriFonts.labelSmBold,
    fontSize: 15,
    color: ZuriColors.onPrimary,
    letterSpacing: 0.5,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  resendQuestion: {
    fontFamily: ZuriFonts.bodyMd,
    fontSize: 14,
    color: ZuriColors.onSurfaceVariant,
  },
  resendDisabled: {
    fontFamily: ZuriFonts.bodyMdMedium,
    fontSize: 14,
    color: ZuriColors.onSurfaceVariant,
    opacity: 0.6,
  },
  resendActive: {
    fontFamily: ZuriFonts.bodyMdMedium,
    fontSize: 14,
    color: ZuriColors.primaryContainer,
    textDecorationLine: 'underline',
  },
});

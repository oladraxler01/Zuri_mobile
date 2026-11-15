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
  type TextInputInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiColors, LexiFonts, LexiSpacing } from '@/constants/lexi-theme';
import { useLexiFonts } from '@/hooks/use-lexi-fonts';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [fontsLoaded] = useLexiFonts();

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

  const handleResend = () => {
    if (!canResend) return;
    setResendTimer(45);
    setCanResend(false);
    Alert.alert('Code Resent', `A fresh 6-digit code was sent to ${displayEmail}`);
  };

  const handleVerify = () => {
    router.push('/onboarding/institution' as Href);
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
          <Ionicons name="arrow-back" size={24} color={LexiColors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Lexi</Text>
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
              accessibilityRole="button"
              accessibilityLabel="Verify"
            >
              <Text style={styles.verifyButtonText}>Verify</Text>
            </Pressable>

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
    backgroundColor: LexiColors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LexiSpacing.containerPaddingH,
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
    fontFamily: LexiFonts.headlineMd,
    fontSize: 22,
    color: LexiColors.primary,
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
    paddingHorizontal: LexiSpacing.containerPaddingH,
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
    fontFamily: LexiFonts.headlineLgMobile,
    fontSize: 28,
    lineHeight: 34,
    color: LexiColors.primary,
  },
  subtitle: {
    fontFamily: LexiFonts.bodyLg,
    fontSize: 16,
    lineHeight: 24,
    color: LexiColors.onSurfaceVariant,
  },
  emailHighlight: {
    color: LexiColors.primary,
    fontFamily: LexiFonts.bodyMdMedium,
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
    borderColor: LexiColors.outlineVariant,
    fontFamily: LexiFonts.headlineMd,
    fontSize: 22,
    color: LexiColors.primary,
    fontWeight: '600',
  },
  otpBoxFocused: {
    borderColor: LexiColors.primary,
    backgroundColor: LexiColors.surfaceContainerLowest,
    shadowColor: LexiColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  otpBoxFilled: {
    borderColor: LexiColors.primaryContainer,
  },
  bottomActions: {
    gap: 20,
    width: '100%',
    paddingBottom: 8,
  },
  verifyButton: {
    width: '100%',
    height: 56,
    backgroundColor: LexiColors.primaryContainer,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: LexiColors.primaryContainer,
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
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 15,
    color: LexiColors.onPrimary,
    letterSpacing: 0.5,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  resendQuestion: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 14,
    color: LexiColors.onSurfaceVariant,
  },
  resendDisabled: {
    fontFamily: LexiFonts.bodyMdMedium,
    fontSize: 14,
    color: LexiColors.onSurfaceVariant,
    opacity: 0.6,
  },
  resendActive: {
    fontFamily: LexiFonts.bodyMdMedium,
    fontSize: 14,
    color: LexiColors.primaryContainer,
    textDecorationLine: 'underline',
  },
});

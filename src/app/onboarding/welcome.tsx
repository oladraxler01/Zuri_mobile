import { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LexiColors, LexiFonts, LexiSpacing } from '@/constants/lexi-theme';
import { useLexiFonts } from '@/hooks/use-lexi-fonts';

export default function WelcomeScreen() {
  const router = useRouter();
  const [fontsLoaded] = useLexiFonts();

  // Entrance animations
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(16);
  const actionsOpacity = useSharedValue(0);
  const actionsTranslateY = useSharedValue(16);

  useEffect(() => {
    if (!fontsLoaded) return;

    contentOpacity.value = withDelay(
      80,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) })
    );
    contentTranslateY.value = withDelay(
      80,
      withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) })
    );

    actionsOpacity.value = withDelay(
      280,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
    actionsTranslateY.value = withDelay(
      280,
      withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
  }, [fontsLoaded]);

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const animatedActionsStyle = useAnimatedStyle(() => ({
    opacity: actionsOpacity.value,
    transform: [{ translateY: actionsTranslateY.value }],
  }));

  const handleCreateAccount = () => {
    router.push('/onboarding/sign-up' as Href);
  };

  const handleSignIn = () => {
    router.push('/onboarding/sign-in' as Href);
  };

  const handleTerms = () => {
    Linking.openURL('https://example.com/terms').catch(() => {
      Alert.alert('Terms of Service', 'Terms of Service details will be available soon.');
    });
  };

  const handlePrivacy = () => {
    Linking.openURL('https://example.com/privacy').catch(() => {
      Alert.alert('Privacy Policy', 'Privacy Policy details will be available soon.');
    });
  };

  if (!fontsLoaded) {
    return <View style={styles.container} />;
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.innerWrapper}>
        {/* Top Section: Hero Image & Heading */}
        <Animated.View style={[styles.topSection, animatedContentStyle]}>
          {/* Glass Card Container for Academic Hero Illustration */}
          <View style={styles.heroCard}>
            <Image
              source={require('../../../assets/images/welcome-hero.jpg')}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <View style={styles.cardOverlay} pointerEvents="none" />
          </View>

          {/* Typography Content */}
          <View style={styles.textBlock}>
            <Text style={styles.headline}>Welcome to Lexi.</Text>
            <Text style={styles.bodyText}>
              Your proactive academic companion. Stay ahead with smart insights, lecture tools, and personalized guidance.
            </Text>
          </View>
        </Animated.View>

        {/* Bottom Section: Action Buttons & Legal Disclaimer */}
        <Animated.View style={[styles.bottomSection, animatedActionsStyle]}>
          <View style={styles.buttonsGroup}>
            {/* Create Account (Primary) */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
              onPress={handleCreateAccount}
              accessibilityRole="button"
              accessibilityLabel="Create Account"
            >
              <Text style={styles.primaryButtonText}>Create Account</Text>
            </Pressable>

            {/* Sign In (Secondary Outlined) */}
            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.secondaryButtonPressed,
              ]}
              onPress={handleSignIn}
              accessibilityRole="button"
              accessibilityLabel="Sign In"
            >
              <Text style={styles.secondaryButtonText}>Sign In</Text>
            </Pressable>
          </View>

          {/* Legal / Terms */}
          <View style={styles.legalContainer}>
            <Text style={styles.legalText}>
              By continuing, you agree to our{' '}
              <Text style={styles.legalLink} onPress={handleTerms}>
                Terms
              </Text>
              {' & '}
              <Text style={styles.legalLink} onPress={handlePrivacy}>
                Privacy Policy
              </Text>
            </Text>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LexiColors.background,
  },
  innerWrapper: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: LexiSpacing.containerPaddingH,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },

  // Top Section
  topSection: {
    paddingTop: 16,
    flex: 1,
    justifyContent: 'flex-start',
  },
  heroCard: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(251, 249, 248, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(115, 120, 115, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 28,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 224, 136, 0.04)',
  },

  // Typography
  textBlock: {
    gap: 12,
  },
  headline: {
    fontFamily: LexiFonts.headlineLgMobile,
    fontSize: 32,
    lineHeight: 38,
    color: LexiColors.primary,
    letterSpacing: -0.5,
  },
  bodyText: {
    fontFamily: LexiFonts.bodyLg,
    fontSize: 16,
    lineHeight: 25,
    color: LexiColors.onSurfaceVariant,
    maxWidth: 290,
  },

  // Bottom Section
  bottomSection: {
    paddingBottom: 24,
    paddingTop: 16,
    gap: 18,
  },
  buttonsGroup: {
    gap: 12,
    width: '100%',
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: LexiColors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: LexiColors.primaryContainer,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  primaryButtonText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 15,
    color: LexiColors.onPrimary,
    letterSpacing: 0.2,
  },
  secondaryButton: {
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: LexiColors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonPressed: {
    backgroundColor: LexiColors.surfaceContainerLow,
    transform: [{ scale: 0.985 }],
  },
  secondaryButtonText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 15,
    color: LexiColors.primaryContainer,
    letterSpacing: 0.2,
  },

  // Legal
  legalContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  legalText: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(67, 72, 68, 0.75)',
    textAlign: 'center',
  },
  legalLink: {
    textDecorationLine: 'underline',
    color: LexiColors.primary,
    fontFamily: LexiFonts.bodyMdMedium,
  },
});

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
import { useZuriFonts } from '@/hooks/use-zuri-fonts';
import { makeStyles } from '@/theme';

export default function WelcomeScreen() {
  const styles = useStyles();
  const router = useRouter();
  const [fontsLoaded] = useZuriFonts();

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
            <Text style={styles.headline}>Welcome to Zuri.</Text>
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

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.surface,
  },
  innerWrapper: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: t.space[5],
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
    borderRadius: t.radius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(251, 249, 248, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(115, 120, 115, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28, boxShadow: t.shadows.raised,},
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
  headline: { ...t.type.display, color: t.colors.text,
    letterSpacing: -0.5,
  },
  bodyText: { ...t.type.body, color: t.colors['text-muted'],
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
    borderRadius: t.radius.full,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
    justifyContent: 'center', boxShadow: t.shadows.card,},
  primaryButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  primaryButtonText: { ...t.type.subhead, color: t.colors['on-primary'],
    letterSpacing: 0.2,
  },
  secondaryButton: {
    minHeight: 56,
    borderRadius: t.radius.md,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: t.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonPressed: {
    backgroundColor: t.colors['surface-sunken'],
    transform: [{ scale: 0.985 }],
  },
  secondaryButtonText: { ...t.type.subhead, color: t.colors.text,
    letterSpacing: 0.2,
  },

  // Legal
  legalContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  legalText: { ...t.type.caption, color: 'rgba(67, 72, 68, 0.75)',
    textAlign: 'center',
  },
  legalLink: {
    textDecorationLine: 'underline',
    color: t.colors.text,
    fontFamily: t.type.subhead.fontFamily,
  },
}));

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LexiColors, LexiFonts, LexiSpacing, LexiRadius } from '@/constants/lexi-theme';
import { useLexiFonts } from '@/hooks/use-lexi-fonts';
import { AnimatedIcon } from '@/components/animated-icon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TAGLINES = [
  'Your Academic Intelligence',
  'Learn Smarter, Not Harder',
  'Insights Before You Ask',
  'Your Campus Companion',
  'Knowledge, Amplified',
];

const FEATURES = [
  {
    icon: 'school-outline' as const,
    title: 'Academic Intelligence',
    subtitle: 'AI-driven answers for your courses',
  },
  {
    icon: 'document-text-outline' as const,
    title: 'Instant Summaries',
    subtitle: 'Turn lectures into quick study guides',
  },
  {
    icon: 'sparkles-outline' as const,
    title: 'Smart Study Planner',
    subtitle: 'Automated schedules tailored for you',
  },
];

const TAGLINE_DURATION = 2400;

export default function OnboardingSplashScreen() {
  const router = useRouter();
  const [fontsLoaded] = useLexiFonts();
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [taglineFading, setTaglineFading] = useState(false);

  // Animations
  const heroOpacity = useSharedValue(0);
  const heroScale = useSharedValue(0.92);
  const heroTranslateY = useSharedValue(20);
  const card1TranslateY = useSharedValue(30);
  const card2TranslateY = useSharedValue(30);
  const card3TranslateY = useSharedValue(30);
  const cardOpacity = useSharedValue(0);
  const orb1Scale = useSharedValue(1);
  const orb2Scale = useSharedValue(1);

  useEffect(() => {
    if (!fontsLoaded) return;

    // Entrance animations
    heroOpacity.value = withDelay(100, withTiming(1, { duration: 800 }));
    heroScale.value = withDelay(
      100,
      withTiming(1, { duration: 1000, easing: Easing.out(Easing.back(1.2)) })
    );
    heroTranslateY.value = withDelay(
      100,
      withTiming(0, { duration: 1000, easing: Easing.out(Easing.cubic) })
    );

    // Feature Cards Staggered entrance
    cardOpacity.value = withDelay(400, withTiming(1, { duration: 800 }));
    card1TranslateY.value = withDelay(
      500,
      withTiming(0, { duration: 700, easing: Easing.out(Easing.quad) })
    );
    card2TranslateY.value = withDelay(
      650,
      withTiming(0, { duration: 700, easing: Easing.out(Easing.quad) })
    );
    card3TranslateY.value = withDelay(
      800,
      withTiming(0, { duration: 700, easing: Easing.out(Easing.quad) })
    );

    // Ambient floating background orbs
    orb1Scale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 4000, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    orb2Scale.value = withRepeat(
      withSequence(
        withTiming(1.22, { duration: 5000, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [fontsLoaded]);

  // Tagline rotation
  useEffect(() => {
    if (!fontsLoaded) return;

    const interval = setInterval(() => {
      setTaglineFading(true);
      setTimeout(() => {
        setTaglineIndex((prev) => (prev + 1) % TAGLINES.length);
        setTaglineFading(false);
      }, 350);
    }, TAGLINE_DURATION);

    return () => clearInterval(interval);
  }, [fontsLoaded]);

  const heroAnimatedStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [
      { scale: heroScale.value },
      { translateY: heroTranslateY.value },
    ],
  }));

  const card1Style = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: card1TranslateY.value }],
  }));

  const card2Style = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: card2TranslateY.value }],
  }));

  const card3Style = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: card3TranslateY.value }],
  }));

  const orb1Style = useAnimatedStyle(() => ({
    transform: [{ scale: orb1Scale.value }],
  }));

  const orb2Style = useAnimatedStyle(() => ({
    transform: [{ scale: orb2Scale.value }],
  }));

  if (!fontsLoaded) {
    return <View style={styles.container} />;
  }

  const handleGetStarted = () => {
    router.push('/onboarding/welcome' as Href);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={LexiColors.surfaceContainerLowest} />

      {/* Decorative Ambient Floating Orbs */}
      <Animated.View style={[styles.ambientOrb1, orb1Style]} />
      <Animated.View style={[styles.ambientOrb2, orb2Style]} />

      <View style={styles.content}>
        {/* Top Chip Badge */}
        <Animated.View style={[styles.topBadge, heroAnimatedStyle]}>
          <Ionicons name="sparkles" size={14} color={LexiColors.tertiary} />
          <Text style={styles.topBadgeText}>NEXT-GEN CAMPUS ASSISTANT</Text>
        </Animated.View>

        {/* Center Hero Section */}
        <Animated.View style={[styles.heroContainer, heroAnimatedStyle]}>
          <View style={styles.iconWrapper}>
            <AnimatedIcon />
          </View>

          <Text style={styles.brandTitle}>Lexi</Text>

          <View style={styles.taglineWrapper}>
            <Text
              style={[
                styles.taglineText,
                { opacity: taglineFading ? 0 : 0.85 },
              ]}
            >
              {TAGLINES[taglineIndex]}
            </Text>
          </View>
        </Animated.View>

        {/* Creative Feature Highlights */}
        <View style={styles.featuresContainer}>
          <Animated.View style={[styles.featureCard, card1Style]}>
            <View style={styles.featureIconBox}>
              <Ionicons name={FEATURES[0].icon} size={20} color={LexiColors.primaryContainer} />
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>{FEATURES[0].title}</Text>
              <Text style={styles.featureSubtitle}>{FEATURES[0].subtitle}</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.featureCard, card2Style]}>
            <View style={styles.featureIconBox}>
              <Ionicons name={FEATURES[1].icon} size={20} color={LexiColors.primaryContainer} />
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>{FEATURES[1].title}</Text>
              <Text style={styles.featureSubtitle}>{FEATURES[1].subtitle}</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.featureCard, card3Style]}>
            <View style={styles.featureIconBox}>
              <Ionicons name={FEATURES[2].icon} size={20} color={LexiColors.primaryContainer} />
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>{FEATURES[2].title}</Text>
              <Text style={styles.featureSubtitle}>{FEATURES[2].subtitle}</Text>
            </View>
          </Animated.View>
        </View>

        {/* Primary Action Button Footer */}
        <Animated.View style={[styles.footerContainer, heroAnimatedStyle]}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            onPress={handleGetStarted}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LexiColors.surfaceContainerLowest,
    overflow: 'hidden',
  },

  // Ambient floating background blur circles
  ambientOrb1: {
    position: 'absolute',
    top: -60,
    right: -50,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(203, 167, 47, 0.12)', // gold accent glow
  },
  ambientOrb2: {
    position: 'absolute',
    bottom: -80,
    left: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(44, 57, 48, 0.07)', // dark green tint glow
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LexiSpacing.md,
    paddingTop: 64,
    paddingBottom: 48,
  },

  // Top Badge
  topBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: LexiRadius.full,
    backgroundColor: LexiColors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(203, 167, 47, 0.25)',
  },
  topBadgeText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: LexiColors.primaryContainer,
  },

  // Hero Section
  heroContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  iconWrapper: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontFamily: LexiFonts.headlineLg,
    fontSize: 44,
    color: LexiColors.primaryContainer,
    letterSpacing: -1.2,
  },
  taglineWrapper: {
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  taglineText: {
    fontFamily: LexiFonts.bodyLg,
    fontSize: 16,
    color: LexiColors.onSurfaceVariant,
    textAlign: 'center',
  },

  // Features Cards Stack
  featuresContainer: {
    width: '100%',
    maxWidth: 380,
    gap: 12,
    marginVertical: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: LexiRadius.xl,
    backgroundColor: LexiColors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(225, 223, 220, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  featureIconBox: {
    width: 42,
    height: 42,
    borderRadius: LexiRadius.lg,
    backgroundColor: LexiColors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(203, 167, 47, 0.2)',
  },
  featureTextBox: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 15,
    color: LexiColors.primaryContainer,
    marginBottom: 2,
  },
  featureSubtitle: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 13,
    color: LexiColors.onSurfaceVariant,
  },

  // Footer Button
  footerContainer: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    height: 54,
    borderRadius: LexiRadius.full,
    backgroundColor: LexiColors.primaryContainer,
    shadowColor: LexiColors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
});

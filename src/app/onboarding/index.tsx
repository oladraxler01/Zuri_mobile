import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
  withSpring,
  withRepeat,
  withDelay,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LexiFonts } from '@/constants/lexi-theme';
import { useLexiFonts } from '@/hooks/use-lexi-fonts';

/**
 * Launch splash: kinetic typography on deep forest green.
 * Motion sequence (≈2.2s), then a calm idle loop:
 *   gold rule draws → orbit rings open → "Lexi" letters rise from a mask →
 *   gold full stop drops in → tagline words reveal → ticker + button arrive.
 */

const { width: SCREEN_W } = Dimensions.get('window');

const INK = '#17231b'; // primary
const INK_SOFT = '#2c3930'; // primaryContainer
const CREAM = '#fbf9f8';
const GOLD = '#e9c349'; // tertiaryFixedDim
const GOLD_DEEP = '#cba72f';
const MUTED = 'rgba(251, 249, 248, 0.62)';

const LETTERS = ['L', 'e', 'x', 'i'];
const TAGLINE = ['Every', 'lecture.', 'Every', 'class.', 'In', 'focus.'];
const TICKER = ['LECTURES', 'NOTES', 'TIMETABLE', 'COURSES', 'EXAMS', 'RESEARCH', 'DEADLINES'];

const T = {
  rule: 0,
  rings: 250,
  letters: 450,
  letterStagger: 85,
  stop: 950,
  tagline: 1150,
  wordStagger: 70,
  ticker: 1500,
  button: 1700,
};

export default function OnboardingSplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useLexiFonts();
  const reduceMotion = useReducedMotion();

  // Shared timeline values
  const rule = useSharedValue(0);
  const rings = useSharedValue(0);
  const spin = useSharedValue(0);
  const drift = useSharedValue(0);
  const stop = useSharedValue(0);
  const ticker = useSharedValue(0);
  const button = useSharedValue(0);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (!fontsLoaded) return;

    if (reduceMotion) {
      rule.value = 1;
      rings.value = 1;
      stop.value = 1;
      ticker.value = 1;
      button.value = 1;
      return;
    }

    const outExpo = Easing.bezier(0.16, 1, 0.3, 1);

    rule.value = withDelay(T.rule, withTiming(1, { duration: 900, easing: outExpo }));
    rings.value = withDelay(T.rings, withTiming(1, { duration: 1400, easing: outExpo }));
    spin.value = withRepeat(withTiming(1, { duration: 24000, easing: Easing.linear }), -1, false);
    drift.value = withRepeat(
      withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    stop.value = withDelay(T.stop, withSpring(1, { damping: 9, stiffness: 180, mass: 0.6 }));
    ticker.value = withDelay(T.ticker, withTiming(1, { duration: 700 }));
    button.value = withDelay(T.button, withTiming(1, { duration: 800, easing: outExpo }));
    shimmer.value = withDelay(
      T.button + 900,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
          withDelay(2600, withTiming(0, { duration: 0 }))
        ),
        -1,
        false
      )
    );
  }, [fontsLoaded, reduceMotion]);

  // ─── Animated styles ───────────────────────────────────────────
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(rings.value, [0, 1], [0, 1]),
    transform: [
      { translateX: interpolate(drift.value, [0, 1], [-40, 40]) },
      { translateY: interpolate(drift.value, [0, 1], [-20, 30]) },
      { scale: interpolate(drift.value, [0, 1], [1, 1.15]) },
    ],
  }));

  const ringOuter = useAnimatedStyle(() => ({
    opacity: rings.value * 0.9,
    transform: [
      { scale: interpolate(rings.value, [0, 1], [0.6, 1]) },
      { rotate: `${spin.value * 360}deg` },
    ],
  }));
  const ringMid = useAnimatedStyle(() => ({
    opacity: rings.value * 0.7,
    transform: [
      { scale: interpolate(rings.value, [0, 1], [0.4, 1]) },
      { rotate: `${-spin.value * 540 + 60}deg` },
    ],
  }));
  const ringInner = useAnimatedStyle(() => ({
    opacity: rings.value * 0.5,
    transform: [
      { scale: interpolate(rings.value, [0, 1], [0.2, 1]) },
      { rotate: `${spin.value * 900 + 140}deg` },
    ],
  }));

  const ruleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(rule.value, [0, 0.1, 1], [0, 1, 1]),
    transform: [{ scaleX: rule.value }],
  }));

  const stopStyle = useAnimatedStyle(() => ({
    opacity: interpolate(stop.value, [0, 0.2], [0, 1], 'clamp'),
    transform: [
      { translateY: interpolate(stop.value, [0, 1], [-60, 0]) },
      { scale: interpolate(stop.value, [0, 1], [0.3, 1]) },
    ],
  }));

  const tickerStyle = useAnimatedStyle(() => ({
    opacity: ticker.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: button.value,
    transform: [{ translateY: interpolate(button.value, [0, 1], [40, 0]) }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shimmer.value, [0, 1], [-160, SCREEN_W]) },
      { skewX: '-20deg' },
    ],
  }));

  if (!fontsLoaded) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={INK} />

      {/* Ambient drifting glow */}
      <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]} />

      {/* Orbit rings (partial arcs) */}
      <View pointerEvents="none" style={styles.ringsWrap}>
        <Animated.View style={[styles.ring, styles.ringOuter, ringOuter]} />
        <Animated.View style={[styles.ring, styles.ringMid, ringMid]} />
        <Animated.View style={[styles.ring, styles.ringInner, ringInner]} />
      </View>

      <View style={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 }]}>
        <View style={styles.topRow}>
          <Text style={styles.edition}>EST. 2026</Text>
          <Text style={styles.edition}>CAMPUS EDITION</Text>
        </View>

        {/* Wordmark */}
        <View style={styles.center}>
          <View style={styles.wordmarkRow}>
            {LETTERS.map((letter, i) => (
              <RevealLetter
                key={letter + i}
                letter={letter}
                delay={T.letters + i * T.letterStagger}
                instant={reduceMotion}
              />
            ))}
            <Animated.View style={[styles.stop, stopStyle]} />
          </View>

          <Animated.View style={[styles.rule, ruleStyle]} />

          <View style={styles.taglineRow}>
            {TAGLINE.map((word, i) => (
              <RevealWord
                key={word + i}
                word={word}
                accent={i === TAGLINE.length - 1}
                delay={T.tagline + i * T.wordStagger}
                instant={reduceMotion}
              />
            ))}
          </View>
        </View>

        {/* Bottom: ticker + CTA */}
        <View>
          <Animated.View style={tickerStyle}>
            <Ticker paused={reduceMotion} />
          </Animated.View>

          <Animated.View style={[styles.buttonWrap, buttonStyle]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Get started"
              onPress={() => router.push('/onboarding/welcome' as Href)}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            >
              <Animated.View pointerEvents="none" style={[styles.shimmer, shimmerStyle]} />
              <Text style={styles.buttonText}>Get Started</Text>
              <View style={styles.buttonArrow}>
                <Ionicons name="arrow-forward" size={18} color={CREAM} />
              </View>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

// ─── Pieces ────────────────────────────────────────────────────────

function RevealLetter({ letter, delay, instant }: { letter: string; delay: number; instant: boolean }) {
  const p = useSharedValue(instant ? 1 : 0);

  useEffect(() => {
    if (instant) {
      p.value = 1;
      return;
    }
    p.value = withDelay(delay, withSpring(1, { damping: 14, stiffness: 120, mass: 0.8 }));
  }, [instant]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(p.value, [0, 1], [110, 0]) },
      { rotate: `${interpolate(p.value, [0, 1], [12, 0])}deg` },
    ],
  }));

  return (
    <View style={styles.letterMask}>
      <Animated.Text style={[styles.letter, style]}>{letter}</Animated.Text>
    </View>
  );
}

function RevealWord({
  word,
  delay,
  accent,
  instant,
}: {
  word: string;
  delay: number;
  accent: boolean;
  instant: boolean;
}) {
  const p = useSharedValue(instant ? 1 : 0);

  useEffect(() => {
    if (instant) {
      p.value = 1;
      return;
    }
    p.value = withDelay(delay, withTiming(1, { duration: 600, easing: Easing.bezier(0.16, 1, 0.3, 1) }));
  }, [instant]);

  const style = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: interpolate(p.value, [0, 1], [18, 0]) }],
  }));

  return (
    <View style={styles.wordMask}>
      <Animated.Text style={[styles.word, accent && styles.wordAccent, style]}>{word}</Animated.Text>
    </View>
  );
}

/** Endless horizontal ticker of academic words. */
function Ticker({ paused }: { paused: boolean }) {
  const [rowWidth, setRowWidth] = useState(0);
  const x = useSharedValue(0);

  useEffect(() => {
    if (!rowWidth || paused) return;
    x.value = 0;
    x.value = withRepeat(
      withTiming(-rowWidth, { duration: rowWidth * 28, easing: Easing.linear }),
      -1,
      false
    );
  }, [rowWidth, paused]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  const row = (measure: boolean) => (
    <View
      style={styles.tickerRow}
      onLayout={measure ? (e) => setRowWidth(e.nativeEvent.layout.width) : undefined}
    >
      {TICKER.map((t) => (
        <View key={t} style={styles.tickerItem}>
          <Text style={styles.tickerText}>{t}</Text>
          <View style={styles.tickerDot} />
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.tickerClip}>
      <Animated.View style={[styles.tickerTrack, style]}>
        {row(true)}
        {row(false)}
      </Animated.View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const RING = Math.min(SCREEN_W * 1.25, 520);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: INK,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: '18%',
    left: SCREEN_W / 2 - 180,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(203, 167, 47, 0.10)',
  },
  ringsWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -60,
  },
  ring: {
    position: 'absolute',
    borderColor: 'transparent',
  },
  ringOuter: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 1,
    borderTopColor: 'rgba(233, 195, 73, 0.55)',
    borderRightColor: 'rgba(233, 195, 73, 0.15)',
  },
  ringMid: {
    width: RING * 0.74,
    height: RING * 0.74,
    borderRadius: (RING * 0.74) / 2,
    borderWidth: 1.5,
    borderLeftColor: 'rgba(251, 249, 248, 0.22)',
    borderBottomColor: 'rgba(251, 249, 248, 0.08)',
  },
  ringInner: {
    width: RING * 0.5,
    height: RING * 0.5,
    borderRadius: (RING * 0.5) / 2,
    borderWidth: 2,
    borderTopColor: 'rgba(233, 195, 73, 0.35)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  edition: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 10,
    letterSpacing: 2.4,
    color: 'rgba(251, 249, 248, 0.38)',
  },
  center: {
    alignItems: 'center',
    marginTop: -40,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  letterMask: {
    overflow: 'hidden',
    height: 112,
    justifyContent: 'flex-end',
  },
  letter: {
    fontFamily: LexiFonts.displayBold,
    fontSize: 96,
    lineHeight: 112,
    color: CREAM,
    letterSpacing: -3,
    includeFontPadding: false,
  },
  stop: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: GOLD,
    marginLeft: 4,
    marginBottom: 24,
  },
  rule: {
    width: 120,
    height: 2,
    borderRadius: 1,
    backgroundColor: GOLD_DEEP,
    marginTop: 10,
    marginBottom: 22,
  },
  taglineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 320,
  },
  wordMask: {
    overflow: 'hidden',
    paddingHorizontal: 3,
  },
  word: {
    fontFamily: LexiFonts.bodyMedium,
    fontSize: 17,
    lineHeight: 26,
    color: MUTED,
  },
  wordAccent: {
    color: GOLD,
  },
  tickerClip: {
    overflow: 'hidden',
    marginHorizontal: -24,
    marginBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(251, 249, 248, 0.12)',
    paddingVertical: 12,
  },
  tickerTrack: {
    flexDirection: 'row',
  },
  tickerRow: {
    flexDirection: 'row',
  },
  tickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tickerText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 12,
    letterSpacing: 3,
    color: 'rgba(251, 249, 248, 0.5)',
  },
  tickerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: GOLD_DEEP,
    marginHorizontal: 18,
  },
  buttonWrap: {
    width: '100%',
  },
  button: {
    height: 58,
    borderRadius: 999,
    backgroundColor: CREAM,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 28,
    paddingRight: 6,
    overflow: 'hidden',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 70,
    backgroundColor: 'rgba(233, 195, 73, 0.28)',
  },
  buttonText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 16,
    color: INK,
    letterSpacing: 0.2,
  },
  buttonArrow: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: INK_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

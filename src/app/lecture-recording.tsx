import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiColors, LexiFonts, LexiSpacing } from '@/constants/lexi-theme';
import { useLexiFonts } from '@/hooks/use-lexi-fonts';

export default function LectureRecordingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ courseCode?: string; courseTitle?: string }>();
  const [fontsLoaded] = useLexiFonts();

  const courseTitle = params.courseTitle
    ? `${params.courseCode || 'CSC 301'}: ${params.courseTitle}`
    : 'CSC 301: Data Structures and Algorithms';

  // Timer State (starts at 37m 21s as in Stitch design, or ticks up)
  const [seconds, setSeconds] = useState(37 * 60 + 21);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Animation values for audio wave visualizer
  const waveAnim1 = useRef(new Animated.Value(12)).current;
  const waveAnim2 = useRef(new Animated.Value(18)).current;
  const waveAnim3 = useRef(new Animated.Value(24)).current;
  const waveAnim4 = useRef(new Animated.Value(32)).current;
  const waveAnim5 = useRef(new Animated.Value(20)).current;
  const waveAnim6 = useRef(new Animated.Value(28)).current;
  const waveAnim7 = useRef(new Animated.Value(14)).current;

  // Pulse animation for recording dot
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Spinner animation for semantic context step
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Clock interval
  useEffect(() => {
    if (isPaused || sessionCompleted) return;
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, sessionCompleted]);

  // Audio wave loop
  useEffect(() => {
    if (isPaused || sessionCompleted) return;

    const createWave = (anim: Animated.Value, minH: number, maxH: number, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: maxH,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: minH,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      );
    };

    const anims = [
      createWave(waveAnim1, 8, 28, 450),
      createWave(waveAnim2, 10, 36, 520),
      createWave(waveAnim3, 14, 40, 480),
      createWave(waveAnim4, 16, 44, 400),
      createWave(waveAnim5, 12, 34, 550),
      createWave(waveAnim6, 10, 30, 430),
      createWave(waveAnim7, 6, 24, 490),
    ];

    anims.forEach((a) => a.start());

    return () => {
      anims.forEach((a) => a.stop());
    };
  }, [isPaused, sessionCompleted]);

  // Pulse dot loop
  useEffect(() => {
    if (isPaused || sessionCompleted) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [isPaused, sessionCompleted]);

  // Spinner loop
  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, []);

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const formatTimer = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const handleStopSession = () => {
    setSessionCompleted(true);
    router.replace({
      pathname: '/lecture-analysis',
      params: {
        courseCode: params.courseCode || 'CSC 301',
        courseTitle: params.courseTitle || 'Dynamic Programming Introduction',
      },
    } as any);
  };

  if (!fontsLoaded) {
    return <View style={styles.container} />;
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fbf9f4" />

      {/* Top Bar with Dismiss */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.closeBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Minimize Recording"
          hitSlop={12}
        >
          <Ionicons name="chevron-down" size={26} color={LexiColors.primary} />
        </Pressable>
        <Text style={styles.topBarTitle}>Live Lecture Capture</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.courseHeadline}>{courseTitle}</Text>
          <View style={styles.statusBadgeRow}>
            <Animated.View
              style={[
                styles.pulseDot,
                isPaused && styles.pulseDotPaused,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <Text style={styles.statusBadgeText}>
              {isPaused ? 'Recording paused' : 'Recording in progress...'}
            </Text>
          </View>
        </View>

        {/* Central Recording Hub Card */}
        <View style={styles.hubCard}>
          {/* Digital Timer Display */}
          <Text style={styles.timerDisplay}>{formatTimer(seconds)}</Text>

          {/* Audio Wave Visualizer */}
          <View style={styles.waveContainer}>
            <Animated.View style={[styles.waveBar, { height: waveAnim1 }]} />
            <Animated.View style={[styles.waveBar, { height: waveAnim2 }]} />
            <Animated.View style={[styles.waveBar, { height: waveAnim3 }]} />
            <Animated.View style={[styles.waveBar, { height: waveAnim4 }]} />
            <Animated.View style={[styles.waveBar, { height: waveAnim5 }]} />
            <Animated.View style={[styles.waveBar, { height: waveAnim6 }]} />
            <Animated.View style={[styles.waveBar, { height: waveAnim7 }]} />
          </View>

          {/* Recording Controls */}
          <View style={styles.controlsRow}>
            {/* Pause / Resume Button */}
            <Pressable
              style={({ pressed }) => [
                styles.pauseBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={handleTogglePause}
              accessibilityRole="button"
              accessibilityLabel={isPaused ? 'Resume Recording' : 'Pause Recording'}
            >
              <Ionicons
                name={isPaused ? 'play' : 'pause'}
                size={26}
                color={LexiColors.primary}
              />
            </Pressable>

            {/* Stop Session Button */}
            <Pressable
              style={({ pressed }) => [
                styles.stopBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={handleStopSession}
              accessibilityRole="button"
              accessibilityLabel="Stop Recording"
            >
              <Ionicons name="stop" size={20} color="#ffffff" />
              <Text style={styles.stopBtnText}>Stop Session</Text>
            </Pressable>
          </View>
        </View>

        {/* Live Processing Status Section */}
        <View style={styles.processingSection}>
          <Text style={styles.processingHeaderTitle}>LIVE PROCESSING</Text>

          <View style={styles.processingCard}>
            {/* Step 1: Saved */}
            <View style={styles.statusItem}>
              <View style={styles.iconCheck}>
                <Ionicons name="checkmark" size={14} color="#191e00" />
              </View>
              <View style={styles.statusTextBox}>
                <Text style={styles.statusTitle}>Lecture saved</Text>
                <Text style={styles.statusDesc}>Audio stream securely captured to local storage.</Text>
              </View>
            </View>

            <View style={styles.itemDivider} />

            {/* Step 2: Transcription */}
            <View style={styles.statusItem}>
              <View style={styles.iconCheck}>
                <Ionicons name="checkmark" size={14} color="#191e00" />
              </View>
              <View style={styles.statusTextBox}>
                <Text style={styles.statusTitle}>Transcription</Text>
                <Text style={styles.statusDesc}>Real-time speech-to-text synced.</Text>
              </View>
            </View>

            <View style={styles.itemDivider} />

            {/* Step 3: Understanding (Active) */}
            <View style={styles.statusItem}>
              <View style={styles.iconSpinWrapper}>
                <Animated.View style={{ transform: [{ rotate: spinInterpolate }] }}>
                  <Ionicons name="reload" size={14} color={LexiColors.primary} />
                </Animated.View>
              </View>
              <View style={styles.statusTextBox}>
                <Text style={[styles.statusTitle, { color: LexiColors.primary }]}>
                  Understanding semantic context
                </Text>
                <Text style={styles.statusDesc}>
                  Extracting key concepts, algorithms, and data structures mentioned.
                </Text>
              </View>
            </View>

            <View style={styles.itemDivider} />

            {/* Step 4: Pending */}
            <View style={[styles.statusItem, { opacity: 0.55 }]}>
              <View style={styles.iconPending} />
              <View style={styles.statusTextBox}>
                <Text style={styles.statusTitle}>Study material generation</Text>
                <Text style={styles.statusDesc}>Will begin upon session completion.</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fbf9f4',
  },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LexiSpacing.containerPaddingH,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26, 28, 22, 0.08)',
  },
  closeBtn: {
    padding: 6,
    marginLeft: -6,
  },
  topBarTitle: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 14,
    color: LexiColors.primary,
    letterSpacing: 0.5,
  },
  spacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: LexiSpacing.containerPaddingH,
    paddingTop: 24,
    paddingBottom: 40,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  courseHeadline: {
    fontFamily: LexiFonts.headlineLgMobile,
    fontSize: 22,
    lineHeight: 28,
    color: LexiColors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ba1a1a',
  },
  pulseDotPaused: {
    backgroundColor: LexiColors.outline,
  },
  statusBadgeText: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 14,
    color: LexiColors.onSurfaceVariant,
  },
  hubCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 22, 0.1)',
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  timerDisplay: {
    fontFamily: LexiFonts.headlineLgMobile,
    fontSize: 44,
    lineHeight: 50,
    color: LexiColors.primary,
    letterSpacing: -1,
    marginBottom: 24,
    fontWeight: '700',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 48,
    marginBottom: 28,
  },
  waveBar: {
    width: 5,
    borderRadius: 2.5,
    backgroundColor: '#272e0a',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pauseBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f5f3ee',
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 22, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 56,
    backgroundColor: LexiColors.primaryContainer,
    paddingHorizontal: 26,
    borderRadius: 28,
    shadowColor: LexiColors.primaryContainer,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  stopBtnText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 15,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  // Processing
  processingSection: {
    width: '100%',
  },
  processingHeaderTitle: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 12,
    letterSpacing: 1.2,
    color: LexiColors.onSurfaceVariant,
    marginBottom: 12,
    paddingLeft: 4,
  },
  processingCard: {
    backgroundColor: '#f5f3ee',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 22, 0.08)',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 6,
  },
  iconCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dfe8a9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  iconSpinWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: LexiColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  iconPending: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: LexiColors.outline,
    marginTop: 2,
  },
  statusTextBox: {
    flex: 1,
  },
  statusTitle: {
    fontFamily: LexiFonts.bodyLg,
    fontSize: 14,
    fontWeight: '600',
    color: LexiColors.onSurface,
  },
  statusDesc: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 12,
    color: LexiColors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 16,
  },
  itemDivider: {
    height: 1,
    backgroundColor: 'rgba(199, 199, 185, 0.4)',
    marginLeft: 36,
    marginVertical: 6,
  },
});

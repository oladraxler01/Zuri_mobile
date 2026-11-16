import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay, withTiming } from 'react-native-reanimated';
import { getRecordingPermissionsAsync } from 'expo-audio';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useAcademic } from '@/context/academic-context';
import { getNotificationPermission } from '@/services/notifications';
import type { IoniconName } from '@/types/lecture';

/** End of student onboarding: what's set up, then into the app. */
export default function OnboardingCompleteScreen() {
  const { state } = useAcademic();
  const [mic, setMic] = useState<boolean | null>(null);
  const [notif, setNotif] = useState<boolean | null>(null);
  const pop = useSharedValue(0);
  const rise = useSharedValue(0);

  useEffect(() => {
    pop.value = withSpring(1, { damping: 10, stiffness: 150 });
    rise.value = withDelay(200, withTiming(1, { duration: 500 }));
    getRecordingPermissionsAsync().then((p) => setMic(p.granted)).catch(() => setMic(false));
    getNotificationPermission().then((p) => setNotif(p === 'granted'));
  }, []);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const riseStyle = useAnimatedStyle(() => ({ opacity: rise.value, transform: [{ translateY: (1 - rise.value) * 20 }] }));
  const first = state.studentName.trim().split(/\s+/)[0];
  const remindersOn = state.preferences.lectureReminders && notif;

  const items: { icon: IoniconName; label: string; value: string; ok: boolean }[] = [
    {
      icon: 'person-outline',
      label: 'Profile',
      value: state.verification === 'pending' ? `${state.matricNumber} · verification pending` : 'Add your matric number later in Profile',
      ok: state.verification !== 'unverified',
    },
    { icon: 'library-outline', label: 'Courses', value: `${state.courses.length} courses · ${state.level} · ${state.semester}`, ok: state.courses.length > 0 },
    { icon: 'calendar-outline', label: 'Timetable', value: `${state.timetable.length} classes a week`, ok: state.timetable.length > 0 },
    {
      icon: 'notifications-outline',
      label: 'Reminders',
      value: remindersOn ? `${state.preferences.reminderLeadMinutes} min before each class` : 'Off; turn on in Preferences',
      ok: !!remindersOn,
    },
    { icon: 'mic-outline', label: 'Microphone', value: mic ? 'Ready to record' : 'You’ll be asked when you first record', ok: !!mic },
  ];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View style={[styles.badge, popStyle]}>
          <Ionicons name="checkmark" size={36} color={UI.success} />
        </Animated.View>
        <Animated.View style={riseStyle}>
          <Text style={styles.h1}>You’re all set{first ? `, ${first}` : ''}</Text>
          <Text style={styles.lead}>{state.university}</Text>

          <View style={styles.card}>
            {items.map((it, i) => (
              <View key={it.label} style={[styles.row, i > 0 && styles.rowBorder]}>
                <Ionicons name={it.icon} size={20} color={UI.inkSoft} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{it.label}</Text>
                  <Text style={styles.value}>{it.value}</Text>
                </View>
                <Ionicons name={it.ok ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={it.ok ? UI.success : UI.muted} />
              </View>
            ))}
          </View>

          <Pressable style={({ pressed }) => [styles.primary, pressed && { opacity: 0.88 }]} onPress={() => router.replace('/(tabs)' as Href)}>
            <Text style={styles.primaryText}>Go to Home</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
          <Text style={styles.hint}>Tip: record your next lecture from the Home screen.</Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },
  scroll: { padding: 24, paddingTop: 48, maxWidth: 520, width: '100%', alignSelf: 'center' },
  badge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: UI.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 18,
  },
  h1: { fontFamily: ZuriFonts.headlineLg, fontSize: 30, color: UI.ink, textAlign: 'center' },
  lead: { fontFamily: ZuriFonts.bodyRegular, fontSize: 15, color: UI.muted, textAlign: 'center', marginTop: 4, marginBottom: 22 },
  card: { backgroundColor: UI.card, borderRadius: 18, borderWidth: 1, borderColor: UI.border, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: UI.borderSoft },
  label: { fontFamily: ZuriFonts.labelSmBold, fontSize: 13, color: UI.ink },
  value: { fontFamily: ZuriFonts.bodyRegular, fontSize: 13, color: UI.muted, marginTop: 2 },
  primary: {
    height: 54,
    borderRadius: 27,
    backgroundColor: UI.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  primaryText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 15, color: '#fff' },
  hint: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted, textAlign: 'center', marginTop: 12 },
});

import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { PermissionState } from '@/components/states/state-view';
import { LoadingState } from '@/components/states/loading';
import { UI } from '@/constants/lexi-ui';
import { useAcademic } from '@/context/academic-context';
import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermission,
} from '@/services/notifications';

/**
 * Notification permission step. Shown at the end of student onboarding
 * (?next=/(tabs)) and from Preferences when reminders are off.
 */
export default function NotificationPermissionScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { state, updatePreferences } = useAcademic();
  const [perm, setPerm] = useState<NotificationPermission | null>(null);

  const finish = () => {
    if (next) router.replace(next as Href);
    else if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as Href);
  };

  useEffect(() => {
    getNotificationPermission().then((p) => {
      // Already allowed (or not available on this platform): nothing to ask.
      if (p === 'granted' || p === 'unsupported') finish();
      else setPerm(p);
    });
  }, []);

  const allow = async () => {
    const p = await requestNotificationPermission();
    setPerm(p);
    if (p === 'granted') {
      updatePreferences({ lectureReminders: true });
      finish();
    }
  };

  const skip = () => {
    updatePreferences({ lectureReminders: false });
    finish();
  };

  const lead = state.preferences.reminderLeadMinutes;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        {perm === null ? (
          <LoadingState />
        ) : perm === 'denied' ? (
          <PermissionState
            icon="notifications-off-outline"
            title="Notifications are off"
            message=""
            deniedMessage="Notifications are turned off for this app. Turn them on in your phone’s settings to get class reminders."
            denied
            allowLabel=""
            onAllow={() => {}}
            onSkip={skip}
            skipLabel="Continue without reminders"
          />
        ) : (
          <PermissionState
            icon="notifications-outline"
            title="Never miss a class"
            message={`Get a reminder ${lead} minutes before each lecture so you can arrive on time and start recording.`}
            deniedMessage=""
            denied={false}
            allowLabel="Turn on reminders"
            onAllow={allow}
            onSkip={skip}
            points={[
              { icon: 'alarm-outline', text: `${lead} minutes before each class on your timetable` },
              { icon: 'calendar-outline', text: `${state.timetable.length} weekly classes covered` },
              { icon: 'options-outline', text: 'Change or switch off anytime in Preferences' },
            ]}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },
  center: { flex: 1, justifyContent: 'center' },
});

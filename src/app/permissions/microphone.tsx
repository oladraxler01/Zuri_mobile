import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { PermissionState } from '@/components/states/state-view';
import { LoadingState } from '@/components/states/loading';
import { UI } from '@/constants/lexi-ui';

/** Microphone permission step at the end of student onboarding (?next= overrides where it goes). */
export default function MicrophonePermissionScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [state, setState] = useState<'checking' | 'ask' | 'denied'>('checking');

  const finish = () => router.replace((next || '/onboarding/complete') as Href);

  useEffect(() => {
    getRecordingPermissionsAsync()
      .then((p) => (p.granted ? finish() : setState(p.canAskAgain === false ? 'denied' : 'ask')))
      .catch(() => setState('ask'));
  }, []);

  const allow = async () => {
    try {
      const p = await requestRecordingPermissionsAsync();
      if (p.granted) return finish();
      setState(p.canAskAgain === false ? 'denied' : 'ask');
    } catch {
      setState('ask');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        {state === 'checking' ? (
          <LoadingState />
        ) : (
          <PermissionState
            icon="mic-outline"
            title="Record your lectures"
            message="Allow the microphone so you can record a lecture with one tap and get its transcript, notes and questions afterwards."
            deniedMessage="The microphone is turned off for this app. Turn it on in settings when you want to record."
            denied={state === 'denied'}
            allowLabel="Allow microphone"
            onAllow={allow}
            onSkip={finish}
            skipLabel={state === 'denied' ? 'Continue' : 'Later, when I record'}
            points={[
              { icon: 'radio-button-on-outline', text: 'Only records after you tap record' },
              { icon: 'lock-closed-outline', text: 'Recordings stay on your phone until you process them' },
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

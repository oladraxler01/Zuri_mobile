import { useState } from 'react';
import { View, StyleSheet, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { StateView } from '@/components/states/state-view';
import { UI } from '@/constants/lexi-ui';
import { useSession } from '@/context/session-context';

/**
 * Full-screen system states triggered by the backend:
 *   /status/session-expired  (HTTP 401)
 *   /status/update-required  (HTTP 426)
 *   /status/maintenance      (HTTP 503)
 */
export default function StatusScreen() {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const { signOut } = useSession();
  const [checking, setChecking] = useState(false);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/' as Href));

  let content;
  if (kind === 'session-expired') {
    content = (
      <StateView
        tone="amber"
        icon="time-outline"
        title="Your session has expired"
        message="For your security you’ve been signed out. Sign in again to continue; recordings on this phone are kept."
        primary={{
          label: 'Sign in again',
          icon: 'log-in-outline',
          onPress: () => {
            signOut();
            router.replace('/onboarding/sign-in' as Href);
          },
        }}
      />
    );
  } else if (kind === 'update-required') {
    const storeUrl =
      Platform.OS === 'ios' ? 'itms-apps://apps.apple.com' : Platform.OS === 'android' ? 'market://search?q=pname:com.oladraxler.leximobile' : undefined;
    content = (
      <StateView
        tone="amber"
        icon="arrow-up-circle-outline"
        title="Update required"
        message="A newer version of the app is needed to keep using it. Updating takes a minute and keeps all your data."
        primary={
          storeUrl
            ? { label: 'Update now', icon: 'download-outline', onPress: () => Linking.openURL(storeUrl).catch(() => {}) }
            : undefined
        }
      />
    );
  } else if (kind === 'maintenance') {
    content = (
      <StateView
        tone="neutral"
        icon="construct-outline"
        title="We’ll be right back"
        message="The service is down for scheduled maintenance. Recording still works, and uploads continue once we’re back."
        primary={{
          label: checking ? 'Checking…' : 'Try again',
          icon: 'refresh',
          onPress: () => {
            setChecking(true);
            setTimeout(() => {
              setChecking(false);
              goBack();
            }, 600);
          },
        }}
        secondary={{ label: 'Continue offline', onPress: goBack }}
      />
    );
  } else {
    content = (
      <StateView
        icon="help-circle-outline"
        title="Something’s not right"
        message="We couldn’t show this screen."
        primary={{ label: 'Go back', onPress: goBack }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>{content}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },
  center: { flex: 1, justifyContent: 'center' },
});

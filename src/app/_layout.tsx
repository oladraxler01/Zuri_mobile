import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, SplashScreen } from 'expo-router';
import type { ErrorBoundaryProps } from 'expo-router';
import { AcademicProvider, useAcademic } from '@/context/academic-context';
import { SessionProvider, useSession } from '@/context/session-context';
import { LecturesProvider } from '@/context/lectures-context';
import { NetworkProvider } from '@/context/network-context';
import { useLexiFonts } from '@/hooks/use-lexi-fonts';
import { OfflineBanner } from '@/components/states/offline-banner';
import { ReminderSync } from '@/components/reminder-sync';
import { StateView } from '@/components/states/state-view';
import { UI } from '@/constants/lexi-ui';

// Keep the native launch screen up until fonts and saved data are ready,
// so the app never flashes a blank screen.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <NetworkProvider>
      <SessionProvider>
        <AcademicProvider>
          <LecturesProvider>
            <AppShell />
          </LecturesProvider>
        </AcademicProvider>
      </SessionProvider>
    </NetworkProvider>
  );
}

function AppShell() {
  const [fontsLoaded, fontError] = useLexiFonts();
  const session = useSession();
  const academic = useAcademic();
  const ready = (fontsLoaded || !!fontError) && session.hydrated && academic.hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="lecturer" />
        <Stack.Screen name="institution" />
        <Stack.Screen
          name="lecture-recording"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: false }}
        />
        <Stack.Screen name="lecture/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="lectures" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="course/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="upcoming-lecture" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="permissions/notifications" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="status/[kind]" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack>
      <OfflineBanner />
      <ReminderSync />
    </View>
  );
}

/** Shown if any screen crashes, instead of a red error or a white screen. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    console.error('Screen crashed:', error);
  }, [error]);

  return (
    <View style={[styles.root, styles.center]}>
      <StateView
        tone="error"
        icon="bug-outline"
        title="Something went wrong"
        message="This screen hit an unexpected problem. Your recordings and notes are safe on your phone."
        primary={{ label: 'Try again', onPress: () => retry(), icon: 'refresh' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: UI.bg,
  },
  center: {
    justifyContent: 'center',
  },
});

import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, SplashScreen } from 'expo-router';
import type { ErrorBoundaryProps } from 'expo-router';
import { AcademicProvider, useAcademic } from '@/context/academic-context';
import { SessionProvider, useSession } from '@/context/session-context';
import { LecturesProvider } from '@/context/lectures-context';
import { NetworkProvider } from '@/context/network-context';
import { MaterialsProvider } from '@/context/materials-context';
import { PlannerProvider } from '@/context/planner-context';
import { FeedProvider } from '@/context/feed-context';
import { ProgressProvider } from '@/context/progress-context';
import { ConversationsProvider } from '@/context/conversations-context';
import { ResearchProvider } from '@/context/research-context';
import { LecturerProvider } from '@/context/lecturer-context';
import { InstitutionProvider } from '@/context/institution-context';
import { useZuriFonts } from '@/hooks/use-zuri-fonts';
import { OfflineBanner } from '@/components/states/offline-banner';
import { ReminderSync } from '@/components/reminder-sync';
import { StateView } from '@/components/states/state-view';
import { UI } from '@/constants/zuri-ui';
import { ThemeProvider } from '@/theme';
import { initMonitoring, reportError, withMonitoring } from '@/services/monitoring';

// Keep the native launch screen up until fonts and saved data are ready,
// so the app never flashes a blank screen.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Crash reporting starts before the first render (no-op without EXPO_PUBLIC_SENTRY_DSN).
initMonitoring();

function RootLayout() {
  return (
    <KeyboardProvider>
    <ThemeProvider>
    <NetworkProvider>
      <ProgressProvider>
      <ConversationsProvider>
      <ResearchProvider>
      <SessionProvider>
        <AcademicProvider>
          <LecturesProvider>
            <MaterialsProvider>
              <PlannerProvider>
                <FeedProvider>
                  <LecturerProvider>
                    <InstitutionProvider>
                      <AppShell />
                    </InstitutionProvider>
                  </LecturerProvider>
                </FeedProvider>
              </PlannerProvider>
            </MaterialsProvider>
          </LecturesProvider>
        </AcademicProvider>
      </SessionProvider>
      </ResearchProvider>
      </ConversationsProvider>
      </ProgressProvider>
    </NetworkProvider>
    </ThemeProvider>
    </KeyboardProvider>
  );
}

export default withMonitoring(RootLayout);

function AppShell() {
  const [fontsLoaded, fontError] = useZuriFonts();
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
        <Stack.Screen name="permissions/microphone" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="materials" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="material/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="material/new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="assessment/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="assessment/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="ask" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="search" options={{ animation: 'fade' }} />
        <Stack.Screen name="ask-history" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="study/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="study/session" options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="study/mastery" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="study/history" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="recommendation/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="teach" />
        <Stack.Screen name="admin" />
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
    reportError(error);
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

import { Stack } from 'expo-router';
import { AcademicProvider } from '@/context/academic-context';
import { SessionProvider } from '@/context/session-context';
import { LecturesProvider } from '@/context/lectures-context';

export default function RootLayout() {
  return (
    <SessionProvider>
      <AcademicProvider>
        <LecturesProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="lecturer" />
            <Stack.Screen name="institution" />
            <Stack.Screen
              name="lecture-recording"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
                gestureEnabled: false,
              }}
            />
            <Stack.Screen name="lecture/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="lectures" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="course/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="upcoming-lecture" options={{ animation: 'slide_from_right' }} />
          </Stack>
        </LecturesProvider>
      </AcademicProvider>
    </SessionProvider>
  );
}

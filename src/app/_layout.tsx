import { Stack } from 'expo-router';
import { AcademicProvider } from '@/context/academic-context';

export default function RootLayout() {
  return (
    <AcademicProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="lecture-recording"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="lecture-analysis"
          options={{
            animation: 'slide_from_right',
          }}
        />
      </Stack>
    </AcademicProvider>
  );
}

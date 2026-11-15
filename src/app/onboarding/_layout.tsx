import { Stack } from 'expo-router';
import { LexiColors } from '@/constants/lexi-theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: LexiColors.background },
      }}
    >
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
      <Stack.Screen name="sign-up" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="sign-in" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="verify" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="institution" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="role-select" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="profile-setup" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="lecturer-setup" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="student-courses" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="student-timetable" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="timetable-review" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="student-preferences" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="complete" options={{ animation: 'fade' }} />
    </Stack>
  );
}

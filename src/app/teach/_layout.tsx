import { Stack } from 'expo-router';
import { RoleGate } from '@/components/role-gate';

/** Lecturer-only detail screens (course, quiz, revision, assessment, announcement). */
export default function TeachLayout() {
  return (
    <RoleGate role="lecturer">
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </RoleGate>
  );
}

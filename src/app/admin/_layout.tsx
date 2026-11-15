import { Stack } from 'expo-router';
import { RoleGate } from '@/components/role-gate';

/** Institution-only detail screens (faculty, course, settings sections, intelligence). */
export default function AdminLayout() {
  return (
    <RoleGate role="institution">
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </RoleGate>
  );
}

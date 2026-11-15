import { PlannedScreen } from '@/components/planned-screen';

export default function InstitutionSettingsScreen() {
  return (
    <PlannedScreen
      eyebrow="INSTITUTION"
      title="Institution settings"
      description="Control who has access, how data is handled and what Lexi connects to."
      planned={[
        'Institution settings',
        'Roles, permissions & staff management',
        'Notification management',
        'Audit logs & data/privacy controls',
        'Integrations & API settings',
      ]}
      showSignOut
    />
  );
}

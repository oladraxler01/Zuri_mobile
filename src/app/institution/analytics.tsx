import { PlannedScreen } from '@/components/planned-screen';

export default function InstitutionAnalyticsScreen() {
  return (
    <PlannedScreen
      eyebrow="INSTITUTION"
      title="Analytics & intelligence"
      description="Learning outcomes, engagement, interventions and AI usage across the university."
      planned={[
        'Learning & course performance analytics',
        'Department & student engagement analytics',
        'Intervention analytics',
        'AI usage & cost dashboard',
        'University-wide intelligence & trends',
      ]}
    />
  );
}

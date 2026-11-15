import { PlannedScreen } from '@/components/planned-screen';

export default function LecturerInsightsScreen() {
  return (
    <PlannedScreen
      eyebrow="LECTURER"
      title="Class intelligence"
      description="See how your class is learning: what they've mastered and where they struggle."
      planned={[
        'Class overview & student engagement',
        'Topic mastery & weak topics',
        'Common misconceptions',
        'Frequently asked questions',
        'Assessment performance & learning trends',
        'Student cohort breakdown',
      ]}
    />
  );
}

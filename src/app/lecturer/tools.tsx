import { PlannedScreen } from '@/components/planned-screen';

export default function LecturerToolsScreen() {
  return (
    <PlannedScreen
      eyebrow="LECTURER"
      title="Teaching tools"
      description="Generate assessments and revision material from your own lectures."
      planned={[
        'Create assessment',
        'Generate & review quizzes',
        'Create study material',
        'Generate revision material',
        'Course announcements & history',
      ]}
    />
  );
}

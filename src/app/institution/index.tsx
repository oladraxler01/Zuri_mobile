import { PlannedScreen } from '@/components/planned-screen';

export default function InstitutionOverviewScreen() {
  return (
    <PlannedScreen
      eyebrow="INSTITUTION"
      title="Institution overview"
      description="A live picture of academic activity across your university."
      planned={[
        'Institution dashboard',
        'Academic activity overview',
        'Faculty & department overview',
        'Course, student & lecturer overview',
        'System health',
      ]}
    />
  );
}

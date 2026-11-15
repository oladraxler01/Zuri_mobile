import { PlannedScreen } from '@/components/planned-screen';

export default function InstitutionAcademicsScreen() {
  return (
    <PlannedScreen
      eyebrow="INSTITUTION"
      title="Academic management"
      description="Run enrollment, courses, timetables and the institutional library."
      planned={[
        'Enrollment management',
        'Course & timetable management',
        'Academic calendar management',
        'Material management & content library',
        'Lecture archive & knowledge base',
      ]}
    />
  );
}

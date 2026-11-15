import { PlannedScreen } from '@/components/planned-screen';

export default function LecturerCoursesScreen() {
  return (
    <PlannedScreen
      eyebrow="LECTURER"
      title="Your courses"
      description="Manage the courses you teach, their materials and every recorded lecture."
      planned={[
        'Lecturer courses & course overview',
        'Course intelligence',
        'Course schedule',
        'Course materials & upload',
        'Lecture archive, transcript & analysis',
        'Lecture concepts, questions & misconceptions',
      ]}
    />
  );
}

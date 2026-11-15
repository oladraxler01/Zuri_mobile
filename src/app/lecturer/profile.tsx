import { PlannedScreen } from '@/components/planned-screen';

export default function LecturerProfileScreen() {
  return (
    <PlannedScreen
      eyebrow="LECTURER"
      title="Profile"
      description="Your lecturer identity, verification and the courses you teach."
      planned={[
        'Lecturer profile',
        'Lecturer verification',
        'Course selection',
        'Notification preferences',
        'Account settings',
      ]}
      showSignOut
    />
  );
}

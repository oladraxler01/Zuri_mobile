import { PlannedScreen } from '@/components/planned-screen';

export default function LecturerTodayScreen() {
  return (
    <PlannedScreen
      eyebrow="LECTURER"
      title="Today"
      description="Your teaching day at a glance: what's next, and where your students need you."
      planned={[
        "Today's teaching schedule",
        'Upcoming lecture',
        'Course alerts',
        'Student learning signals',
        'Important interventions',
      ]}
    />
  );
}

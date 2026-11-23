import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useZuriFonts } from '@/hooks/use-zuri-fonts';
import { useAcademic } from '@/context/academic-context';
import { useSession } from '@/context/session-context';
import { makeStyles, useTheme } from '@/theme';

const GPA_GOALS = [
  '4.50+ (First Class)',
  '4.00+ (Second Class Upper)',
  '3.50+ (Dean’s Honor)',
];

const STUDY_HOURS_OPTIONS = [10, 15, 20, 25];

export default function StudentPreferencesScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const [fontsLoaded] = useZuriFonts();
  const { state, updatePreferences } = useAcademic();
  const { setRole } = useSession();

  const [targetGpa, setTargetGpa] = useState(state.preferences.targetGpa);
  const [studyHours, setStudyHours] = useState(state.preferences.weeklyStudyHours);
  const [lectureReminders, setLectureReminders] = useState(state.preferences.lectureReminders);
  const [leadMinutes, setLeadMinutes] = useState(state.preferences.reminderLeadMinutes);
  const [examCountdown, setExamCountdown] = useState(state.preferences.examCountdown);
  const [assignmentAlerts, setAssignmentAlerts] = useState(state.preferences.assignmentAlerts);

  if (!fontsLoaded) {
    return <View style={styles.container} />;
  }

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/onboarding/student-timetable' as Href);
    }
  };

  const handleLaunchDashboard = () => {
    updatePreferences({
      targetGpa,
      weeklyStudyHours: studyHours,
      lectureReminders,
      reminderLeadMinutes: leadMinutes,
      examCountdown,
      assignmentAlerts,
    });
    setRole('student');
    if (lectureReminders) {
      router.replace({ pathname: '/permissions/notifications', params: { next: '/permissions/microphone' } } as any);
    } else {
      router.replace('/permissions/microphone' as Href);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Top App Bar */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Zuri</Text>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step 3 of 3</Text>
          </View>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Group */}
        <View style={styles.titleGroup}>
          <Text style={styles.headline}>Goals & smart sync</Text>
          <Text style={styles.subtitle}>
            Set your target GPA and lecture alarms so Zuri proactively notifies you and keeps you ahead of your coursework.
          </Text>
        </View>

        {/* Academic Goals Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="ribbon-outline" size={20} color={colors['accent-text']} />
            <Text style={styles.sectionTitle}>Target Academic Goal</Text>
          </View>

          <View style={styles.gpaGrid}>
            {GPA_GOALS.map((goal) => {
              const isSelected = targetGpa === goal;
              return (
                <Pressable
                  key={goal}
                  style={[styles.gpaChip, isSelected && styles.gpaChipSelected]}
                  onPress={() => setTargetGpa(goal)}
                >
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={16}
                    color={isSelected ? colors.text : colors['text-subtle']}
                  />
                  <Text
                    style={[
                      styles.gpaChipText,
                      isSelected && styles.gpaChipTextSelected,
                    ]}
                  >
                    {goal}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.fieldSublabel, { marginTop: 16 }]}>
            Weekly Study Target Hours
          </Text>
          <View style={styles.hoursRow}>
            {STUDY_HOURS_OPTIONS.map((hrs) => {
              const isSelected = studyHours === hrs;
              return (
                <Pressable
                  key={hrs}
                  style={[styles.hoursChip, isSelected && styles.hoursChipSelected]}
                  onPress={() => setStudyHours(hrs)}
                >
                  <Text
                    style={[
                      styles.hoursChipText,
                      isSelected && styles.hoursChipTextSelected,
                    ]}
                  >
                    {hrs} hrs/wk
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Smart Reminders Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
            <Text style={styles.sectionTitle}>Smart Proactive Reminders</Text>
          </View>

          {/* Lecture Alerts Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextBox}>
              <Text style={styles.toggleTitle}>Upcoming Lecture Alarms</Text>
              <Text style={styles.toggleDesc}>
                Notifies you before classes with venue details
              </Text>
            </View>
            <Switch
              value={lectureReminders}
              onValueChange={setLectureReminders}
              trackColor={{ false: colors.border, true: colors.text }}
              thumbColor={colors['surface-raised']}
            />
          </View>

          {lectureReminders && (
            <View style={styles.leadTimeRow}>
              <Text style={styles.leadTimeLabel}>Notify me:</Text>
              {[15, 30, 45].map((mins) => {
                const isSelected = leadMinutes === mins;
                return (
                  <Pressable
                    key={mins}
                    style={[styles.leadChip, isSelected && styles.leadChipSelected]}
                    onPress={() => setLeadMinutes(mins)}
                  >
                    <Text
                      style={[
                        styles.leadChipText,
                        isSelected && styles.leadChipTextSelected,
                      ]}
                    >
                      {mins}m before
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={styles.divider} />

          {/* Assignment Deadlines */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextBox}>
              <Text style={styles.toggleTitle}>Coursework & Tests</Text>
              <Text style={styles.toggleDesc}>
                Reminders for test dates and assignment due dates
              </Text>
            </View>
            <Switch
              value={assignmentAlerts}
              onValueChange={setAssignmentAlerts}
              trackColor={{ false: colors.border, true: colors.text }}
              thumbColor={colors['surface-raised']}
            />
          </View>

          <View style={styles.divider} />

          {/* Exam Countdown */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextBox}>
              <Text style={styles.toggleTitle}>Semester Exam Countdown</Text>
              <Text style={styles.toggleDesc}>
                Revision schedules and countdown milestones
              </Text>
            </View>
            <Switch
              value={examCountdown}
              onValueChange={setExamCountdown}
              trackColor={{ false: colors.border, true: colors.text }}
              thumbColor={colors['surface-raised']}
            />
          </View>
        </View>

        {/* Academic Profile Sync Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.crestCircle}>
              <Ionicons name="school" size={20} color={colors['on-primary']} />
            </View>
            <View style={styles.summaryTitleCol}>
              <Text style={styles.summaryUni}>{state.university}</Text>
              <Text style={styles.summaryMeta}>
                {state.department} • {state.level} • {state.semester}
              </Text>
            </View>
          </View>

          <View style={styles.summaryStatsRow}>
            <View style={styles.statPill}>
              <Ionicons name="book-outline" size={14} color={colors.text} />
              <Text style={styles.statPillText}>{state.courses.length} Courses</Text>
            </View>
            <View style={styles.statPill}>
              <Ionicons name="time-outline" size={14} color={colors.text} />
              <Text style={styles.statPillText}>{state.timetable.length} Weekly Lectures</Text>
            </View>
            <View style={styles.statPill}>
              <Ionicons name="flash-outline" size={14} color={colors['accent-text']} />
              <Text style={styles.statPillText}>Sync Ready</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.launchButton,
            pressed && styles.launchButtonPressed,
          ]}
          onPress={handleLaunchDashboard}
          accessibilityRole="button"
          accessibilityLabel="Launch My Dashboard"
        >
          <Ionicons name="sparkles" size={18} color={colors['on-primary']} />
          <Text style={styles.launchButtonText}>LAUNCH MY DASHBOARD</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.surface,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: t.space[5],
  },
  backButton: {
    padding: 6,
    marginLeft: -6,
    borderRadius: t.radius.md,
  },
  backButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  headerCenter: {
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: { ...t.type['title-2'], color: t.colors.text,
    },
  stepBadge: {
    backgroundColor: t.colors['surface-sunken'],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(203, 167, 47, 0.3)',
  },
  stepBadgeText: { ...t.type.caption, color: t.colors['accent-text'],
    },
  headerSpacer: {
    width: 32,
  },
  scrollContent: {
    paddingHorizontal: t.space[5],
    paddingTop: 16,
    paddingBottom: 24,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  titleGroup: {
    gap: 6,
    marginBottom: 20,
  },
  headline: { ...t.type['title-1'], color: t.colors.text,
  },
  subtitle: { ...t.type.callout, color: t.colors['text-muted'],
  },
  sectionCard: {
    backgroundColor: t.colors['surface-sunken'],
    borderRadius: t.radius.md,
    padding: 18,
    borderWidth: 1,
    borderColor: t.colors.border,
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: { ...t.type['title-2'], color: t.colors.text,
    },
  gpaGrid: {
    gap: 8,
  },
  gpaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: t.radius.md,
    backgroundColor: t.colors['surface-raised'],
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  gpaChipSelected: {
    borderColor: t.colors.primary,
    borderWidth: 1.5,
  },
  gpaChipText: { ...t.type.footnote, color: t.colors.text,
  },
  gpaChipTextSelected: {
    fontWeight: '600',
    color: t.colors.text,
  },
  fieldSublabel: { ...t.type.caption, color: t.colors.text,
    marginBottom: 8,
  },
  hoursRow: {
    flexDirection: 'row',
    gap: 8,
  },
  hoursChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: t.radius.md,
    backgroundColor: t.colors['surface-raised'],
    borderWidth: 1,
    borderColor: t.colors.border,
    alignItems: 'center',
  },
  hoursChipSelected: {
    backgroundColor: t.colors.primary,
    borderColor: t.colors.primary,
  },
  hoursChipText: { ...t.type.caption, color: t.colors.text,
  },
  hoursChipTextSelected: {
    color: t.colors['on-primary'],
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggleTextBox: {
    flex: 1,
    paddingRight: 12,
  },
  toggleTitle: { ...t.type.callout, color: t.colors.text,
    marginBottom: 2,
  },
  toggleDesc: { ...t.type.caption, color: t.colors['text-muted'],
  },
  leadTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 6,
  },
  leadTimeLabel: { ...t.type.caption, color: t.colors['text-muted'],
  },
  leadChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: t.radius.md,
    backgroundColor: t.colors['surface-raised'],
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  leadChipSelected: {
    backgroundColor: t.colors.primary,
    borderColor: t.colors.primary,
  },
  leadChipText: { ...t.type.caption, color: t.colors['text-muted'],
  },
  leadChipTextSelected: {
    color: t.colors['on-primary'],
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(195, 200, 194, 0.4)',
    marginVertical: 10,
  },
  summaryCard: {
    backgroundColor: t.colors['surface-raised'],
    borderRadius: t.radius.lg,
    padding: 16,
    borderWidth: 1.5,
    borderColor: t.colors.primary,
    marginBottom: 10, boxShadow: t.shadows.card,},
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  crestCircle: {
    width: 42,
    height: 42,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitleCol: {
    flex: 1,
  },
  summaryUni: { ...t.type['title-2'], color: t.colors.text,
  },
  summaryMeta: { ...t.type.caption, color: t.colors['text-muted'],
    marginTop: 2,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: t.colors['surface-sunken'],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: t.radius.md,
  },
  statPillText: { ...t.type.caption, color: t.colors.text,
    },
  footer: {
    paddingHorizontal: t.space[5],
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: t.colors.surface,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  launchButton: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.full, boxShadow: t.shadows.card,},
  launchButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  launchButtonText: { ...t.type.subhead, color: t.colors['on-primary'],
    letterSpacing: 1.2,
    },
}));

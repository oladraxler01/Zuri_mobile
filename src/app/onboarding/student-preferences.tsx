import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiColors, LexiFonts, LexiSpacing } from '@/constants/lexi-theme';
import { useLexiFonts } from '@/hooks/use-lexi-fonts';
import { useAcademic } from '@/context/academic-context';
import { useSession } from '@/context/session-context';

const GPA_GOALS = [
  '4.50+ (First Class)',
  '4.00+ (Second Class Upper)',
  '3.50+ (Dean’s Honor)',
];

const STUDY_HOURS_OPTIONS = [10, 15, 20, 25];

export default function StudentPreferencesScreen() {
  const router = useRouter();
  const [fontsLoaded] = useLexiFonts();
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
          <Ionicons name="arrow-back" size={24} color={LexiColors.primary} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Lexi</Text>
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
            Set your target GPA and lecture alarms so Lexi proactively notifies you and keeps you ahead of your coursework.
          </Text>
        </View>

        {/* Academic Goals Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="ribbon-outline" size={20} color={LexiColors.tertiary} />
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
                    color={isSelected ? LexiColors.primaryContainer : LexiColors.outline}
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
            <Ionicons name="notifications-outline" size={20} color={LexiColors.primaryContainer} />
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
              trackColor={{ false: '#e4e2e1', true: LexiColors.primaryContainer }}
              thumbColor="#ffffff"
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
              trackColor={{ false: '#e4e2e1', true: LexiColors.primaryContainer }}
              thumbColor="#ffffff"
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
              trackColor={{ false: '#e4e2e1', true: LexiColors.primaryContainer }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Academic Profile Sync Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.crestCircle}>
              <Ionicons name="school" size={20} color="#ffffff" />
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
              <Ionicons name="book-outline" size={14} color={LexiColors.primaryContainer} />
              <Text style={styles.statPillText}>{state.courses.length} Courses</Text>
            </View>
            <View style={styles.statPill}>
              <Ionicons name="time-outline" size={14} color={LexiColors.primaryContainer} />
              <Text style={styles.statPillText}>{state.timetable.length} Weekly Lectures</Text>
            </View>
            <View style={styles.statPill}>
              <Ionicons name="flash-outline" size={14} color={LexiColors.tertiary} />
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
          <Ionicons name="sparkles" size={18} color="#ffffff" />
          <Text style={styles.launchButtonText}>LAUNCH MY DASHBOARD</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LexiColors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LexiSpacing.containerPaddingH,
  },
  backButton: {
    padding: 6,
    marginLeft: -6,
    borderRadius: 8,
  },
  backButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  headerCenter: {
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    fontFamily: LexiFonts.headlineLgMobile,
    fontSize: 22,
    color: LexiColors.primary,
    fontWeight: '700',
  },
  stepBadge: {
    backgroundColor: LexiColors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(203, 167, 47, 0.3)',
  },
  stepBadgeText: {
    fontFamily: LexiFonts.labelSm,
    fontSize: 11,
    color: LexiColors.tertiary,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 32,
  },
  scrollContent: {
    paddingHorizontal: LexiSpacing.containerPaddingH,
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
  headline: {
    fontFamily: LexiFonts.headlineLgMobile,
    fontSize: 26,
    lineHeight: 32,
    color: LexiColors.primary,
  },
  subtitle: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 14,
    lineHeight: 20,
    color: LexiColors.onSurfaceVariant,
  },
  sectionCard: {
    backgroundColor: '#F5F3EF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E3DF',
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 16,
    color: LexiColors.primary,
    fontWeight: '600',
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
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: LexiColors.outlineVariant,
  },
  gpaChipSelected: {
    borderColor: LexiColors.primaryContainer,
    borderWidth: 1.5,
  },
  gpaChipText: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 13,
    color: LexiColors.onSurface,
  },
  gpaChipTextSelected: {
    fontWeight: '600',
    color: LexiColors.primaryContainer,
  },
  fieldSublabel: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 12,
    color: LexiColors.primary,
    marginBottom: 8,
  },
  hoursRow: {
    flexDirection: 'row',
    gap: 8,
  },
  hoursChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: LexiColors.outlineVariant,
    alignItems: 'center',
  },
  hoursChipSelected: {
    backgroundColor: LexiColors.primaryContainer,
    borderColor: LexiColors.primaryContainer,
  },
  hoursChipText: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 12,
    color: LexiColors.onSurface,
  },
  hoursChipTextSelected: {
    color: '#ffffff',
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
  toggleTitle: {
    fontFamily: LexiFonts.bodyLg,
    fontSize: 14,
    fontWeight: '600',
    color: LexiColors.onSurface,
    marginBottom: 2,
  },
  toggleDesc: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 12,
    color: LexiColors.onSurfaceVariant,
  },
  leadTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 6,
  },
  leadTimeLabel: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 12,
    color: LexiColors.onSurfaceVariant,
  },
  leadChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: LexiColors.outlineVariant,
  },
  leadChipSelected: {
    backgroundColor: LexiColors.primaryContainer,
    borderColor: LexiColors.primaryContainer,
  },
  leadChipText: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 11,
    color: LexiColors.onSurfaceVariant,
  },
  leadChipTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(195, 200, 194, 0.4)',
    marginVertical: 10,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: LexiColors.primaryContainer,
    shadowColor: LexiColors.primaryContainer,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 10,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  crestCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: LexiColors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitleCol: {
    flex: 1,
  },
  summaryUni: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 15,
    fontWeight: '700',
    color: LexiColors.primary,
  },
  summaryMeta: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 12,
    color: LexiColors.onSurfaceVariant,
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
    backgroundColor: '#F5F3EF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statPillText: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 12,
    color: LexiColors.primary,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: LexiSpacing.containerPaddingH,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: LexiColors.background,
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
    backgroundColor: LexiColors.primaryContainer,
    borderRadius: 14,
    shadowColor: LexiColors.primaryContainer,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  launchButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  launchButtonText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 14,
    color: LexiColors.onPrimary,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
});

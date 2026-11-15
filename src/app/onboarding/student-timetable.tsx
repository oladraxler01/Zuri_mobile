import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiColors, LexiFonts, LexiSpacing } from '@/constants/lexi-theme';
import { useLexiFonts } from '@/hooks/use-lexi-fonts';
import { useAcademic, TimetableSlot } from '@/context/academic-context';

const DAYS: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat')[] = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
];

const POPULAR_TIMES = [
  { start: '08:00 AM', end: '10:00 AM' },
  { start: '09:00 AM', end: '11:00 AM' },
  { start: '10:00 AM', end: '12:00 PM' },
  { start: '12:00 PM', end: '02:00 PM' },
  { start: '02:00 PM', end: '04:00 PM' },
  { start: '04:00 PM', end: '06:00 PM' },
];

export default function StudentTimetableScreen() {
  const router = useRouter();
  const [fontsLoaded] = useLexiFonts();
  const { state, addTimetableSlot, removeTimetableSlot, setTimetableSlots } = useAcademic();

  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
  const [selectedDay, setSelectedDay] = useState<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat'>('Mon');

  // Add Slot Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(state.courses[0]?.id || '');
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('11:00 AM');
  const [venue, setVenue] = useState('Lecture Theatre A');

  // Upload scanning simulation
  const [scanning, setScanning] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  if (!fontsLoaded) {
    return <View style={styles.container} />;
  }

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/onboarding/student-courses' as Href);
    }
  };

  const handleAddSlot = () => {
    const course = state.courses.find((c) => c.id === selectedCourseId) || state.courses[0];
    if (!course) {
      Alert.alert('No Course', 'Please add a course first in Step 1.');
      return;
    }

    addTimetableSlot({
      courseId: course.id,
      courseCode: course.code,
      day: selectedDay,
      startTime,
      endTime,
      venue: venue.trim() || 'Auditorium 1',
    });

    setModalVisible(false);
  };

  // Simulate file upload & AI OCR parsing
  const handleSimulateUpload = () => {
    setScanning(true);
    setUploadedFileName('Departmental_Timetable_Sem1_2026.pdf');

    setTimeout(() => {
      setScanning(false);
      // Auto populate timetable slots if empty or augment
      if (state.courses.length >= 2) {
        const simulated: TimetableSlot[] = [
          { id: 'u1', courseId: state.courses[0].id, courseCode: state.courses[0].code, day: 'Mon', startTime: '08:00 AM', endTime: '10:00 AM', venue: 'Faculty Hall 1' },
          { id: 'u2', courseId: state.courses[1].id, courseCode: state.courses[1].code, day: 'Mon', startTime: '11:00 AM', endTime: '01:00 PM', venue: 'Lab 3' },
          { id: 'u3', courseId: state.courses[0].id, courseCode: state.courses[0].code, day: 'Wed', startTime: '10:00 AM', endTime: '12:00 PM', venue: 'LT B' },
          { id: 'u4', courseId: state.courses[1].id, courseCode: state.courses[1].code, day: 'Thu', startTime: '02:00 PM', endTime: '04:00 PM', venue: 'Hall 4' },
        ];
        setTimetableSlots([...state.timetable, ...simulated]);
      }
      Alert.alert(
        'Timetable Parsed Successfully',
        'Lexi AI scanned your timetable and synchronized your weekly lecture schedule! You can edit any class below.'
      );
      setActiveTab('manual');
    }, 2000);
  };

  const handleProceed = () => {
    router.push('/onboarding/student-preferences' as Href);
  };

  // Filter slots for currently selected day
  const daySlots = state.timetable.filter((slot) => slot.day === selectedDay);

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
            <Text style={styles.stepBadgeText}>Step 2 of 3</Text>
          </View>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title Group */}
        <View style={styles.titleGroup}>
          <Text style={styles.headline}>Set your lecture timetable</Text>
          <Text style={styles.subtitle}>
            Upload your departmental timetable document or build your schedule manually. You can update lecture slots anytime if sudden changes occur.
          </Text>
        </View>

        {/* Mode Toggle Bar */}
        <View style={styles.modeToggleRow}>
          <Pressable
            style={[styles.modeTab, activeTab === 'manual' && styles.modeTabSelected]}
            onPress={() => setActiveTab('manual')}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={activeTab === 'manual' ? LexiColors.primaryContainer : LexiColors.secondary}
            />
            <Text
              style={[
                styles.modeTabText,
                activeTab === 'manual' && styles.modeTabTextSelected,
              ]}
            >
              Manual Builder
            </Text>
          </Pressable>

          <Pressable
            style={[styles.modeTab, activeTab === 'upload' && styles.modeTabSelected]}
            onPress={() => setActiveTab('upload')}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={18}
              color={activeTab === 'upload' ? LexiColors.primaryContainer : LexiColors.secondary}
            />
            <Text
              style={[
                styles.modeTabText,
                activeTab === 'upload' && styles.modeTabTextSelected,
              ]}
            >
              Upload Document
            </Text>
          </Pressable>
        </View>

        {activeTab === 'upload' ? (
          /* Upload / Document Scan Section */
          <View style={styles.uploadContainer}>
            <View style={styles.uploadDropZone}>
              <View style={styles.uploadIconCircle}>
                <Ionicons name="document-text-outline" size={32} color={LexiColors.primaryContainer} />
              </View>
              <Text style={styles.uploadHeading}>Upload Departmental Timetable</Text>
              <Text style={styles.uploadSubtext}>
                Upload a photo of your lecture board, PDF document, or syllabus image. Lexi AI will parse your classes instantly.
              </Text>

              {uploadedFileName ? (
                <View style={styles.filePill}>
                  <Ionicons name="checkmark-circle" size={18} color="#2c3930" />
                  <Text style={styles.filePillText} numberOfLines={1}>{uploadedFileName}</Text>
                </View>
              ) : null}

              {scanning ? (
                <View style={styles.scanningBox}>
                  <ActivityIndicator size="small" color={LexiColors.primaryContainer} />
                  <Text style={styles.scanningText}>AI is analyzing your timetable schedule...</Text>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.uploadActionBtn,
                    pressed && styles.uploadActionBtnPressed,
                  ]}
                  onPress={handleSimulateUpload}
                >
                  <Ionicons name="cloud-upload" size={18} color="#ffffff" />
                  <Text style={styles.uploadActionBtnText}>
                    {uploadedFileName ? 'Re-scan Document' : 'Select PDF or Snapshot'}
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={styles.infoCallout}>
              <Ionicons name="sparkles" size={16} color={LexiColors.tertiary} />
              <Text style={styles.infoCalloutText}>
                Smart sync automatically maps course codes to lecture venues and schedules your reminder alarms.
              </Text>
            </View>
          </View>
        ) : (
          /* Manual Schedule Builder */
          <View style={styles.manualContainer}>
            {/* Days Selector Row */}
            <View style={styles.daysRow}>
              {DAYS.map((day) => {
                const isSelected = selectedDay === day;
                const count = state.timetable.filter((s) => s.day === day).length;
                return (
                  <Pressable
                    key={day}
                    style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
                    onPress={() => setSelectedDay(day)}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        isSelected && styles.dayButtonTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                    {count > 0 && (
                      <View
                        style={[
                          styles.dayCountDot,
                          isSelected && styles.dayCountDotSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayCountText,
                            isSelected && styles.dayCountTextSelected,
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Day Header & Add Class Button */}
            <View style={styles.dayHeaderRow}>
              <Text style={styles.daySectionTitle}>
                {selectedDay === 'Mon' ? 'Monday' : selectedDay === 'Tue' ? 'Tuesday' : selectedDay === 'Wed' ? 'Wednesday' : selectedDay === 'Thu' ? 'Thursday' : selectedDay === 'Fri' ? 'Friday' : 'Saturday'} Classes ({daySlots.length})
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.addClassBtn,
                  pressed && styles.addClassBtnPressed,
                ]}
                onPress={() => setModalVisible(true)}
              >
                <Ionicons name="add" size={18} color="#ffffff" />
                <Text style={styles.addClassBtnText}>Add Class</Text>
              </Pressable>
            </View>

            {/* Classes List */}
            {daySlots.length === 0 ? (
              <View style={styles.emptyDayBox}>
                <Ionicons name="calendar-clear-outline" size={32} color={LexiColors.outline} />
                <Text style={styles.emptyDayTitle}>No lectures on {selectedDay}</Text>
                <Text style={styles.emptyDaySubtitle}>
                  Free day or no lectures scheduled. Tap "+ Add Class" to schedule a lecture or lab.
                </Text>
              </View>
            ) : (
              <View style={styles.slotsList}>
                {daySlots.map((slot) => {
                  const course = state.courses.find((c) => c.id === slot.courseId);
                  return (
                    <View key={slot.id} style={styles.slotCard}>
                      <View style={styles.slotTimeColumn}>
                        <Text style={styles.slotTimeStart}>{slot.startTime}</Text>
                        <View style={styles.timeLineBar} />
                        <Text style={styles.slotTimeEnd}>{slot.endTime}</Text>
                      </View>

                      <View style={styles.slotInfoColumn}>
                        <View style={styles.slotCodeRow}>
                          <Text style={styles.slotCourseCode}>{slot.courseCode}</Text>
                          <View style={styles.venueBadge}>
                            <Ionicons name="location-outline" size={12} color={LexiColors.primaryContainer} />
                            <Text style={styles.venueText}>{slot.venue}</Text>
                          </View>
                        </View>
                        {course ? (
                          <Text style={styles.slotCourseTitle} numberOfLines={1}>
                            {course.title}
                          </Text>
                        ) : null}
                      </View>

                      <Pressable
                        style={styles.deleteSlotBtn}
                        onPress={() => removeTimetableSlot(slot.id)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove slot for ${slot.courseCode}`}
                      >
                        <Ionicons name="close-circle-outline" size={20} color={LexiColors.outline} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Sudden Changes Note */}
            <View style={styles.noticeCard}>
              <Ionicons name="notifications-outline" size={18} color={LexiColors.primaryContainer} />
              <Text style={styles.noticeText}>
                Sudden lecture hall or time changes? You can modify any class slot directly from your dashboard schedule tab at any time.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.proceedButton,
            pressed && styles.proceedButtonPressed,
          ]}
          onPress={handleProceed}
          accessibilityRole="button"
          accessibilityLabel="Proceed to Reminders"
        >
          <Text style={styles.proceedButtonText}>PROCEED TO REMINDERS</Text>
          <Ionicons name="arrow-forward" size={18} color="#ffffff" />
        </Pressable>
      </View>

      {/* Add Slot Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Class ({selectedDay})</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={LexiColors.primary} />
              </Pressable>
            </View>

            <View style={styles.modalForm}>
              {/* Select Course */}
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Select Course *</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.courseSelectRow}
                >
                  {state.courses.map((c) => {
                    const isSelected = selectedCourseId === c.id;
                    return (
                      <Pressable
                        key={c.id}
                        style={[
                          styles.courseChip,
                          isSelected && styles.courseChipSelected,
                        ]}
                        onPress={() => setSelectedCourseId(c.id)}
                      >
                        <Text
                          style={[
                            styles.courseChipText,
                            isSelected && styles.courseChipTextSelected,
                          ]}
                        >
                          {c.code}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Time Slots Selection */}
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Lecture Time</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.popularTimesRow}
                >
                  {POPULAR_TIMES.map((t, idx) => {
                    const isSelected = startTime === t.start && endTime === t.end;
                    return (
                      <Pressable
                        key={idx}
                        style={[
                          styles.timeChip,
                          isSelected && styles.timeChipSelected,
                        ]}
                        onPress={() => {
                          setStartTime(t.start);
                          setEndTime(t.end);
                        }}
                      >
                        <Text
                          style={[
                            styles.timeChipText,
                            isSelected && styles.timeChipTextSelected,
                          ]}
                        >
                          {t.start} - {t.end}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Custom Times Row */}
              <View style={styles.twoColRow}>
                <View style={[styles.fieldBlock, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Start Time</Text>
                  <TextInput
                    style={styles.input}
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="09:00 AM"
                    placeholderTextColor={LexiColors.outline}
                  />
                </View>
                <View style={[styles.fieldBlock, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>End Time</Text>
                  <TextInput
                    style={styles.input}
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="11:00 AM"
                    placeholderTextColor={LexiColors.outline}
                  />
                </View>
              </View>

              {/* Venue / Hall */}
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Venue / Hall *</Text>
                <TextInput
                  style={styles.input}
                  value={venue}
                  onChangeText={setVenue}
                  placeholder="e.g. Lecture Theatre B, Lab 2"
                  placeholderTextColor={LexiColors.outline}
                />
              </View>

              <Pressable style={styles.saveSlotBtn} onPress={handleAddSlot}>
                <Text style={styles.saveSlotBtnText}>Add to {selectedDay} Schedule</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F3EF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modeTabSelected: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modeTabText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: LexiColors.secondary,
  },
  modeTabTextSelected: {
    color: LexiColors.primaryContainer,
  },
  // Upload
  uploadContainer: {
    gap: 16,
  },
  uploadDropZone: {
    borderWidth: 1.5,
    borderColor: 'rgba(115, 120, 115, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#F5F3EF',
  },
  uploadIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadHeading: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 17,
    color: LexiColors.primary,
    marginBottom: 6,
    textAlign: 'center',
  },
  uploadSubtext: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 13,
    color: LexiColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  filePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: LexiColors.primaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
  },
  filePillText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 12,
    color: LexiColors.primaryContainer,
  },
  scanningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  scanningText: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 13,
    color: LexiColors.primaryContainer,
  },
  uploadActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: LexiColors.primaryContainer,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  uploadActionBtnPressed: {
    opacity: 0.9,
  },
  uploadActionBtnText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: '#ffffff',
  },
  infoCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: LexiColors.surfaceContainerLow,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(203, 167, 47, 0.25)',
  },
  infoCalloutText: {
    flex: 1,
    fontFamily: LexiFonts.bodyMd,
    fontSize: 12,
    lineHeight: 17,
    color: LexiColors.onSurfaceVariant,
  },
  // Manual
  manualContainer: {
    gap: 16,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F5F3EF',
    borderWidth: 1,
    borderColor: '#E5E3DF',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  dayButtonSelected: {
    backgroundColor: LexiColors.primaryContainer,
    borderColor: LexiColors.primaryContainer,
  },
  dayButtonText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 12,
    color: LexiColors.onSurface,
  },
  dayButtonTextSelected: {
    color: '#ffffff',
  },
  dayCountDot: {
    backgroundColor: LexiColors.surfaceContainerLowest,
    paddingHorizontal: 4,
    borderRadius: 6,
    marginTop: 2,
  },
  dayCountDotSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  dayCountText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 9,
    color: LexiColors.primary,
  },
  dayCountTextSelected: {
    color: '#ffffff',
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  daySectionTitle: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 18,
    color: LexiColors.primary,
    fontWeight: '600',
  },
  addClassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: LexiColors.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addClassBtnPressed: {
    opacity: 0.88,
  },
  addClassBtnText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 12,
    color: '#ffffff',
  },
  emptyDayBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#F5F3EF',
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E3DF',
  },
  emptyDayTitle: {
    fontFamily: LexiFonts.bodyLg,
    fontSize: 15,
    fontWeight: '600',
    color: LexiColors.primary,
  },
  emptyDaySubtitle: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 12,
    color: LexiColors.onSurfaceVariant,
    textAlign: 'center',
  },
  slotsList: {
    gap: 10,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E3DF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  slotTimeColumn: {
    alignItems: 'center',
    width: 68,
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: LexiColors.surfaceContainerHigh,
  },
  slotTimeStart: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 11,
    color: LexiColors.primary,
  },
  timeLineBar: {
    width: 2,
    height: 12,
    backgroundColor: LexiColors.tertiaryFixedDim,
    marginVertical: 2,
  },
  slotTimeEnd: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 11,
    color: LexiColors.onSurfaceVariant,
  },
  slotInfoColumn: {
    flex: 1,
    paddingLeft: 12,
  },
  slotCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  slotCourseCode: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 14,
    color: LexiColors.primary,
  },
  venueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F5F3EF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  venueText: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 11,
    color: LexiColors.primaryContainer,
  },
  slotCourseTitle: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 12,
    color: LexiColors.onSurfaceVariant,
  },
  deleteSlotBtn: {
    padding: 6,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F5F3EF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E3DF',
    marginTop: 6,
  },
  noticeText: {
    flex: 1,
    fontFamily: LexiFonts.bodyMd,
    fontSize: 12,
    lineHeight: 17,
    color: LexiColors.onSurfaceVariant,
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
  proceedButton: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: LexiColors.primaryContainer,
    borderRadius: 14,
    shadowColor: LexiColors.primaryContainer,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  proceedButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  proceedButtonText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 14,
    color: LexiColors.onPrimary,
    letterSpacing: 1,
    fontWeight: '700',
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: LexiColors.background,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: LexiColors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 18,
    color: LexiColors.primary,
    fontWeight: '600',
  },
  modalForm: {
    gap: 14,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 12,
    color: LexiColors.primary,
  },
  courseSelectRow: {
    gap: 8,
  },
  courseChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F5F3EF',
    borderWidth: 1,
    borderColor: '#E5E3DF',
  },
  courseChipSelected: {
    backgroundColor: LexiColors.primaryContainer,
    borderColor: LexiColors.primaryContainer,
  },
  courseChipText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: LexiColors.onSurface,
  },
  courseChipTextSelected: {
    color: '#ffffff',
  },
  popularTimesRow: {
    gap: 8,
  },
  timeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F5F3EF',
    borderWidth: 1,
    borderColor: '#E5E3DF',
  },
  timeChipSelected: {
    backgroundColor: LexiColors.primaryContainer,
    borderColor: LexiColors.primaryContainer,
  },
  timeChipText: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 12,
    color: LexiColors.onSurface,
  },
  timeChipTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    height: 46,
    backgroundColor: LexiColors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: LexiColors.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: LexiFonts.bodyMd,
    fontSize: 13,
    color: LexiColors.onSurface,
  },
  saveSlotBtn: {
    height: 48,
    backgroundColor: LexiColors.primaryContainer,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveSlotBtnText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
});

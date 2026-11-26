import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StatusBar,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardSheet } from '@/components/ui/keyboard-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useZuriFonts } from '@/hooks/use-zuri-fonts';
import { useAcademic, TimetableSlot } from '@/context/academic-context';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { parseTimetableText, normaliseCode, keepStudentsClasses } from '@/utils/timetable-import';
import { readTimetablePdf } from '@/services/timetable-file-api';
import { currentUser } from '@/services/api-client';
import { isBackendConfigured } from '@/services/api-config';
import { makeStyles, useTheme } from '@/theme';

const signedIn = () => isBackendConfigured && !!currentUser();

const DAYS: TimetableSlot['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const POPULAR_TIMES = [
  { start: '08:00 AM', end: '10:00 AM' },
  { start: '09:00 AM', end: '11:00 AM' },
  { start: '10:00 AM', end: '12:00 PM' },
  { start: '12:00 PM', end: '02:00 PM' },
  { start: '02:00 PM', end: '04:00 PM' },
  { start: '04:00 PM', end: '06:00 PM' },
];

export default function StudentTimetableScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ upload?: string }>();
  const [fontsLoaded] = useZuriFonts();
  const { state, addTimetableSlot, removeTimetableSlot, setTimetableSlots, addCourse } = useAcademic();
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>(params.upload ? 'upload' : 'manual');
  const [selectedDay, setSelectedDay] = useState<TimetableSlot['day']>('Mon');

  // Add Slot Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(state.courses[0]?.id || '');
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('11:00 AM');
  const [venue, setVenue] = useState('Lecture Theatre A');

  // Upload scanning simulation
  const [scanning, setScanning] = useState(false);
  const [scanStage, setScanStage] = useState('Reading your timetable…');
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

  // Import a timetable from a CSV / text file (read on the phone).
  const handleSimulateUpload = async () => {
    setImportMsg(null);
    const res = await DocumentPicker.getDocumentAsync({
      type: ['text/*', 'text/csv', 'application/vnd.ms-excel', 'application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.length) return;
    const f = res.assets[0];
    setUploadedFileName(f.name);
    const isText = /^text\//.test(f.mimeType ?? '') || /\.(csv|txt|tsv)$/i.test(f.name);
    const isPdf = f.mimeType === 'application/pdf' || /\.pdf$/i.test(f.name);
    if (!isText && !isPdf) {
      setImportMsg({
        ok: false,
        text: 'Zuri can’t read photos of timetables yet. Use the PDF from your department, a CSV or text file, or add classes by hand.',
      });
      return;
    }
    setScanning(true);
    setScanStage('Reading your timetable…');
    try {
      let parsed;
      if (isText) {
        const text = Platform.OS === 'web' ? await (await fetch(f.uri)).text() : await new File(f.uri).text();
        parsed = parseTimetableText(text, state.courses);
      } else {
        if (!signedIn()) {
          setImportMsg({ ok: false, text: 'Sign in first: Zuri reads PDFs on its server.' });
          return;
        }
        const read = await readTimetablePdf(
          { uri: f.uri, name: f.name, mimeType: 'application/pdf', sizeBytes: f.size ?? undefined },
          setScanStage
        );
        const fromAi = read.aiText ? parseTimetableText(read.aiText, state.courses) : null;
        const fromPdf = parseTimetableText(read.text, state.courses);
        parsed = fromAi && fromAi.slots.length >= fromPdf.slots.length ? fromAi : fromPdf;
      }
      // Same class listed twice (e.g. on two pages): keep one.
      const seen = new Set<string>();
      parsed = {
        ...parsed,
        slots: parsed.slots.filter((sl) => {
          const k = `${sl.courseCode}|${sl.day}|${sl.startTime}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        }),
      };
      // A department timetable has every level on it: keep this student's classes.
      parsed = keepStudentsClasses(parsed, state.level, state.courses);
      if (!parsed.slots.length) {
        setImportMsg({
          ok: false,
          text: isPdf
            ? `No ${state.level} classes found in that PDF. If it’s a scanned image it can’t be read yet; add your classes by hand.`
            : 'No classes found. Each line needs a course code, a day, a start and end time, and a venue.',
        });
        return;
      }
      // Add any courses the file mentions that aren't in the list yet.
      const idByCode = new Map(state.courses.map((c) => [normaliseCode(c.code), c.id]));
      for (const code of parsed.unknownCodes) {
        idByCode.set(code, addCourse({ code, title: code, units: 3 }));
      }
      const added: TimetableSlot[] = parsed.slots.map((sl, k) => ({
        ...sl,
        id: `imp_${Date.now().toString(36)}_${k}`,
        courseId: idByCode.get(sl.courseCode) ?? '',
      }));
      setTimetableSlots([...state.timetable, ...added]);
      setImportMsg({
        ok: true,
        text:
          `Imported ${added.length} ${added.length === 1 ? 'class' : 'classes'}` +
          (parsed.unknownCodes.length ? `, and added ${parsed.unknownCodes.join(', ')} to your courses` : '') +
          (parsed.skipped.length ? `. ${parsed.skipped.length} line${parsed.skipped.length > 1 ? 's' : ''} couldn’t be read.` : '.') +
          ' Check them on the next step.',
      });
      setActiveTab('manual');
    } catch (e) {
      setImportMsg({
        ok: false,
        text: isPdf && e instanceof Error && e.message ? e.message : 'That file couldn’t be read. Try saving it again as CSV or plain text.',
      });
    } finally {
      setScanning(false);
    }
  };

  const handleProceed = () => {
    router.push('/onboarding/timetable-review' as Href);
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
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Zuri</Text>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step 2 of 3</Text>
          </View>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAwareScrollView bottomOffset={24}
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
              color={activeTab === 'manual' ? colors.text : colors['text-muted']}
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
              color={activeTab === 'upload' ? colors.text : colors['text-muted']}
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
                <Ionicons name="document-text-outline" size={32} color={colors.text} />
              </View>
              <Text style={styles.uploadHeading}>Upload Departmental Timetable</Text>
              <Text style={styles.uploadSubtext}>
                Pick a CSV or text file with one class per line, for example:{'\n'}CSC 201, Mon, 09:00 AM, 11:00 AM, Faculty Lab 2
              </Text>

              {uploadedFileName ? (
                <View style={styles.filePill}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.text} />
                  <Text style={styles.filePillText} numberOfLines={1}>{uploadedFileName}</Text>
                </View>
              ) : null}

              {scanning ? (
                <View style={styles.scanningBox}>
                  <ActivityIndicator size="small" color={colors.text} />
                  <Text style={styles.scanningText}>{scanStage}</Text>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.uploadActionBtn,
                    pressed && styles.uploadActionBtnPressed,
                  ]}
                  onPress={handleSimulateUpload}
                >
                  <Ionicons name="cloud-upload" size={18} color={colors['on-primary']} />
                  <Text style={styles.uploadActionBtnText}>
                    {uploadedFileName ? 'Import another file' : 'Choose timetable file'}
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={styles.infoCallout}>
              <Ionicons name={importMsg ? (importMsg.ok ? 'checkmark-circle' : 'alert-circle') : 'information-circle-outline'} size={16} color={importMsg && !importMsg.ok ? colors.danger : colors['accent-text']} />
              <Text style={styles.infoCalloutText}>
                {importMsg?.text ??
                  'Columns can be in any order and separated by commas, semicolons or tabs. Times like 9-11, 2:00 PM or 14:00 all work. Courses not in your list are added for you.'}
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
                <Ionicons name="add" size={18} color={colors['on-primary']} />
                <Text style={styles.addClassBtnText}>Add Class</Text>
              </Pressable>
            </View>

            {/* Classes List */}
            {daySlots.length === 0 ? (
              <View style={styles.emptyDayBox}>
                <Ionicons name="calendar-clear-outline" size={32} color={colors['text-subtle']} />
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
                            <Ionicons name="location-outline" size={12} color={colors.text} />
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
                        <Ionicons name="close-circle-outline" size={20} color={colors['text-subtle']} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Sudden Changes Note */}
            <View style={styles.noticeCard}>
              <Ionicons name="notifications-outline" size={18} color={colors.text} />
              <Text style={styles.noticeText}>
                Sudden lecture hall or time changes? You can modify any class slot directly from your dashboard schedule tab at any time.
              </Text>
            </View>
          </View>
        )}
      </KeyboardAwareScrollView>

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
          <Ionicons name="arrow-forward" size={18} color={colors['on-primary']} />
        </Pressable>
      </View>

      {/* Add Slot Modal */}
      <Modal statusBarTranslucent navigationBarTranslucent
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardSheet backdropStyle={styles.modalBackdrop} sheetStyle={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Class</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.text} />
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

              {/* Day */}
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Day *</Text>
                <View style={styles.dayRow}>
                  {DAYS.map((d) => {
                    const isSelected = selectedDay === d;
                    return (
                      <Pressable
                        key={d}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        style={[styles.courseChip, isSelected && styles.courseChipSelected]}
                        onPress={() => setSelectedDay(d)}
                      >
                        <Text style={[styles.courseChipText, isSelected && styles.courseChipTextSelected]}>{d}</Text>
                      </Pressable>
                    );
                  })}
                </View>
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
                    placeholderTextColor={colors['text-subtle']}
                  />
                </View>
                <View style={[styles.fieldBlock, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>End Time</Text>
                  <TextInput
                    style={styles.input}
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="11:00 AM"
                    placeholderTextColor={colors['text-subtle']}
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
                  placeholderTextColor={colors['text-subtle']}
                />
              </View>

              <Pressable style={styles.saveSlotBtn} onPress={handleAddSlot}>
                <Text style={styles.saveSlotBtnText}>Add to {selectedDay} Schedule</Text>
              </Pressable>
            </View>
        </KeyboardSheet>
      </Modal>
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
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: t.colors['surface-sunken'],
    borderRadius: t.radius.md,
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
    borderRadius: t.radius.md,
  },
  modeTabSelected: {
    backgroundColor: t.colors['surface-raised'], boxShadow: t.shadows.card,},
  modeTabText: { ...t.type.subhead, color: t.colors['text-muted'],
  },
  modeTabTextSelected: {
    color: t.colors.text,
  },
  // Upload
  uploadContainer: {
    gap: 16,
  },
  uploadDropZone: {
    borderWidth: 1.5,
    borderColor: 'rgba(115, 120, 115, 0.3)',
    borderStyle: 'dashed',
    borderRadius: t.radius.lg,
    padding: 24,
    alignItems: 'center',
    backgroundColor: t.colors['surface-sunken'],
  },
  uploadIconCircle: {
    width: 56,
    height: 56,
    borderRadius: t.radius.full,
    backgroundColor: t.colors['surface-raised'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadHeading: { ...t.type['title-2'], color: t.colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  uploadSubtext: { ...t.type.footnote, color: t.colors['text-muted'],
    textAlign: 'center',
    marginBottom: 16,
  },
  filePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: t.colors.tint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: t.radius.md,
    marginBottom: 16,
  },
  filePillText: { ...t.type.caption, color: t.colors.text,
  },
  scanningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  scanningText: { ...t.type.footnote, color: t.colors.text,
  },
  uploadActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: t.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: t.radius.md,
  },
  uploadActionBtnPressed: {
    opacity: 0.9,
  },
  uploadActionBtnText: { ...t.type.subhead, color: t.colors['on-primary'],
  },
  infoCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: t.colors['surface-sunken'],
    padding: 14,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(203, 167, 47, 0.25)',
  },
  infoCalloutText: { ...t.type.caption, flex: 1,
    color: t.colors['text-muted'],
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
    borderRadius: t.radius.md,
    backgroundColor: t.colors['surface-sunken'],
    borderWidth: 1,
    borderColor: t.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  dayButtonSelected: {
    backgroundColor: t.colors.primary,
    borderColor: t.colors.primary,
  },
  dayButtonText: { ...t.type.caption, color: t.colors.text,
  },
  dayButtonTextSelected: {
    color: t.colors['on-primary'],
  },
  dayCountDot: {
    backgroundColor: t.colors['surface-raised'],
    paddingHorizontal: 4,
    borderRadius: t.radius.sm,
    marginTop: 2,
  },
  dayCountDotSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  dayCountText: { ...t.type.caption, color: t.colors.text,
  },
  dayCountTextSelected: {
    color: t.colors['on-primary'],
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  daySectionTitle: { ...t.type['title-2'], color: t.colors.text,
    },
  addClassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: t.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: t.radius.md,
  },
  addClassBtnPressed: {
    opacity: 0.88,
  },
  addClassBtnText: { ...t.type.caption, color: t.colors['on-primary'],
  },
  emptyDayBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: t.colors['surface-sunken'],
    borderRadius: t.radius.md,
    gap: 6,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  emptyDayTitle: { ...t.type.callout, color: t.colors.text,
  },
  emptyDaySubtitle: { ...t.type.caption, color: t.colors['text-muted'],
    textAlign: 'center',
  },
  slotsList: {
    gap: 10,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors['surface-raised'],
    borderRadius: t.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: t.colors.border, boxShadow: t.shadows.card,},
  slotTimeColumn: {
    alignItems: 'center',
    width: 68,
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: t.colors.border,
  },
  slotTimeStart: { ...t.type.caption, color: t.colors.text,
  },
  timeLineBar: {
    width: 2,
    height: 12,
    backgroundColor: t.colors.accent,
    marginVertical: 2,
  },
  slotTimeEnd: { ...t.type.caption, color: t.colors['text-muted'],
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
  slotCourseCode: { ...t.type.subhead, color: t.colors.text,
  },
  venueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: t.colors['surface-sunken'],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: t.radius.sm,
  },
  venueText: { ...t.type.caption, color: t.colors.text,
  },
  slotCourseTitle: { ...t.type.caption, color: t.colors['text-muted'],
  },
  deleteSlotBtn: {
    padding: 6,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: t.colors['surface-sunken'],
    padding: 14,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    marginTop: 6,
  },
  noticeText: { ...t.type.caption, flex: 1,
    color: t.colors['text-muted'],
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
  proceedButton: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.full, boxShadow: t.shadows.card,},
  proceedButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  proceedButtonText: { ...t.type.subhead, color: t.colors['on-primary'],
    letterSpacing: 1,
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
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: t.colors.border, boxShadow: t.shadows.raised,},
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { ...t.type['title-2'], color: t.colors.text,
    },
  modalForm: {
    gap: 14,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: { ...t.type.caption, color: t.colors.text,
  },
  courseSelectRow: {
    gap: 8,
  },
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  courseChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: t.radius.md,
    backgroundColor: t.colors['surface-sunken'],
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  courseChipSelected: {
    backgroundColor: t.colors.primary,
    borderColor: t.colors.primary,
  },
  courseChipText: { ...t.type.subhead, color: t.colors.text,
  },
  courseChipTextSelected: {
    color: t.colors['on-primary'],
  },
  popularTimesRow: {
    gap: 8,
  },
  timeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: t.radius.md,
    backgroundColor: t.colors['surface-sunken'],
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  timeChipSelected: {
    backgroundColor: t.colors.primary,
    borderColor: t.colors.primary,
  },
  timeChipText: { ...t.type.caption, color: t.colors.text,
  },
  timeChipTextSelected: {
    color: t.colors['on-primary'],
    fontWeight: '600',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: { ...t.type.footnote, height: 46,
    backgroundColor: t.colors['surface-raised'],
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.md,
    paddingHorizontal: 12,
    color: t.colors.text,
  },
  saveSlotBtn: {
    height: 48,
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveSlotBtnText: { ...t.type.subhead, color: t.colors['on-primary'],
    },
}));

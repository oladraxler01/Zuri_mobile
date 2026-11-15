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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiColors, LexiFonts, LexiSpacing } from '@/constants/lexi-theme';
import { useLexiFonts } from '@/hooks/use-lexi-fonts';
import { useAcademic } from '@/context/academic-context';
import { CatalogueSheet } from '@/components/onboarding/catalogue-sheet';
import { catalogueFor } from '@/constants/course-catalogue';

const LEVELS = ['100L', '200L', '300L', '400L', '500L'];
const DEPARTMENTS = [
  'Computer Science',
  'Software Engineering',
  'Law',
  'Economics',
  'Accounting',
  'Mass Communication',
  'Medicine & Surgery',
  'Electrical Engineering',
];

export default function StudentCoursesScreen() {
  const router = useRouter();
  const [fontsLoaded] = useLexiFonts();
  const { state, setAcademicInfo, addCourse, removeCourse } = useAcademic();

  const [department, setDepartment] = useState(state.department);
  const [level, setLevel] = useState(state.level);
  const [semester, setSemester] = useState<'First Semester' | 'Second Semester'>(state.semester);

  // Modal State for adding course
  const [modalVisible, setModalVisible] = useState(false);
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newUnits, setNewUnits] = useState('3');
  const [newLecturer, setNewLecturer] = useState('');

  if (!fontsLoaded) {
    return <View style={styles.container} />;
  }

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/onboarding/role-select' as Href);
    }
  };

  const handleSaveCourse = () => {
    if (!newCode.trim() || !newTitle.trim()) {
      Alert.alert('Missing Info', 'Please provide at least a Course Code and Title.');
      return;
    }
    addCourse({
      code: newCode.trim().toUpperCase(),
      title: newTitle.trim(),
      units: parseInt(newUnits, 10) || 3,
      lecturer: newLecturer.trim() || undefined,
    });
    setNewCode('');
    setNewTitle('');
    setNewUnits('3');
    setNewLecturer('');
    setModalVisible(false);
  };

  const handleProceed = () => {
    setAcademicInfo({
      department,
      level,
      semester,
    });
    router.push('/onboarding/student-timetable' as Href);
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
            <Text style={styles.stepBadgeText}>Step 1 of 3</Text>
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
          <Text style={styles.headline}>Personalize your semester</Text>
          <Text style={styles.subtitle}>
            Set up your current academic level and registered courses so Lexi can organize your lecture summaries and smart reminders.
          </Text>
        </View>

        {/* Academic Level & Semester Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Academic Level</Text>
          <View style={styles.levelRow}>
            {LEVELS.map((lvl) => {
              const isSelected = level === lvl;
              return (
                <Pressable
                  key={lvl}
                  style={[styles.levelChip, isSelected && styles.levelChipSelected]}
                  onPress={() => setLevel(lvl)}
                >
                  <Text
                    style={[
                      styles.levelChipText,
                      isSelected && styles.levelChipTextSelected,
                    ]}
                  >
                    {lvl}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 18 }]}>Semester</Text>
          <View style={styles.semesterRow}>
            {(['First Semester', 'Second Semester'] as const).map((sem) => {
              const isSelected = semester === sem;
              return (
                <Pressable
                  key={sem}
                  style={[styles.semesterTab, isSelected && styles.semesterTabSelected]}
                  onPress={() => setSemester(sem)}
                >
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={16}
                    color={isSelected ? LexiColors.primaryContainer : LexiColors.outline}
                  />
                  <Text
                    style={[
                      styles.semesterTabText,
                      isSelected && styles.semesterTabTextSelected,
                    ]}
                  >
                    {sem}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Department */}
          <Text style={[styles.sectionLabel, { marginTop: 18 }]}>Department / Major</Text>
          <TextInput
            style={styles.input}
            value={department}
            onChangeText={setDepartment}
            placeholder="e.g. Computer Science"
            placeholderTextColor={LexiColors.outline}
          />
          {/* Quick Department Suggestions */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.deptSuggestions}
          >
            {DEPARTMENTS.map((dept) => (
              <Pressable
                key={dept}
                style={[
                  styles.deptChip,
                  department === dept && styles.deptChipSelected,
                ]}
                onPress={() => setDepartment(dept)}
              >
                <Text
                  style={[
                    styles.deptChipText,
                    department === dept && styles.deptChipTextSelected,
                  ]}
                >
                  {dept}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Courses Section */}
        <View style={styles.coursesHeaderRow}>
          <View>
            <Text style={styles.sectionHeadline}>Registered Courses</Text>
            <Text style={styles.sectionSubtitle}>
              {state.courses.length} courses enrolled for this semester
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.addCourseBtn,
              pressed && styles.addCourseBtnPressed,
            ]}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.addCourseBtnText}>Add Course</Text>
          </Pressable>
        </View>

        {/* Import from the department catalogue */}
        <Pressable
          onPress={() => setCatalogueOpen(true)}
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: 'rgba(26,28,22,0.18)',
              borderRadius: 14,
              padding: 14,
              marginBottom: 12,
            },
            pressed && { opacity: 0.8 },
          ]}
          accessibilityRole="button"
        >
          <Ionicons name="library-outline" size={20} color={LexiColors.primaryContainer} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: LexiFonts.labelSmBold, fontSize: 14, color: LexiColors.primary }}>Import from course catalogue</Text>
            <Text style={{ fontFamily: LexiFonts.bodyRegular, fontSize: 12, color: LexiColors.onSurfaceVariant, marginTop: 2 }}>
              {catalogueFor(department, level).length
                ? `${catalogueFor(department, level).length} ${department} courses for ${level}`
                : `Pick your department and level above`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={LexiColors.outline} />
        </Pressable>

        {/* Course Cards List */}
        <View style={styles.courseList}>
          {state.courses.map((course) => (
            <View key={course.id} style={styles.courseCard}>
              <View style={styles.courseBadgeBox}>
                <Text style={styles.courseBadgeCode}>{course.code}</Text>
              </View>

              <View style={styles.courseDetails}>
                <Text style={styles.courseTitle} numberOfLines={1}>
                  {course.title}
                </Text>
                <View style={styles.courseMetaRow}>
                  <View style={styles.unitChip}>
                    <Text style={styles.unitChipText}>{course.units} Units</Text>
                  </View>
                  {course.lecturer ? (
                    <Text style={styles.lecturerText} numberOfLines={1}>
                      {course.lecturer}
                    </Text>
                  ) : null}
                </View>
              </View>

              <Pressable
                style={styles.deleteBtn}
                onPress={() => removeCourse(course.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${course.code}`}
              >
                <Ionicons name="trash-outline" size={18} color={LexiColors.error} />
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.proceedButton,
            pressed && styles.proceedButtonPressed,
          ]}
          onPress={handleProceed}
          accessibilityRole="button"
          accessibilityLabel="Proceed to Timetable"
        >
          <Text style={styles.proceedButtonText}>PROCEED TO TIMETABLE</Text>
          <Ionicons name="arrow-forward" size={18} color="#ffffff" />
        </Pressable>
      </View>

      <CatalogueSheet
        visible={catalogueOpen}
        department={department}
        level={level}
        existingCodes={state.courses.map((c) => c.code)}
        onClose={() => setCatalogueOpen(false)}
        onImport={(list) =>
          list.forEach((c) => addCourse({ code: c.code, title: c.title, units: c.units, lecturer: c.lecturer }))
        }
      />

      {/* Add Course Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Course</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={LexiColors.primary} />
              </Pressable>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Course Code *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. CSC 201"
                  placeholderTextColor={LexiColors.outline}
                  value={newCode}
                  onChangeText={setNewCode}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Course Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Data Structures & Algorithms"
                  placeholderTextColor={LexiColors.outline}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.twoColRow}>
                <View style={[styles.fieldBlock, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Credit Units</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="3"
                    placeholderTextColor={LexiColors.outline}
                    value={newUnits}
                    onChangeText={setNewUnits}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={[styles.fieldBlock, { flex: 2 }]}>
                  <Text style={styles.fieldLabel}>Lecturer (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Dr. Adeyemi"
                    placeholderTextColor={LexiColors.outline}
                    value={newLecturer}
                    onChangeText={setNewLecturer}
                  />
                </View>
              </View>

              <Pressable style={styles.saveCourseBtn} onPress={handleSaveCourse}>
                <Text style={styles.saveCourseBtnText}>Add to Course List</Text>
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
  sectionCard: {
    backgroundColor: '#F5F3EF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E3DF',
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: LexiColors.primary,
    marginBottom: 8,
  },
  levelRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  levelChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: LexiColors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: LexiColors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelChipSelected: {
    backgroundColor: LexiColors.primaryContainer,
    borderColor: LexiColors.primaryContainer,
  },
  levelChipText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: LexiColors.onSurface,
  },
  levelChipTextSelected: {
    color: '#ffffff',
  },
  semesterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  semesterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: LexiColors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: LexiColors.outlineVariant,
  },
  semesterTabSelected: {
    borderColor: LexiColors.primaryContainer,
    backgroundColor: '#ffffff',
  },
  semesterTabText: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 13,
    color: LexiColors.onSurfaceVariant,
  },
  semesterTabTextSelected: {
    color: LexiColors.primaryContainer,
    fontWeight: '600',
  },
  input: {
    height: 48,
    backgroundColor: LexiColors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: LexiColors.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontFamily: LexiFonts.bodyMd,
    fontSize: 14,
    color: LexiColors.onSurface,
  },
  deptSuggestions: {
    gap: 8,
    paddingTop: 10,
  },
  deptChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: LexiColors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: LexiColors.outlineVariant,
  },
  deptChipSelected: {
    backgroundColor: LexiColors.primaryContainer,
    borderColor: LexiColors.primaryContainer,
  },
  deptChipText: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 12,
    color: LexiColors.onSurfaceVariant,
  },
  deptChipTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  coursesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionHeadline: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 20,
    color: LexiColors.primary,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 12,
    color: LexiColors.onSurfaceVariant,
  },
  addCourseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: LexiColors.primaryContainer,
  },
  addCourseBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  addCourseBtnText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: '#ffffff',
  },
  courseList: {
    gap: 10,
  },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F5F3EF',
    borderWidth: 1,
    borderColor: '#E5E3DF',
  },
  courseBadgeBox: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: LexiColors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseBadgeCode: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '700',
  },
  courseDetails: {
    flex: 1,
  },
  courseTitle: {
    fontFamily: LexiFonts.bodyLg,
    fontSize: 14,
    fontWeight: '600',
    color: LexiColors.onSurface,
    marginBottom: 4,
  },
  courseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitChip: {
    backgroundColor: LexiColors.surfaceContainerLowest,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: LexiColors.outlineVariant,
  },
  unitChipText: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 11,
    color: LexiColors.primary,
    fontWeight: '600',
  },
  lecturerText: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 12,
    color: LexiColors.onSurfaceVariant,
    flexShrink: 1,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
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
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  saveCourseBtn: {
    height: 48,
    backgroundColor: LexiColors.primaryContainer,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveCourseBtnText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
});

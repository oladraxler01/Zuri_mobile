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
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardSheet } from '@/components/ui/keyboard-sheet';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useZuriFonts } from '@/hooks/use-zuri-fonts';
import { useAcademic } from '@/context/academic-context';
import { CatalogueSheet } from '@/components/onboarding/catalogue-sheet';
import { catalogueFor } from '@/constants/course-catalogue';
import { makeStyles, useTheme, type as typeStyles } from '@/theme';

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
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const [fontsLoaded] = useZuriFonts();
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
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Zuri</Text>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step 1 of 3</Text>
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
          <Text style={styles.headline}>Personalize your semester</Text>
          <Text style={styles.subtitle}>
            Set up your current academic level and registered courses so Zuri can organize your lecture summaries and smart reminders.
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
                    color={isSelected ? colors.text : colors['text-subtle']}
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
            placeholderTextColor={colors['text-subtle']}
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
            <Ionicons name="add" size={18} color={colors['on-primary']} />
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
          <Ionicons name="library-outline" size={20} color={colors.text} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: typeStyles.headline.fontFamily, fontSize: 14, color: colors.text }}>Import from course catalogue</Text>
            <Text style={{ fontFamily: typeStyles.body.fontFamily, fontSize: 12, color: colors['text-muted'], marginTop: 2 }}>
              {catalogueFor(department, level).length
                ? `${catalogueFor(department, level).length} ${department} courses for ${level}`
                : `Pick your department and level above`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors['text-subtle']} />
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
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          ))}
        </View>
      </KeyboardAwareScrollView>

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
          <Ionicons name="arrow-forward" size={18} color={colors['on-primary']} />
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
      <Modal statusBarTranslucent navigationBarTranslucent
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardSheet backdropStyle={styles.modalBackdrop} sheetStyle={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Course</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Course Code *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. CSC 201"
                  placeholderTextColor={colors['text-subtle']}
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
                  placeholderTextColor={colors['text-subtle']}
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
                    placeholderTextColor={colors['text-subtle']}
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
                    placeholderTextColor={colors['text-subtle']}
                    value={newLecturer}
                    onChangeText={setNewLecturer}
                  />
                </View>
              </View>

              <Pressable style={styles.saveCourseBtn} onPress={handleSaveCourse}>
                <Text style={styles.saveCourseBtnText}>Add to Course List</Text>
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
  sectionCard: {
    backgroundColor: t.colors['surface-sunken'],
    borderRadius: t.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: t.colors.border,
    marginBottom: 24,
  },
  sectionLabel: { ...t.type.subhead, color: t.colors.text,
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
    borderRadius: t.radius.md,
    backgroundColor: t.colors['surface-raised'],
    borderWidth: 1,
    borderColor: t.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelChipSelected: {
    backgroundColor: t.colors.primary,
    borderColor: t.colors.primary,
  },
  levelChipText: { ...t.type.subhead, color: t.colors.text,
  },
  levelChipTextSelected: {
    color: t.colors['on-primary'],
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
    borderRadius: t.radius.md,
    backgroundColor: t.colors['surface-raised'],
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  semesterTabSelected: {
    borderColor: t.colors.primary,
    backgroundColor: t.colors['surface-raised'],
  },
  semesterTabText: { ...t.type.footnote, color: t.colors['text-muted'],
  },
  semesterTabTextSelected: {
    color: t.colors.text,
    fontWeight: '600',
  },
  input: { ...t.type.callout, height: 48,
    backgroundColor: t.colors['surface-raised'],
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.md,
    paddingHorizontal: 14,
    color: t.colors.text,
  },
  deptSuggestions: {
    gap: 8,
    paddingTop: 10,
  },
  deptChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors['surface-raised'],
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  deptChipSelected: {
    backgroundColor: t.colors.primary,
    borderColor: t.colors.primary,
  },
  deptChipText: { ...t.type.caption, color: t.colors['text-muted'],
  },
  deptChipTextSelected: {
    color: t.colors['on-primary'],
    fontWeight: '600',
  },
  coursesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionHeadline: { ...t.type['title-2'], color: t.colors.text,
    },
  sectionSubtitle: { ...t.type.caption, color: t.colors['text-muted'],
  },
  addCourseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.primary,
  },
  addCourseBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  addCourseBtnText: { ...t.type.subhead, color: t.colors['on-primary'],
  },
  courseList: {
    gap: 10,
  },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: t.radius.md,
    backgroundColor: t.colors['surface-sunken'],
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  courseBadgeBox: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseBadgeCode: { ...t.type.caption, color: t.colors['on-primary'],
    },
  courseDetails: {
    flex: 1,
  },
  courseTitle: { ...t.type.callout, color: t.colors.text,
    marginBottom: 4,
  },
  courseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitChip: {
    backgroundColor: t.colors['surface-raised'],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: t.radius.sm,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  unitChipText: { ...t.type.caption, color: t.colors.text,
    },
  lecturerText: { ...t.type.caption, color: t.colors['text-muted'],
    flexShrink: 1,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: t.radius.md,
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
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  saveCourseBtn: {
    height: 48,
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveCourseBtnText: { ...t.type.subhead, color: t.colors['on-primary'],
    },
}));

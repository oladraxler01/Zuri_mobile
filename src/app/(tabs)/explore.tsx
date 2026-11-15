import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAcademicContext, CourseItem } from '@/context/academic-context';
import { useLectures } from '@/context/lectures-context';
import { LexiColors, LexiFonts } from '@/constants/lexi-theme';

export default function CoursesScreen() {
  const insets = useSafeAreaInsets();
  const { state, addCourse, removeCourse } = useAcademicContext();
  const { lectures } = useLectures();
  const lectureCounts = lectures.reduce<Record<string, number>>((acc, l) => {
    if (l.courseId) acc[l.courseId] = (acc[l.courseId] ?? 0) + 1;
    return acc;
  }, {});

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newUnits, setNewUnits] = useState('3');
  const [newLecturer, setNewLecturer] = useState('');

  const totalUnits = state.courses.reduce((sum: number, c: CourseItem) => sum + (c.units || 0), 0);

  const handleAddCourse = () => {
    if (!newCode.trim() || !newTitle.trim()) return;
    addCourse({
      code: newCode.trim().toUpperCase(),
      title: newTitle.trim(),
      units: parseInt(newUnits, 10) || 3,
      lecturer: newLecturer.trim() || 'Department Lecturer',
      color: '#272e0a',
    });
    setNewCode('');
    setNewTitle('');
    setNewLecturer('');
    setIsAddModalOpen(false);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Top App Bar */}
      <View style={styles.topAppBar}>
        <View style={styles.appBarLeft}>
          <Text style={styles.appTitle}>Courses</Text>
          <View style={styles.semesterBadge}>
            <Text style={styles.semesterBadgeText}>{state.semester}</Text>
          </View>
        </View>

        <Pressable
          style={styles.addCourseButton}
          onPress={() => setIsAddModalOpen(true)}
        >
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.addCourseButtonText}>Add Course</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Semester Summary Banner */}
        <View style={styles.summaryBanner}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>ENROLLED</Text>
            <Text style={styles.summaryValue}>{state.courses.length} Courses</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>TOTAL UNITS</Text>
            <Text style={styles.summaryValue}>{totalUnits} Units</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>LEVEL</Text>
            <Text style={styles.summaryValue}>{state.level}</Text>
          </View>
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Enrolled Course Catalog</Text>
          <Text style={styles.sectionSubtitle}>
            Tap a course to see its schedule and recorded lectures
          </Text>
        </View>

        {/* Course Cards */}
        {state.courses.map((course: CourseItem) => {
          // Count lectures for this course in timetable
          const slots = state.timetable.filter(
            (t: any) => t.courseCode.toLowerCase() === course.code.toLowerCase()
          );

          return (
            <Pressable
              key={course.id}
              style={styles.courseCard}
              onPress={() => router.push(`/course/${course.id}` as any)}
              accessibilityRole="button"
              accessibilityLabel={`${course.code} ${course.title}`}
            >
              <View style={styles.courseCardHeader}>
                <View style={styles.codePill}>
                  <Text style={styles.codePillText}>{course.code}</Text>
                </View>
                <View style={styles.unitsBadge}>
                  <Text style={styles.unitsBadgeText}>{course.units} Credit Units</Text>
                </View>
              </View>

              <Text style={styles.courseTitle}>{course.title}</Text>

              <View style={styles.lecturerRow}>
                <Ionicons name="person-outline" size={14} color="#77786c" />
                <Text style={styles.lecturerText}>{course.lecturer || 'Faculty Staff'}</Text>
              </View>

              <View style={styles.slotsRow}>
                <Ionicons name="time-outline" size={14} color="#77786c" />
                <Text style={styles.slotsText}>
                  {slots.length > 0
                    ? `${slots.length} weekly lecture session${slots.length > 1 ? 's' : ''}`
                    : 'No timetable slots assigned yet'}
                </Text>
              </View>

              <View style={styles.courseActions}>
                <Pressable
                  style={styles.inspectButton}
                  onPress={() => router.push({ pathname: '/course/[id]', params: { id: course.id, tab: 'lectures' } } as any)}
                >
                  <Ionicons name="albums-outline" size={14} color="#c5832b" />
                  <Text style={styles.inspectButtonText}>
                    Lectures{lectureCounts[course.id] ? ` · ${lectureCounts[course.id]}` : ''}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.recordButton}
                  onPress={() =>
                    router.push({
                      pathname: '/lecture-recording',
                      params: { courseId: course.id, courseCode: course.code, courseTitle: course.title },
                    } as any)
                  }
                >
                  <Ionicons name="mic" size={14} color="#272e0a" />
                  <Text style={styles.recordButtonText}>Record Lecture</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Add Course Modal */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>Enroll New Course</Text>
              <Pressable onPress={() => setIsAddModalOpen(false)}>
                <Ionicons name="close" size={22} color="#1b1c19" />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Course Code</Text>
            <TextInput
              style={styles.textInput}
              value={newCode}
              onChangeText={setNewCode}
              placeholder="e.g. CSC 305"
              placeholderTextColor="#999"
              autoCapitalize="characters"
            />

            <Text style={styles.inputLabel}>Course Title</Text>
            <TextInput
              style={styles.textInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="e.g. Software Engineering Methods"
              placeholderTextColor="#999"
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Units</Text>
                <TextInput
                  style={styles.textInput}
                  value={newUnits}
                  onChangeText={setNewUnits}
                  placeholder="3"
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 2 }}>
                <Text style={styles.inputLabel}>Lecturer</Text>
                <TextInput
                  style={styles.textInput}
                  value={newLecturer}
                  onChangeText={setNewLecturer}
                  placeholder="e.g. Dr. Okafor"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <Pressable style={styles.saveModalButton} onPress={handleAddCourse}>
              <Text style={styles.saveModalButtonText}>Add to Curriculum</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fbf9f4',
  },
  topAppBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(199, 199, 185, 0.25)',
    backgroundColor: '#fbf9f4',
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appTitle: {
    fontFamily: LexiFonts.displayBold,
    fontSize: 26,
    color: '#272e0a',
  },
  semesterBadge: {
    backgroundColor: '#f5f3ee',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.3)',
  },
  semesterBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5b6239',
  },
  addCourseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#272e0a',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addCourseButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.25)',
    marginBottom: 20,
  },
  summaryCol: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: LexiFonts.bodyMedium,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#77786c',
    marginBottom: 4,
  },
  summaryValue: {
    fontFamily: LexiFonts.headlineMedium,
    fontSize: 16,
    fontWeight: '700',
    color: '#272e0a',
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(199, 199, 185, 0.3)',
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: LexiFonts.headlineMedium,
    fontSize: 20,
    fontWeight: '700',
    color: '#1b1c19',
  },
  sectionSubtitle: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 13,
    color: '#77786c',
    marginTop: 2,
  },
  courseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.25)',
    marginBottom: 14,
  },
  courseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codePill: {
    backgroundColor: '#3d441e',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codePillText: {
    fontFamily: LexiFonts.bodyMedium,
    fontSize: 12,
    fontWeight: '700',
    color: '#dfe7b3',
  },
  unitsBadge: {
    backgroundColor: '#f5f3ee',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  unitsBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#46483d',
  },
  courseTitle: {
    fontFamily: LexiFonts.headlineMedium,
    fontSize: 17,
    fontWeight: '700',
    color: '#1b1c19',
    lineHeight: 23,
    marginBottom: 8,
  },
  lecturerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  lecturerText: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 13,
    color: '#46483d',
  },
  slotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  slotsText: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 13,
    color: '#77786c',
  },
  courseActions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(199, 199, 185, 0.2)',
    paddingTop: 12,
  },
  inspectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fbf5ed',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(197, 131, 43, 0.25)',
  },
  inspectButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c5832b',
  },
  recordButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f5f3ee',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.35)',
  },
  recordButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#272e0a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#c7c7b9',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeading: {
    fontFamily: LexiFonts.headlineMedium,
    fontSize: 18,
    fontWeight: '700',
    color: '#1b1c19',
  },
  inputLabel: {
    fontFamily: LexiFonts.bodyMedium,
    fontSize: 13,
    fontWeight: '600',
    color: '#46483d',
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: '#f5f3ee',
    borderWidth: 1,
    borderColor: '#e4e2dd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1b1c19',
  },
  saveModalButton: {
    backgroundColor: '#272e0a',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  saveModalButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});

import { useState } from 'react';
import {
  View,
  Text,
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

export default function AcademicHomeScreen() {
  const router = useRouter();
  const [fontsLoaded] = useLexiFonts();
  const { state } = useAcademic();

  // Modals for interactive actions
  const [syllabusVisible, setSyllabusVisible] = useState(false);
  const [prepNotesVisible, setPrepNotesVisible] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [focusSessionVisible, setFocusSessionVisible] = useState(false);

  if (!fontsLoaded) {
    return <View style={styles.container} />;
  }

  const handleStartRecording = (courseCode?: string, courseTitle?: string) => {
    router.push({
      pathname: '/lecture-recording',
      params: {
        courseCode: courseCode || 'CSC 301',
        courseTitle: courseTitle || 'Design and Analysis of Algorithms',
      },
    } as any);
  };

  const nextClass = state.timetable[0] || {
    courseCode: 'CSC 301',
    startTime: '9:00 AM',
    endTime: '11:30 AM',
    venue: 'Lecture Hall 4, Science Block',
  };

  const laterClasses = state.timetable.slice(1, 3);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f7f2" />

      {/* Top Navigation Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="school" size={24} color="#272e0a" />
          <Text style={styles.headerLogo}>LEXI</Text>
        </View>

        <Pressable
          style={styles.profileBtn}
          onPress={() => Alert.alert('Student Profile', `${state.department} • ${state.level}\n${state.university}`)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Account Profile"
        >
          <Ionicons name="person-circle-outline" size={28} color="#272e0a" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Proactive Lecture Recording Alert Banner */}
        <View style={styles.proactiveAlertCard}>
          <View style={styles.alertHeaderRow}>
            <View style={styles.alertBadge}>
              <View style={styles.pulsingDot} />
              <Text style={styles.alertBadgeText}>UPCOMING IN 12 MINS</Text>
            </View>
            <Ionicons name="notifications" size={16} color="#c5832b" />
          </View>

          <Text style={styles.alertTitle}>Ready to capture {nextClass.courseCode}?</Text>
          <Text style={styles.alertSubtitle}>
            Your lecture at {nextClass.venue} is starting shortly. Tap below to automatically record, transcribe, and generate revision notes.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.alertRecordBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={() => handleStartRecording(nextClass.courseCode, 'Design and Analysis of Algorithms')}
          >
            <Ionicons name="mic" size={18} color="#ffffff" />
            <Text style={styles.alertRecordBtnText}>Start Recording Lecture</Text>
          </Pressable>
        </View>

        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingTitle}>Good morning,{'\n'}Marvellous.</Text>
          <Text style={styles.greetingSubtitle}>
            Your day is structured around algorithm analysis and discrete mathematics.
          </Text>
        </View>

        {/* Timeline Structure */}
        <View style={styles.timelineContainer}>
          {/* Vertical Timeline Guide Line */}
          <View style={styles.timelineGuideLine} />

          {/* NEXT UP Section */}
          <View style={styles.timelineSection}>
            <View style={styles.milestoneDotGold} />

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.tagGold}>NEXT UP</Text>
              <Text style={styles.timeTagText}>
                {nextClass.startTime} — {nextClass.endTime}
              </Text>
            </View>

            <View style={styles.nextCard}>
              <View style={styles.cardGoldGlow} />

              <Text style={styles.nextCourseTitle}>
                {nextClass.courseCode}: Design and Analysis of Algorithms
              </Text>

              <View style={styles.venueRow}>
                <Ionicons name="location-outline" size={16} color={LexiColors.onSurfaceVariant} />
                <Text style={styles.venueText}>{nextClass.venue}</Text>
              </View>

              <View style={styles.actionButtonsRow}>
                <Pressable
                  style={styles.primaryActionBtn}
                  onPress={() => setSyllabusVisible(true)}
                >
                  <Text style={styles.primaryActionBtnText}>Open Syllabus</Text>
                </Pressable>

                <Pressable
                  style={styles.secondaryActionBtn}
                  onPress={() => setPrepNotesVisible(true)}
                >
                  <Text style={styles.secondaryActionBtnText}>Prep Notes</Text>
                </Pressable>

                <Pressable
                  style={styles.micQuickBtn}
                  onPress={() => handleStartRecording(nextClass.courseCode)}
                  hitSlop={6}
                  accessibilityLabel="Record Lecture"
                >
                  <Ionicons name="mic-outline" size={18} color="#272e0a" />
                </Pressable>
              </View>
            </View>
          </View>

          {/* RECOMMENDED REVIEW Section ("From Your Last Class") */}
          <View style={styles.timelineSection}>
            <View style={styles.milestoneDotBulb}>
              <Ionicons name="bulb-outline" size={12} color="#272e0a" />
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.tagMuted}>RECOMMENDED REVIEW</Text>
            </View>

            <View style={styles.reviewCard}>
              <View style={styles.reviewCardTop}>
                <Text style={styles.reviewTopicTitle}>Optimal Substructure</Text>
                <View style={styles.durationChip}>
                  <Text style={styles.durationChipText}>7 MIN</Text>
                </View>
              </View>

              <Text style={styles.reviewDesc}>
                Based on your notes from the last CSC 301 lecture, reviewing this concept will prepare you for today’s dynamic programming introduction.
              </Text>

              <Pressable
                style={styles.reviewLinkRow}
                onPress={() => setReviewVisible(true)}
              >
                <Text style={styles.reviewLinkText}>Start Quick Review</Text>
                <Ionicons name="arrow-forward" size={15} color="#c5832b" />
              </Pressable>
            </View>
          </View>

          {/* LATER TODAY Section */}
          <View style={styles.timelineSection}>
            <View style={styles.milestoneDotSmall} />

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.tagMuted}>LATER TODAY</Text>
            </View>

            <View style={styles.laterList}>
              <Pressable
                style={styles.laterItem}
                onPress={() => Alert.alert('MTH 302', 'Abstract Algebra • Room 214, Math Dept.')}
              >
                <Text style={styles.laterTime}>1:00 PM</Text>
                <View style={styles.laterDetails}>
                  <Text style={styles.laterTitle}>MTH 302: Abstract Algebra</Text>
                  <Text style={styles.laterVenue}>Room 214, Math Dept.</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={LexiColors.outline} />
              </Pressable>

              <View style={styles.laterDivider} />

              <Pressable
                style={styles.laterItem}
                onPress={() => Alert.alert('GST 304', 'Peace and Conflict Resolution • Main Auditorium')}
              >
                <Text style={styles.laterTime}>3:30 PM</Text>
                <View style={styles.laterDetails}>
                  <Text style={styles.laterTitle}>GST 304: Peace and Conflict Resolution</Text>
                  <Text style={styles.laterVenue}>Main Auditorium</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={LexiColors.outline} />
              </Pressable>
            </View>
          </View>

          {/* QUICK ACTIONS Section */}
          <View style={styles.quickActionsSection}>
            <Text style={styles.tagMuted}>QUICK ACTIONS</Text>
            <View style={styles.quickActionsRow}>
              <Pressable
                style={styles.quickActionCard}
                onPress={() => setFocusSessionVisible(true)}
              >
                <Ionicons name="timer-outline" size={20} color="#272e0a" />
                <Text style={styles.quickActionTitle}>Start Focus Session</Text>
              </Pressable>

              <Pressable
                style={styles.quickActionCard}
                onPress={() => Alert.alert('Reading List', 'Algorithms (Cormen) Ch. 15: Dynamic Programming & Optimal Memoization.')}
              >
                <Ionicons name="book-outline" size={20} color="#272e0a" />
                <Text style={styles.quickActionTitle}>Review Reading List</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Syllabus Modal */}
      <Modal
        visible={syllabusVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSyllabusVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>CSC 301 Syllabus & Outline</Text>
              <Pressable onPress={() => setSyllabusVisible(false)}>
                <Ionicons name="close" size={24} color={LexiColors.primary} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 340 }}>
              <Text style={styles.modalBodyText}>
                • Week 1-2: Asymptotic Notations ($O$, $\Omega$, $\Theta$){'\n'}
                • Week 3-4: Divide & Conquer (MergeSort, QuickSort Analysis){'\n'}
                • Week 5-6: Dynamic Programming (Optimal Substructure & Memoization){'\n'}
                • Week 7-8: Greedy Algorithms (Huffman Coding, Kruskal/Prim){'\n'}
                • Week 9-10: Graph Algorithms (BFS, DFS, Dijkstra, Bellman-Ford){'\n'}
                • Week 11-12: NP-Completeness & Approximation
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Prep Notes Modal */}
      <Modal
        visible={prepNotesVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPrepNotesVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>CSC 301: Key Prep Notes</Text>
              <Pressable onPress={() => setPrepNotesVisible(false)}>
                <Ionicons name="close" size={24} color={LexiColors.primary} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 340 }}>
              <Text style={styles.modalBodyText}>
                📌 <Text style={{ fontWeight: '700' }}>Dynamic Programming Core Rule:</Text>{'\n'}
                Problems must exhibit <Text style={{ fontStyle: 'italic' }}>Optimal Substructure</Text> (optimal solution to problem contains optimal solutions to subproblems) and <Text style={{ fontStyle: 'italic' }}>Overlapping Subproblems</Text>.{'\n\n'}
                💡 <Text style={{ fontWeight: '700' }}>Memoization vs Tabulation:</Text>{'\n'}
                • Top-down with cache (Memoization){'\n'}
                • Bottom-up iterative table fill (Tabulation)
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Quick Review Modal */}
      <Modal
        visible={reviewVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Flash Review: Optimal Substructure</Text>
              <Pressable onPress={() => setReviewVisible(false)}>
                <Ionicons name="close" size={24} color={LexiColors.primary} />
              </Pressable>
            </View>
            <View style={styles.flashcardBox}>
              <Text style={styles.flashcardQ}>What does "Optimal Substructure" mean?</Text>
              <Text style={styles.flashcardA}>
                It means that an optimal solution to the problem contains within it optimal solutions to subproblems. For example, the shortest path from A to C through B implies the shortest path from A to B and B to C!
              </Text>
            </View>
            <Pressable
              style={styles.doneBtn}
              onPress={() => setReviewVisible(false)}
            >
              <Text style={styles.doneBtnText}>Mark as Reviewed (7m)</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Focus Session Modal */}
      <Modal
        visible={focusSessionVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFocusSessionVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pomodoro Focus Session</Text>
              <Pressable onPress={() => setFocusSessionVisible(false)}>
                <Ionicons name="close" size={24} color={LexiColors.primary} />
              </Pressable>
            </View>
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={{ fontFamily: LexiFonts.headlineLgMobile, fontSize: 40, color: '#272e0a' }}>
                25:00
              </Text>
              <Text style={{ fontFamily: LexiFonts.bodyMd, color: LexiColors.onSurfaceVariant, marginTop: 4 }}>
                Algorithm Analysis Study Interval
              </Text>
            </View>
            <Pressable
              style={styles.doneBtn}
              onPress={() => {
                setFocusSessionVisible(false);
                Alert.alert('Focus Session Started', 'Do Not Disturb mode active for the next 25 minutes.');
              }}
            >
              <Text style={styles.doneBtnText}>Start 25m Timer</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f7f2', // surface-cream
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(199, 199, 185, 0.25)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 22,
    letterSpacing: -0.5,
    color: '#272e0a',
    fontWeight: '700',
  },
  profileBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  // Proactive Alert Banner
  proactiveAlertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#c5832b',
    marginBottom: 24,
    shadowColor: '#c5832b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(197, 131, 43, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ba1a1a',
  },
  alertBadgeText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 11,
    color: '#c5832b',
    letterSpacing: 0.5,
  },
  alertTitle: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 17,
    color: '#272e0a',
    fontWeight: '600',
    marginBottom: 4,
  },
  alertSubtitle: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 13,
    lineHeight: 18,
    color: LexiColors.onSurfaceVariant,
    marginBottom: 14,
  },
  alertRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#272e0a',
    paddingVertical: 12,
    borderRadius: 10,
  },
  alertRecordBtnText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: '#ffffff',
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  // Greeting
  greetingSection: {
    marginBottom: 24,
  },
  greetingTitle: {
    fontFamily: LexiFonts.headlineLgMobile,
    fontSize: 32,
    lineHeight: 38,
    color: '#272e0a',
    fontWeight: '700',
    marginBottom: 6,
  },
  greetingSubtitle: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 15,
    lineHeight: 22,
    color: LexiColors.onSurfaceVariant,
  },
  // Timeline
  timelineContainer: {
    position: 'relative',
    paddingLeft: 22,
  },
  timelineGuideLine: {
    position: 'absolute',
    top: 6,
    bottom: 40,
    left: 7,
    width: 1.5,
    backgroundColor: 'rgba(199, 199, 185, 0.4)',
  },
  timelineSection: {
    position: 'relative',
    marginBottom: 28,
  },
  milestoneDotGold: {
    position: 'absolute',
    left: -22,
    top: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#c5832b',
    backgroundColor: '#f9f7f2',
    zIndex: 2,
  },
  milestoneDotBulb: {
    position: 'absolute',
    left: -22,
    top: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#eae8e3',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  milestoneDotSmall: {
    position: 'absolute',
    left: -19,
    top: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: LexiColors.outlineVariant,
    zIndex: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tagGold: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 11,
    letterSpacing: 1,
    color: '#c5832b',
    fontWeight: '700',
  },
  tagMuted: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 11,
    letterSpacing: 1,
    color: LexiColors.outline,
    fontWeight: '700',
    marginBottom: 8,
  },
  timeTagText: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 13,
    color: LexiColors.onSurfaceVariant,
  },
  // Next Card
  nextCard: {
    position: 'relative',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(197, 131, 43, 0.25)',
    shadowColor: '#c5832b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
    overflow: 'hidden',
  },
  cardGoldGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 80,
    height: 80,
    backgroundColor: 'rgba(197, 131, 43, 0.04)',
    borderBottomLeftRadius: 80,
  },
  nextCourseTitle: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 19,
    color: '#272e0a',
    fontWeight: '600',
    marginBottom: 6,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  venueText: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 13,
    color: LexiColors.onSurfaceVariant,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryActionBtn: {
    backgroundColor: '#272e0a',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  primaryActionBtnText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: '#ffffff',
  },
  secondaryActionBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.6)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  secondaryActionBtnText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: '#272e0a',
  },
  micQuickBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#f5f3ee',
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  // Review Card
  reviewCard: {
    backgroundColor: '#f5f3ee',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#c5832b',
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.25)',
  },
  reviewCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reviewTopicTitle: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 17,
    color: '#272e0a',
    fontWeight: '600',
  },
  durationChip: {
    backgroundColor: '#eae8e3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationChipText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 10,
    color: LexiColors.primary,
  },
  reviewDesc: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 13,
    lineHeight: 18,
    color: LexiColors.onSurfaceVariant,
    marginBottom: 12,
  },
  reviewLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewLinkText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: '#c5832b',
  },
  // Later Today
  laterList: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.3)',
    overflow: 'hidden',
  },
  laterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  laterTime: {
    width: 68,
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: LexiColors.onSurfaceVariant,
  },
  laterDetails: {
    flex: 1,
  },
  laterTitle: {
    fontFamily: LexiFonts.bodyLg,
    fontSize: 14,
    fontWeight: '600',
    color: '#272e0a',
  },
  laterVenue: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 12,
    color: LexiColors.onSurfaceVariant,
    marginTop: 2,
  },
  laterDivider: {
    height: 1,
    backgroundColor: 'rgba(199, 199, 185, 0.25)',
    marginLeft: 82,
  },
  // Quick actions
  quickActionsSection: {
    marginTop: 6,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.3)',
    gap: 8,
  },
  quickActionTitle: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: '#272e0a',
  },
  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
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
    color: '#272e0a',
    fontWeight: '700',
  },
  modalBodyText: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 14,
    lineHeight: 22,
    color: LexiColors.onSurface,
  },
  flashcardBox: {
    backgroundColor: '#f5f3ee',
    borderRadius: 12,
    padding: 16,
    marginVertical: 14,
  },
  flashcardQ: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 16,
    color: '#272e0a',
    fontWeight: '600',
    marginBottom: 8,
  },
  flashcardA: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 14,
    lineHeight: 20,
    color: LexiColors.onSurfaceVariant,
  },
  doneBtn: {
    backgroundColor: '#272e0a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  doneBtnText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 14,
    color: '#ffffff',
  },
});

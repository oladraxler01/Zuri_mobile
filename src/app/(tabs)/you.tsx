import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Modal,
  TextInput,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAcademicContext } from '@/context/academic-context';
import { useSession } from '@/context/session-context';
import { LexiColors, LexiFonts } from '@/constants/lexi-theme';

const AVATAR_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC-7a6mo_76vDg5gProosF9AIUlxeh95PMa8ASWk-7JHJiclD1FwhDyoFXv5JC1jsXogDqRKRxv5nYW3nvqVyWO14simo3NRBkz7XyfLlhkRMuVRe8qn30-ooQi0ckFR_gDk8oH-aCEMlD1CsgxROaPYhsu5HmK_yCGKsiKwL6I6g0gTTGxkvPpU_M2Vu5pr-EoLbk2-w_tHJlho6hcU_RwnfBPzjqWQ1DmlVD4yAxfZGJmiTZXGdLU';

export default function StudentProfileScreen() {
  const insets = useSafeAreaInsets();
  const { state, setAcademicInfo, updatePreferences } = useAcademicContext();
  const { signOut } = useSession();

  // Local state for profile identity
  const [studentName, setStudentName] = useState('Alex Mercer');
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isPrefModalVisible, setIsPrefModalVisible] = useState(false);
  const [isUniModalVisible, setIsUniModalVisible] = useState(false);

  // Edit draft fields
  const [draftName, setDraftName] = useState(studentName);
  const [draftDepartment, setDraftDepartment] = useState(state.department || 'Computer Science');
  const [draftLevel, setDraftLevel] = useState(state.level || '300L');

  const handleSaveProfile = () => {
    setStudentName(draftName.trim() || 'Alex Mercer');
    setAcademicInfo({
      department: draftDepartment.trim() || 'Computer Science',
      level: draftLevel.trim() || '300L',
    });
    setIsEditModalVisible(false);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Top App Bar */}
      <View style={styles.topAppBar}>
        <View style={styles.appBarLeft}>
          <Pressable onPress={() => setIsEditModalVisible(true)} style={styles.avatarWrapper}>
            <Image
              source={{ uri: AVATAR_URL }}
              style={styles.avatarImage}
              defaultSource={{ uri: AVATAR_URL }}
            />
          </Pressable>
          <Text style={styles.appTitle}>Lexi</Text>
        </View>

        <Pressable
          style={styles.notificationButton}
          onPress={() => Alert.alert('Notifications', 'You have no unread academic alerts right now.')}
        >
          <Ionicons name="notifications-outline" size={22} color="#46483d" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Academic Identity Card */}
        <View style={styles.card}>
          <View style={styles.identityHeader}>
            <View>
              <Text style={styles.studentName}>{studentName}</Text>
              <View style={styles.schoolRow}>
                <Ionicons name="school" size={16} color="#46483d" />
                <Text style={styles.schoolText}>{state.university || 'Veritas University'}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => {
                setDraftName(studentName);
                setDraftDepartment(state.department || 'Computer Science');
                setDraftLevel(state.level || '300L');
                setIsEditModalVisible(true);
              }}
              style={styles.editBadge}
            >
              <Ionicons name="pencil" size={14} color="#5b6239" />
              <Text style={styles.editBadgeText}>Edit</Text>
            </Pressable>
          </View>

          <View style={styles.infoTable}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Program</Text>
              <Text style={styles.infoValue}>{state.department || 'Computer Science'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Level</Text>
              <Text style={styles.infoValue}>{state.level.replace('L', '') || '300'}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Status</Text>
              <View style={styles.activeStatusPill}>
                <Text style={styles.activeStatusText}>ACTIVE</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Settings Navigation */}
        <View style={styles.settingsNav}>
          <Pressable style={styles.navItemActive}>
            <Ionicons name="person" size={20} color="#c5832b" />
            <Text style={styles.navTextActive}>Profile Overview</Text>
          </Pressable>

          <Pressable
            style={styles.navItem}
            onPress={() => setIsPrefModalVisible(true)}
          >
            <Ionicons name="options-outline" size={20} color="#46483d" />
            <Text style={styles.navText}>Preferences</Text>
            <Ionicons name="chevron-forward" size={16} color="#c7c7b9" style={styles.navChevron} />
          </Pressable>

          <Pressable
            style={styles.navItem}
            onPress={() => setIsUniModalVisible(true)}
          >
            <Ionicons name="server-outline" size={20} color="#46483d" />
            <Text style={styles.navText}>University Data</Text>
            <Ionicons name="chevron-forward" size={16} color="#c7c7b9" style={styles.navChevron} />
          </Pressable>

          <Pressable
            style={styles.navItem}
            onPress={() =>
              Alert.alert(
                'Privacy & Security',
                'Your lecture recordings and learning DNA models are protected with end-to-end 256-bit encryption and stored strictly for your academic use.'
              )
            }
          >
            <Ionicons name="shield-checkmark-outline" size={20} color="#46483d" />
            <Text style={styles.navText}>Privacy & Security</Text>
            <Ionicons name="chevron-forward" size={16} color="#c7c7b9" style={styles.navChevron} />
          </Pressable>
        </View>

        {/* Learning DNA Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Learning DNA</Text>
        </View>

        <View style={styles.dnaGrid}>
          {/* Strengths Card */}
          <View style={styles.dnaCard}>
            <View style={styles.dnaTitleRow}>
              <Ionicons name="trending-up" size={20} color="#272e0a" />
              <Text style={styles.dnaCardTitle}>Cognitive Strengths</Text>
            </View>

            <View style={styles.skillItem}>
              <View style={styles.skillHeader}>
                <Text style={styles.skillName}>Algorithmic Logic</Text>
                <Text style={styles.skillPercent}>90%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: '90%', backgroundColor: '#272e0a' }]} />
              </View>
            </View>

            <View style={styles.skillItem}>
              <View style={styles.skillHeader}>
                <Text style={styles.skillName}>Pattern Recognition</Text>
                <Text style={styles.skillPercent}>85%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: '85%', backgroundColor: '#272e0a' }]} />
              </View>
            </View>

            <View style={styles.skillItem}>
              <View style={styles.skillHeader}>
                <Text style={styles.skillName}>Systems Architecture</Text>
                <Text style={styles.skillPercent}>75%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: '75%', backgroundColor: '#272e0a' }]} />
              </View>
            </View>
          </View>

          {/* Areas for Growth Card */}
          <View style={styles.dnaCard}>
            <View style={styles.dnaTitleRow}>
              <Ionicons name="sparkles" size={20} color="#c5832b" />
              <Text style={styles.dnaCardTitle}>Growth Vectors</Text>
            </View>

            <View style={styles.skillItem}>
              <View style={styles.skillHeader}>
                <Text style={styles.skillName}>Abstract Mathematics</Text>
                <Text style={styles.skillPercentGold}>45%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: '45%', backgroundColor: '#c5832b' }]} />
              </View>
            </View>

            <View style={styles.skillItem}>
              <View style={styles.skillHeader}>
                <Text style={styles.skillName}>Technical Communication</Text>
                <Text style={styles.skillPercentGold}>60%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: '60%', backgroundColor: '#c5832b' }]} />
              </View>
            </View>

            <Text style={styles.growthAdvisoryText}>
              Focus recommended on discrete structures and advanced calculus concepts before entering level 400 courses.
            </Text>
          </View>
        </View>

        {/* Recent Academic Context Bento */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Academic Context</Text>
        </View>

        <View style={styles.bentoContainer}>
          {/* Latest Research */}
          <Pressable
            style={styles.researchBento}
            onPress={() => router.push('/(tabs)/research' as any)}
          >
            <View style={styles.researchBentoLeft}>
              <Text style={styles.bentoLabelCaps}>LATEST RESEARCH</Text>
              <Text style={styles.bentoMainText}>Distributed Systems Consensus</Text>
            </View>
            <View style={styles.bentoArrow}>
              <Ionicons name="arrow-forward" size={18} color="#77786c" />
            </View>
          </Pressable>

          {/* Current GPA */}
          <View style={styles.gpaBento}>
            <Text style={styles.bentoLabelCaps}>CURRENT GPA</Text>
            <View style={styles.gpaValueRow}>
              <Text style={styles.gpaBigNumber}>3.8</Text>
              <Text style={styles.gpaOutOf}>/4.0</Text>
            </View>
          </View>
        </View>

        {/* Quick Log Out / Switch Profile Row */}
        <Pressable
          style={styles.switchAccountButton}
          onPress={() => {
            signOut();
            router.replace('/onboarding/welcome' as any);
          }}
        >
          <Ionicons name="log-out-outline" size={18} color="#ba1a1a" />
          <Text style={styles.switchAccountText}>Sign Out of Academic Session</Text>
        </Pressable>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Academic Identity</Text>
              <Pressable onPress={() => setIsEditModalVisible(false)}>
                <Ionicons name="close" size={22} color="#1b1c19" />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.textInput}
              value={draftName}
              onChangeText={setDraftName}
              placeholder="e.g. Alex Mercer"
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Program / Department</Text>
            <TextInput
              style={styles.textInput}
              value={draftDepartment}
              onChangeText={setDraftDepartment}
              placeholder="e.g. Computer Science"
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Level</Text>
            <View style={styles.levelPillsRow}>
              {['100L', '200L', '300L', '400L', '500L'].map((lvl) => {
                const isSel = draftLevel === lvl;
                return (
                  <Pressable
                    key={lvl}
                    style={[styles.levelChip, isSel && styles.levelChipActive]}
                    onPress={() => setDraftLevel(lvl)}
                  >
                    <Text style={[styles.levelChipText, isSel && styles.levelChipTextActive]}>
                      {lvl}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.saveModalButton} onPress={handleSaveProfile}>
              <Text style={styles.saveModalButtonText}>Save Changes</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Preferences Modal */}
      <Modal visible={isPrefModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Study Preferences</Text>
              <Pressable onPress={() => setIsPrefModalVisible(false)}>
                <Ionicons name="close" size={22} color="#1b1c19" />
              </Pressable>
            </View>

            <View style={styles.prefRow}>
              <View>
                <Text style={styles.prefTitle}>Lecture Reminders</Text>
                <Text style={styles.prefSubtitle}>Alert 15 mins before lectures</Text>
              </View>
              <Switch
                value={state.preferences.lectureReminders}
                onValueChange={(val) => updatePreferences({ lectureReminders: val })}
                trackColor={{ false: '#e4e2dd', true: '#c5832b' }}
              />
            </View>

            <View style={styles.prefRow}>
              <View>
                <Text style={styles.prefTitle}>Assignment Alerts</Text>
                <Text style={styles.prefSubtitle}>Notify on upcoming deadlines</Text>
              </View>
              <Switch
                value={state.preferences.assignmentAlerts}
                onValueChange={(val) => updatePreferences({ assignmentAlerts: val })}
                trackColor={{ false: '#e4e2dd', true: '#c5832b' }}
              />
            </View>

            <View style={styles.prefRow}>
              <View>
                <Text style={styles.prefTitle}>Target GPA</Text>
                <Text style={styles.prefSubtitle}>{state.preferences.targetGpa}</Text>
              </View>
              <Pressable
                onPress={() =>
                  Alert.alert('GPA Target', `Current set target is: ${state.preferences.targetGpa}`)
                }
              >
                <Text style={{ color: '#c5832b', fontWeight: 'bold' }}>Change</Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.saveModalButton}
              onPress={() => setIsPrefModalVisible(false)}
            >
              <Text style={styles.saveModalButtonText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* University Data Modal */}
      <Modal visible={isUniModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>University Sync Status</Text>
              <Pressable onPress={() => setIsUniModalVisible(false)}>
                <Ionicons name="close" size={22} color="#1b1c19" />
              </Pressable>
            </View>

            <View style={styles.uniDataBox}>
              <Ionicons name="checkmark-circle" size={24} color="#5b6239" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ fontWeight: '700', color: '#1b1c19' }}>
                  {state.university || 'Veritas University'}
                </Text>
                <Text style={{ color: '#46483d', fontSize: 12 }}>
                  Connected • Live Timetable Active
                </Text>
              </View>
            </View>

            <View style={{ marginVertical: 12 }}>
              <Text style={{ fontSize: 13, color: '#46483d', marginBottom: 4 }}>
                • {state.courses.length} Enrolled Courses
              </Text>
              <Text style={{ fontSize: 13, color: '#46483d', marginBottom: 4 }}>
                • {state.timetable.length} Weekly Lecture Slots
              </Text>
              <Text style={{ fontSize: 13, color: '#46483d' }}>
                • Semester: {state.semester}
              </Text>
            </View>

            <Pressable
              style={styles.saveModalButton}
              onPress={() => setIsUniModalVisible(false)}
            >
              <Text style={styles.saveModalButtonText}>Close</Text>
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
    backgroundColor: '#fbf9f4', // surface
  },
  topAppBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(199, 199, 185, 0.25)',
    backgroundColor: '#fbf9f4',
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.4)',
    overflow: 'hidden',
    backgroundColor: '#eae8e3',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  appTitle: {
    fontFamily: LexiFonts.displayBold,
    fontSize: 28,
    color: '#272e0a', // primary
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f3ee',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  card: {
    backgroundColor: '#ffffff', // surface-container-lowest
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.25)',
    marginBottom: 16,
  },
  identityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  studentName: {
    fontFamily: LexiFonts.headlineMedium,
    fontSize: 24,
    fontWeight: '700',
    color: '#1b1c19',
    marginBottom: 4,
  },
  schoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  schoolText: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 14,
    color: '#46483d',
  },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f5f3ee',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  editBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5b6239',
  },
  infoTable: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(199, 199, 185, 0.2)',
    paddingTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(199, 199, 185, 0.2)',
  },
  infoLabel: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 14,
    color: '#46483d',
  },
  infoValue: {
    fontFamily: LexiFonts.bodyMedium,
    fontSize: 14,
    fontWeight: '700',
    color: '#1b1c19',
  },
  activeStatusPill: {
    backgroundColor: '#3d441e', // primary-container
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeStatusText: {
    fontFamily: LexiFonts.bodyMedium,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#a9b181', // on-primary-container
  },
  settingsNav: {
    gap: 8,
    marginBottom: 24,
  },
  navItemActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f5f3ee',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.3)',
  },
  navTextActive: {
    fontFamily: LexiFonts.bodyMedium,
    fontSize: 15,
    fontWeight: '700',
    color: '#272e0a',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.2)',
  },
  navText: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 15,
    color: '#46483d',
    flex: 1,
  },
  navChevron: {
    marginLeft: 'auto',
  },
  sectionHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(199, 199, 185, 0.2)',
    paddingBottom: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: LexiFonts.headlineMedium,
    fontSize: 22,
    fontWeight: '700',
    color: '#1b1c19',
  },
  dnaGrid: {
    gap: 16,
    marginBottom: 24,
  },
  dnaCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.25)',
  },
  dnaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  dnaCardTitle: {
    fontFamily: LexiFonts.bodyMedium,
    fontSize: 16,
    fontWeight: '700',
    color: '#1b1c19',
  },
  skillItem: {
    marginBottom: 14,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  skillName: {
    fontFamily: LexiFonts.bodyMedium,
    fontSize: 14,
    fontWeight: '700',
    color: '#1b1c19',
  },
  skillPercent: {
    fontFamily: LexiFonts.bodyMedium,
    fontSize: 12,
    fontWeight: '700',
    color: '#272e0a',
  },
  skillPercentGold: {
    fontFamily: LexiFonts.bodyMedium,
    fontSize: 12,
    fontWeight: '700',
    color: '#c5832b',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#e4e2dd', // surface-variant
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  growthAdvisoryText: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
    color: '#77786c',
    marginTop: 8,
  },
  bentoContainer: {
    gap: 12,
    marginBottom: 24,
  },
  researchBento: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  researchBentoLeft: {
    flex: 1,
  },
  bentoLabelCaps: {
    fontFamily: LexiFonts.bodyMedium,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#77786c',
    marginBottom: 4,
  },
  bentoMainText: {
    fontFamily: LexiFonts.bodyMedium,
    fontSize: 16,
    fontWeight: '700',
    color: '#1b1c19',
  },
  bentoArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f3ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpaBento: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.25)',
    alignItems: 'center',
  },
  gpaValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    marginTop: 2,
  },
  gpaBigNumber: {
    fontFamily: LexiFonts.displayBold,
    fontSize: 32,
    color: '#272e0a',
  },
  gpaOutOf: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 14,
    color: '#77786c',
  },
  switchAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fdf2f2',
    borderWidth: 1,
    borderColor: '#fbd5d5',
    marginTop: 8,
  },
  switchAccountText: {
    fontFamily: LexiFonts.bodyMedium,
    fontSize: 14,
    fontWeight: '600',
    color: '#ba1a1a',
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
  modalTitle: {
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
  levelPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 6,
  },
  levelChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f5f3ee',
    alignItems: 'center',
  },
  levelChipActive: {
    backgroundColor: '#272e0a',
  },
  levelChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#46483d',
  },
  levelChipTextActive: {
    color: '#ffffff',
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
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0eee9',
  },
  prefTitle: {
    fontFamily: LexiFonts.bodyMedium,
    fontSize: 15,
    fontWeight: '600',
    color: '#1b1c19',
  },
  prefSubtitle: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 12,
    color: '#77786c',
    marginTop: 2,
  },
  uniDataBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ee',
    padding: 14,
    borderRadius: 12,
  },
});

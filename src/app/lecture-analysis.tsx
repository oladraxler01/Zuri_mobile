import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiColors, LexiFonts, LexiSpacing } from '@/constants/lexi-theme';
import { useLexiFonts } from '@/hooks/use-lexi-fonts';
import { useAcademic } from '@/context/academic-context';

export default function LectureAnalysisScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ courseCode?: string; courseTitle?: string }>();
  const [fontsLoaded] = useLexiFonts();
  const { state } = useAcademic();

  const courseTitle = params.courseTitle || 'Dynamic Programming Introduction';
  const courseCode = params.courseCode || 'CSC 301';

  // Interactive Modals
  const [diagnosticVisible, setDiagnosticVisible] = useState(false);
  const [flashcardsVisible, setFlashcardsVisible] = useState(false);
  const [askLexiVisible, setAskLexiVisible] = useState(false);
  const [reviewConceptVisible, setReviewConceptVisible] = useState(false);

  // Diagnostic Quiz State
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Flashcards state
  const [flashcardIdx, setFlashcardIdx] = useState(0);
  const [showFlashcardAnswer, setShowFlashcardAnswer] = useState(false);

  // Ask Lexi AI Chat State
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiChat, setAiChat] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
    {
      role: 'assistant',
      text: `Hello Marvellous! I've fully parsed your ${courseCode} lecture on Dynamic Programming. What would you like to clarify or explore?`,
    },
  ]);

  if (!fontsLoaded) {
    return <View style={styles.container} />;
  }

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)' as Href);
    }
  };

  const handleAskLexiSend = (textToSend?: string) => {
    const q = (textToSend || aiQuestion).trim();
    if (!q) return;

    setAiChat((prev) => [...prev, { role: 'user', text: q }]);
    setAiQuestion('');

    setTimeout(() => {
      let answer = `Great question! In dynamic programming, ${q.toLowerCase().includes('memo') ? 'Memoization is top-down caching where we store outputs of recursive calls in an array or dictionary, saving $O(2^n)$ overhead.' : 'subproblems must overlap so that storing their answers once saves recalculating them exponentially.'}`;
      if (q.toLowerCase().includes('python') || q.toLowerCase().includes('code')) {
        answer = `def fib(n, memo={}):\n    if n in memo: return memo[n]\n    if n <= 1: return n\n    memo[n] = fib(n-1, memo) + fib(n-2, memo)\n    return memo[n]`;
      }
      setAiChat((prev) => [...prev, { role: 'assistant', text: answer }]);
    }, 600);
  };

  const FLASHCARDS = [
    {
      q: 'What are the two key properties of any Dynamic Programming problem?',
      a: '1. Optimal Substructure (optimal solutions to subproblems form the overall optimal solution).\n2. Overlapping Subproblems (the same subproblems are solved repeatedly).',
    },
    {
      q: 'How does Memoization differ from Tabulation?',
      a: 'Memoization is Top-Down with recursion and a lookup cache.\nTabulation is Bottom-Up, iteratively filling a table from base cases up.',
    },
    {
      q: 'What is a State Transition Equation?',
      a: 'The mathematical relation (recurrence) that defines a larger problem state in terms of previously calculated smaller states (e.g., dp[i] = dp[i-1] + dp[i-2]).',
    },
  ];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fbf9f4" />

      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Pressable
            style={styles.backBtn}
            onPress={handleBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color="#272e0a" />
          </Pressable>
          <Text style={styles.brandTitle}>Lexi</Text>
        </View>

        <View style={styles.topBarRight}>
          <Pressable
            style={styles.iconCircleBtn}
            onPress={() => Alert.alert('Notifications', 'Analysis completed. Study materials ready.')}
          >
            <Ionicons name="notifications-outline" size={20} color="#272e0a" />
          </Pressable>
          <View style={styles.profileAvatar}>
            <Ionicons name="person" size={16} color="#ffffff" />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.badgeRow}>
            <View style={styles.postBadge}>
              <Text style={styles.postBadgeText}>POST-LECTURE ANALYSIS</Text>
            </View>
            <Text style={styles.dotSeparator}>•</Text>
            <Text style={styles.deptSubtitle}>{state.department || 'Computer Science'}</Text>
          </View>

          <Text style={styles.headlineTitle}>
            {courseCode}: {courseTitle}
          </Text>

          <Text style={styles.headlineSubtitle}>
            A distilled breakdown of the core algorithmic concepts from today's session, engineered for immediate comprehension and long-term retention.
          </Text>
        </View>

        {/* Section 1: What You Need to Know (Bento Grid) */}
        <View style={styles.bentoSection}>
          <Text style={styles.sectionHeading}>What You Need to Know</Text>

          <View style={styles.bentoGrid}>
            {/* 1. Memoization */}
            <View style={styles.bentoCard}>
              <View style={styles.bentoCardHeader}>
                <Text style={styles.conceptTitle}>1. Memoization</Text>
                <Ionicons name="hardware-chip-outline" size={18} color="rgba(39, 46, 10, 0.5)" />
              </View>
              <Text style={styles.conceptDesc}>
                Top-down approach. Caching results of expensive function calls to avoid redundant calculations.
              </Text>
            </View>

            {/* 2. Tabulation */}
            <View style={styles.bentoCard}>
              <View style={styles.bentoCardHeader}>
                <Text style={styles.conceptTitle}>2. Tabulation</Text>
                <Ionicons name="grid-outline" size={18} color="rgba(39, 46, 10, 0.5)" />
              </View>
              <Text style={styles.conceptDesc}>
                Bottom-up approach. Solving subproblems systematically and filling an n-dimensional table.
              </Text>
            </View>

            {/* 3. Optimal Substructure */}
            <View style={styles.bentoCard}>
              <View style={styles.bentoCardHeader}>
                <Text style={styles.conceptTitle}>3. Optimal Substructure</Text>
                <Ionicons name="git-network-outline" size={18} color="rgba(39, 46, 10, 0.5)" />
              </View>
              <Text style={styles.conceptDesc}>
                An optimal solution to the problem contains optimal solutions to subproblems.
              </Text>
            </View>

            {/* 4. Overlapping Subproblems */}
            <View style={styles.bentoCard}>
              <View style={styles.bentoCardHeader}>
                <Text style={styles.conceptTitle}>4. Overlapping Subproblems</Text>
                <Ionicons name="layers-outline" size={18} color="rgba(39, 46, 10, 0.5)" />
              </View>
              <Text style={styles.conceptDesc}>
                The problem space can be broken down into subproblems which are reused several times.
              </Text>
            </View>

            {/* 5. State Transition Equation */}
            <View style={[styles.bentoCard, styles.bentoCardSpanFull]}>
              <View style={styles.bentoCardHeader}>
                <Text style={styles.conceptTitle}>5. State Transition Equation</Text>
                <Ionicons name="calculator-outline" size={18} color="rgba(39, 46, 10, 0.5)" />
              </View>
              <Text style={styles.conceptDesc}>
                The mathematical formula that relates the solution of a larger problem to its smaller subproblems. The core logic of any DP solution.
              </Text>
            </View>
          </View>
        </View>

        {/* Section 2: Knowledge Gaps Identified */}
        <View style={styles.gapSection}>
          <View style={styles.gapIconCircle}>
            <Ionicons name="alert" size={16} color="#ba1a1a" />
          </View>
          <View style={styles.gapTextBox}>
            <Text style={styles.gapTitle}>Knowledge Gaps Identified</Text>
            <Text style={styles.gapDesc}>
              You struggled with <Text style={{ fontWeight: '700', color: '#272e0a' }}>Optimal Substructure</Text> during the lecture diagnostic. Re-visiting this concept is highly recommended before the mid-term.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.reviewConceptBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={() => setReviewConceptVisible(true)}
            >
              <Text style={styles.reviewConceptBtnText}>Review Concept</Text>
              <Ionicons name="arrow-forward" size={14} color="#272e0a" />
            </Pressable>
          </View>
        </View>

        {/* Section 3: Next Actions */}
        <View style={styles.nextActionsCard}>
          <Text style={styles.nextActionsHeading}>Next Actions</Text>

          <View style={styles.actionButtonsList}>
            {/* Take 7-minute Diagnostic */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryActionBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={() => setDiagnosticVisible(true)}
            >
              <Text style={styles.primaryActionBtnText}>Take 7-minute Diagnostic</Text>
              <Ionicons name="timer-outline" size={18} color="#ffffff" />
            </Pressable>

            {/* Review Flashcards */}
            <Pressable
              style={({ pressed }) => [
                styles.secondaryActionBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={() => setFlashcardsVisible(true)}
            >
              <Text style={styles.secondaryActionBtnText}>Review Flashcards</Text>
              <Ionicons name="albums-outline" size={18} color="#272e0a" />
            </Pressable>

            {/* Ask Lexi about this lecture */}
            <Pressable
              style={({ pressed }) => [
                styles.aiActionBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={() => setAskLexiVisible(true)}
            >
              <Text style={styles.aiActionBtnText}>Ask Lexi about this lecture</Text>
              <Ionicons name="sparkles" size={18} color="#754900" />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Review Concept Modal */}
      <Modal
        visible={reviewConceptVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewConceptVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Concept: Optimal Substructure</Text>
              <Pressable onPress={() => setReviewConceptVisible(false)}>
                <Ionicons name="close" size={24} color="#272e0a" />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <Text style={styles.conceptExplainText}>
                📌 <Text style={{ fontWeight: '700' }}>Formal Definition:</Text>{'\n'}
                A problem has optimal substructure if an optimal solution to the problem contains optimal solutions to subproblems.{'\n\n'}
                🚗 <Text style={{ fontWeight: '700' }}>Intuitive Example:</Text>{'\n'}
                If the shortest route from Lagos to Abuja passes through Ibadan, then the sub-route from Lagos to Ibadan must also be the shortest possible route between Lagos and Ibadan.{'\n\n'}
                ⚠️ <Text style={{ fontWeight: '700' }}>When does it fail?</Text>{'\n'}
                Longest simple path problem: Finding the longest non-repeating path between two vertices in a graph does NOT have optimal substructure.
              </Text>
            </ScrollView>

            <Pressable
              style={styles.modalActionBtn}
              onPress={() => {
                setReviewConceptVisible(false);
                Alert.alert('Marked as Understood', 'Great job! This gap has been marked as reviewed.');
              }}
            >
              <Text style={styles.modalActionBtnText}>I Understand This Concept</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Diagnostic Quiz Modal */}
      <Modal
        visible={diagnosticVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDiagnosticVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>7-Minute Diagnostic Quiz</Text>
              <Pressable onPress={() => setDiagnosticVisible(false)}>
                <Ionicons name="close" size={24} color="#272e0a" />
              </Pressable>
            </View>

            <Text style={styles.quizQuestion}>
              Which dynamic programming approach builds solutions bottom-up by iteratively filling a table?
            </Text>

            <View style={styles.quizOptionsGroup}>
              {['Greedy Choice', 'Tabulation', 'Memoization', 'Divide and Conquer'].map((opt, idx) => {
                const isSelected = quizAnswer === idx;
                return (
                  <Pressable
                    key={idx}
                    style={[
                      styles.quizOptionCard,
                      isSelected && styles.quizOptionCardSelected,
                      quizSubmitted && idx === 1 && styles.quizOptionCorrect,
                    ]}
                    onPress={() => setQuizAnswer(idx)}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={isSelected ? '#272e0a' : LexiColors.outline}
                    />
                    <Text
                      style={[
                        styles.quizOptionText,
                        isSelected && styles.quizOptionTextSelected,
                      ]}
                    >
                      {opt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {quizSubmitted && (
              <View style={styles.feedbackBox}>
                <Ionicons name="checkmark-circle" size={20} color="#272e0a" />
                <Text style={styles.feedbackText}>
                  Correct! Tabulation systematically fills base cases up to the desired result.
                </Text>
              </View>
            )}

            <Pressable
              style={styles.modalActionBtn}
              onPress={() => {
                if (quizAnswer === null) {
                  Alert.alert('Select an answer', 'Please choose an option to test your understanding.');
                  return;
                }
                if (!quizSubmitted) {
                  setQuizSubmitted(true);
                } else {
                  setDiagnosticVisible(false);
                  setQuizSubmitted(false);
                  setQuizAnswer(null);
                }
              }}
            >
              <Text style={styles.modalActionBtnText}>
                {quizSubmitted ? 'Finish Diagnostic' : 'Submit Answer'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Flashcards Modal */}
      <Modal
        visible={flashcardsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFlashcardsVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lecture Flashcards ({flashcardIdx + 1}/{FLASHCARDS.length})</Text>
              <Pressable onPress={() => setFlashcardsVisible(false)}>
                <Ionicons name="close" size={24} color="#272e0a" />
              </Pressable>
            </View>

            <Pressable
              style={styles.flashcardCard}
              onPress={() => setShowFlashcardAnswer((prev) => !prev)}
            >
              <Text style={styles.flashcardHeaderTag}>
                {showFlashcardAnswer ? 'ANSWER' : 'QUESTION • TAP TO FLIP'}
              </Text>
              <Text style={styles.flashcardText}>
                {showFlashcardAnswer
                  ? FLASHCARDS[flashcardIdx].a
                  : FLASHCARDS[flashcardIdx].q}
              </Text>
            </Pressable>

            <View style={styles.flashcardControls}>
              <Pressable
                style={styles.flashNavBtn}
                onPress={() => {
                  setShowFlashcardAnswer(false);
                  setFlashcardIdx((prev) => Math.max(0, prev - 1));
                }}
              >
                <Ionicons name="arrow-back" size={18} color="#272e0a" />
                <Text style={styles.flashNavText}>Prev</Text>
              </Pressable>

              <Pressable
                style={[styles.flashNavBtn, styles.flashNavBtnNext]}
                onPress={() => {
                  setShowFlashcardAnswer(false);
                  if (flashcardIdx < FLASHCARDS.length - 1) {
                    setFlashcardIdx((prev) => prev + 1);
                  } else {
                    setFlashcardsVisible(false);
                    setFlashcardIdx(0);
                  }
                }}
              >
                <Text style={styles.flashNavTextNext}>
                  {flashcardIdx < FLASHCARDS.length - 1 ? 'Next Card' : 'Done'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#ffffff" />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Ask Lexi AI Chat Modal */}
      <Modal
        visible={askLexiVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAskLexiVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { height: '80%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="sparkles" size={20} color="#754900" />
                <Text style={styles.modalTitle}>Ask Lexi AI</Text>
              </View>
              <Pressable onPress={() => setAskLexiVisible(false)}>
                <Ionicons name="close" size={24} color="#272e0a" />
              </Pressable>
            </View>

            {/* Chat message list */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingVertical: 8 }}>
              {aiChat.map((msg, i) => (
                <View
                  key={i}
                  style={[
                    styles.chatBubble,
                    msg.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAi,
                  ]}
                >
                  <Text
                    style={[
                      styles.chatText,
                      msg.role === 'user' ? styles.chatTextUser : styles.chatTextAi,
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Quick suggested chips */}
            <View style={styles.aiSuggestionRow}>
              <Pressable
                style={styles.aiChip}
                onPress={() => handleAskLexiSend('Explain Memoization vs Tabulation')}
              >
                <Text style={styles.aiChipText}>Memoization vs Tabulation</Text>
              </Pressable>
              <Pressable
                style={styles.aiChip}
                onPress={() => handleAskLexiSend('Show Python code for Fibonacci')}
              >
                <Text style={styles.aiChipText}>Python Code</Text>
              </Pressable>
            </View>

            {/* Input Row */}
            <View style={styles.aiInputRow}>
              <TextInput
                style={styles.aiTextInput}
                placeholder="Ask a question about this lecture..."
                placeholderTextColor={LexiColors.outline}
                value={aiQuestion}
                onChangeText={setAiQuestion}
                onSubmitEditing={() => handleAskLexiSend()}
              />
              <Pressable style={styles.aiSendBtn} onPress={() => handleAskLexiSend()}>
                <Ionicons name="send" size={18} color="#ffffff" />
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
    backgroundColor: '#fbf9f4',
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(199, 199, 185, 0.25)',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  brandTitle: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 22,
    color: '#272e0a',
    fontWeight: '700',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eae8e3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3d441e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  headerSection: {
    marginBottom: 28,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  postBadge: {
    backgroundColor: '#eae8e3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  postBadgeText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 10,
    letterSpacing: 1,
    color: '#46483d',
    fontWeight: '700',
  },
  dotSeparator: {
    color: LexiColors.outline,
    fontSize: 14,
  },
  deptSubtitle: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 13,
    color: '#46483d',
  },
  headlineTitle: {
    fontFamily: LexiFonts.headlineLgMobile,
    fontSize: 28,
    lineHeight: 34,
    color: '#272e0a',
    fontWeight: '700',
    marginBottom: 8,
  },
  headlineSubtitle: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 14,
    lineHeight: 20,
    color: LexiColors.onSurfaceVariant,
  },
  // Bento
  bentoSection: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 20,
    color: '#272e0a',
    fontWeight: '600',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(199, 199, 185, 0.25)',
    paddingBottom: 10,
    marginBottom: 16,
  },
  bentoGrid: {
    gap: 12,
  },
  bentoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 22, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  bentoCardSpanFull: {
    backgroundColor: '#f5f3ee',
  },
  bentoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  conceptTitle: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 15,
    fontWeight: '700',
    color: '#272e0a',
  },
  conceptDesc: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 13,
    lineHeight: 18,
    color: LexiColors.onSurfaceVariant,
  },
  // Gap
  gapSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(255, 218, 214, 0.35)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.2)',
    marginBottom: 28,
  },
  gapIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffdad6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  gapTextBox: {
    flex: 1,
  },
  gapTitle: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 16,
    color: '#272e0a',
    fontWeight: '600',
    marginBottom: 4,
  },
  gapDesc: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 13,
    lineHeight: 18,
    color: LexiColors.onSurfaceVariant,
    marginBottom: 12,
  },
  reviewConceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 22, 0.1)',
  },
  reviewConceptBtnText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: '#272e0a',
  },
  // Next Actions
  nextActionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 22, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  nextActionsHeading: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 18,
    color: '#272e0a',
    fontWeight: '600',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(199, 199, 185, 0.25)',
    paddingBottom: 10,
    marginBottom: 16,
  },
  actionButtonsList: {
    gap: 12,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#272e0a',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  primaryActionBtnText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f3ee',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 22, 0.08)',
  },
  secondaryActionBtnText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 14,
    color: '#272e0a',
    fontWeight: '600',
  },
  aiActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(253, 186, 100, 0.2)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(253, 186, 100, 0.5)',
  },
  aiActionBtnText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 14,
    color: '#754900',
    fontWeight: '600',
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  // Modal Base
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
  modalActionBtn: {
    backgroundColor: '#272e0a',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  modalActionBtnText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  conceptExplainText: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 14,
    lineHeight: 22,
    color: LexiColors.onSurface,
  },
  // Quiz
  quizQuestion: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 16,
    color: '#272e0a',
    fontWeight: '600',
    marginBottom: 14,
  },
  quizOptionsGroup: {
    gap: 10,
  },
  quizOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f5f3ee',
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 22, 0.08)',
  },
  quizOptionCardSelected: {
    borderColor: '#272e0a',
    backgroundColor: '#ffffff',
  },
  quizOptionCorrect: {
    borderColor: '#272e0a',
    backgroundColor: 'rgba(223, 232, 169, 0.4)',
  },
  quizOptionText: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 14,
    color: LexiColors.onSurface,
  },
  quizOptionTextSelected: {
    fontWeight: '600',
    color: '#272e0a',
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#dfe8a9',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  feedbackText: {
    flex: 1,
    fontFamily: LexiFonts.bodyMd,
    fontSize: 13,
    color: '#272e0a',
  },
  // Flashcards
  flashcardCard: {
    minHeight: 180,
    backgroundColor: '#f5f3ee',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 22, 0.1)',
    marginVertical: 12,
  },
  flashcardHeaderTag: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 10,
    color: LexiColors.outline,
    letterSpacing: 1,
    marginBottom: 10,
  },
  flashcardText: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 16,
    textAlign: 'center',
    color: '#272e0a',
    lineHeight: 24,
  },
  flashcardControls: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  flashNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#eae8e3',
  },
  flashNavText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: '#272e0a',
  },
  flashNavBtnNext: {
    backgroundColor: '#272e0a',
  },
  flashNavTextNext: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: '#ffffff',
  },
  // AI Chat
  chatBubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 14,
  },
  chatBubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#272e0a',
  },
  chatBubbleAi: {
    alignSelf: 'flex-start',
    backgroundColor: '#f5f3ee',
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 22, 0.08)',
  },
  chatText: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 13,
    lineHeight: 19,
  },
  chatTextUser: {
    color: '#ffffff',
  },
  chatTextAi: {
    color: '#1b1c19',
  },
  aiSuggestionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
  },
  aiChip: {
    backgroundColor: '#f5f3ee',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 22, 0.08)',
  },
  aiChipText: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 11,
    color: '#272e0a',
  },
  aiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(199, 199, 185, 0.25)',
    paddingTop: 10,
  },
  aiTextInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#f5f3ee',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontFamily: LexiFonts.bodyMd,
    fontSize: 13,
    color: LexiColors.onSurface,
  },
  aiSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#272e0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

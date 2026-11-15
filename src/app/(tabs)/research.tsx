import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LexiColors, LexiFonts } from '@/constants/lexi-theme';
import { useAcademicContext } from '@/context/academic-context';

export default function ResearchScreen() {
  const insets = useSafeAreaInsets();
  const { state } = useAcademicContext();
  const [searchQuery, setSearchQuery] = useState('');

  const RESEARCH_PAPERS = [
    {
      id: '1',
      title: 'Distributed Systems Consensus: Raft vs Paxos in Edge Clusters',
      course: 'CSC 301',
      date: 'Sep 6, 2026',
      readTime: '8 min read',
      tag: 'Core Academic',
      summary:
        'A formal comparative analysis of quorum leader election and log replication stability across unstable high-latency nodes.',
    },
    {
      id: '2',
      title: 'State Transition Equations in Multi-Stage Dynamic Optimization',
      course: 'CSC 201',
      date: 'Sep 4, 2026',
      readTime: '12 min read',
      tag: 'Algorithms',
      summary:
        'Deconstruction of memoized subproblem recurrence relations with application to Bellman-Ford and Knapsack variants.',
    },
    {
      id: '3',
      title: 'Neural ASR Noise Filtering in High-Reverberance Academic Auditoriums',
      course: 'ECE 312',
      date: 'Aug 29, 2026',
      readTime: '6 min read',
      tag: 'Signal Processing',
      summary:
        'Dual-microphone beamforming and spectral subtraction techniques tailored to accented speech transcription in university lecture halls.',
    },
  ];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.topAppBar}>
        <View style={styles.appBarLeft}>
          <Text style={styles.appTitle}>Research</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Zuri Scholar</Text>
          </View>
        </View>
        <Pressable
          style={styles.iconButton}
          onPress={() => router.push('/(tabs)/you' as any)}
        >
          <Ionicons name="person-circle-outline" size={26} color="#46483d" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#77786c" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search academic papers, citations & summaries..."
            placeholderTextColor="#77786c"
          />
        </View>

        {/* Featured Research Card */}
        <View style={styles.featuredCard}>
          <View style={styles.featuredTagRow}>
            <View style={styles.featuredTag}>
              <Ionicons name="sparkles" size={12} color="#ffffff" />
              <Text style={styles.featuredTagText}>FEATURED STUDY</Text>
            </View>
            <Text style={styles.readTimeText}>15 min read</Text>
          </View>

          <Text style={styles.featuredTitle}>
            Asymptotic Memory Bounds in Large Scale Graph Neural Networks
          </Text>
          <Text style={styles.featuredSnippet}>
            Synthesizing GPU tensor fragmentation and neighborhood sampling bounds for 2026 academic curricula.
          </Text>

          <View style={styles.featuredFooter}>
            <Text style={styles.authorText}>Zuri AI Research Collective</Text>
            <Pressable style={styles.readButton}>
              <Text style={styles.readButtonText}>Read Paper</Text>
              <Ionicons name="arrow-forward" size={14} color="#ffffff" />
            </Pressable>
          </View>
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Curated Research Feed</Text>
          <Text style={styles.sectionSubtitle}>Tailored to {state.department || 'Computer Science'}</Text>
        </View>

        {/* Research Papers List */}
        {RESEARCH_PAPERS.map((paper) => (
          <View key={paper.id} style={styles.paperCard}>
            <View style={styles.paperHeader}>
              <View style={styles.tagPill}>
                <Text style={styles.tagPillText}>{paper.tag}</Text>
              </View>
              <Text style={styles.paperDate}>{paper.date}</Text>
            </View>

            <Text style={styles.paperTitle}>{paper.title}</Text>
            <Text style={styles.paperSummary}>{paper.summary}</Text>

            <View style={styles.paperFooter}>
              <View style={styles.coursePill}>
                <Ionicons name="school-outline" size={13} color="#272e0a" />
                <Text style={styles.coursePillText}>{paper.course}</Text>
              </View>
              <Text style={styles.paperReadTime}>{paper.readTime}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
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
  badge: {
    backgroundColor: '#ffb559',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5c3400',
  },
  iconButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.35)',
    marginBottom: 18,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 14,
    color: '#1b1c19',
  },
  featuredCard: {
    backgroundColor: '#272e0a', // primary
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  featuredTagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  featuredTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#3d441e',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  featuredTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#dfe7b3',
    letterSpacing: 0.5,
  },
  readTimeText: {
    fontSize: 12,
    color: '#c3cb99',
  },
  featuredTitle: {
    fontFamily: LexiFonts.headlineMedium,
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 28,
    marginBottom: 8,
  },
  featuredSnippet: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 13,
    lineHeight: 20,
    color: '#dfe7b3',
    marginBottom: 16,
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: 12,
  },
  authorText: {
    fontSize: 12,
    color: '#c3cb99',
  },
  readButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#c5832b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  readButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
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
  paperCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 185, 0.25)',
    marginBottom: 14,
  },
  paperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagPill: {
    backgroundColor: '#f5f3ee',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5b6239',
  },
  paperDate: {
    fontSize: 12,
    color: '#77786c',
  },
  paperTitle: {
    fontFamily: LexiFonts.bodyMedium,
    fontSize: 16,
    fontWeight: '700',
    color: '#1b1c19',
    lineHeight: 22,
    marginBottom: 6,
  },
  paperSummary: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
    color: '#46483d',
    marginBottom: 12,
  },
  paperFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coursePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f5f3ee',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  coursePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#272e0a',
  },
  paperReadTime: {
    fontSize: 12,
    color: '#77786c',
  },
});

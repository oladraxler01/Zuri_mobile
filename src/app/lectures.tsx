import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet, StatusBar } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useZuriFonts } from '@/hooks/use-zuri-fonts';
import { useLectures } from '@/context/lectures-context';
import { useAcademic } from '@/context/academic-context';
import { LectureCard } from '@/components/lecture/lecture-card';
import { EmptyState } from '@/components/states/state-view';
import { SkeletonCard } from '@/components/states/loading';
import type { Lecture } from '@/types/lecture';

function matches(lecture: Lecture, q: string) {
  const a = lecture.analysis;
  const haystack = [
    lecture.courseCode,
    lecture.courseTitle,
    a?.title,
    a?.summary,
    ...(a?.concepts.map((c) => c.title) ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

/** All recorded lectures, newest first, with search and course filter. */
export default function LectureArchiveScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ courseId?: string }>();
  const [fontsLoaded] = useZuriFonts();
  const { lectures, loaded } = useLectures();
  const { state } = useAcademic();
  const [query, setQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState<string | null>(params.courseId ?? null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lectures
      .filter((l) => !courseFilter || l.courseId === courseFilter)
      .filter((l) => !q || matches(l, q))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [lectures, query, courseFilter]);

  const coursesWithLectures = state.courses.filter((c) => lectures.some((l) => l.courseId === c.id));

  if (!fontsLoaded) return <View style={styles.container} />;

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as Href))}
          hitSlop={10}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={UI.ink} />
        </Pressable>
        <Text style={styles.topTitle}>Lecture archive</Text>
        <Pressable
          onPress={() => router.push('/lecture-recording' as Href)}
          hitSlop={10}
          accessibilityLabel="Record a lecture"
        >
          <Ionicons name="mic-outline" size={22} color={UI.ink} />
        </Pressable>
      </View>

      <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.count}>
          {lectures.length} {lectures.length === 1 ? 'lecture' : 'lectures'} recorded
        </Text>

        {lectures.length > 0 && (
          <>
            <View style={styles.search}>
              <Ionicons name="search" size={16} color={UI.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by course, topic or concept"
                placeholderTextColor={UI.muted}
                value={query}
                onChangeText={setQuery}
              />
            </View>

            {coursesWithLectures.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                <Chip label="All" on={!courseFilter} onPress={() => setCourseFilter(null)} />
                {coursesWithLectures.map((c) => (
                  <Chip key={c.id} label={c.code} on={courseFilter === c.id} onPress={() => setCourseFilter(c.id)} />
                ))}
              </ScrollView>
            )}
          </>
        )}

        {!loaded ? (
          <View style={{ gap: 10 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : lectures.length === 0 ? (
          <EmptyState
            icon="mic-outline"
            title="No lectures yet"
            message="Record your first lecture and it will appear here with its transcript, notes and questions."
            primary={{ label: 'Record a lecture', icon: 'mic', onPress: () => router.push('/lecture-recording' as Href) }}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            compact
            icon="search-outline"
            title="No matches"
            message={`Nothing matches “${query.trim()}”${courseFilter ? ' in this course' : ''}.`}
            secondary={{ label: 'Clear search', onPress: () => { setQuery(''); setCourseFilter(null); } }}
          />
        ) : (
          <View style={{ gap: 10 }}>
            {filtered.map((l) => (
              <LectureCard key={l.id} lecture={l} />
            ))}
          </View>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, on && styles.chipOn]}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
    >
      <Text style={[styles.chipText, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: UI.borderSoft,
  },
  topTitle: { fontFamily: ZuriFonts.labelSmBold, fontSize: 15, color: UI.ink },
  scroll: { padding: 20, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  count: { fontFamily: ZuriFonts.labelSmBold, fontSize: 12, letterSpacing: 1, color: UI.muted, marginBottom: 12 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.card,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontFamily: ZuriFonts.bodyRegular, fontSize: 14, color: UI.ink },
  chips: { gap: 8, paddingBottom: 14 },
  chip: {
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: UI.card,
  },
  chipOn: { backgroundColor: UI.ink, borderColor: UI.ink },
  chipText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 13, color: UI.ink },
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 16 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: UI.amberSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontFamily: ZuriFonts.headlineMd, fontSize: 22, color: UI.ink, marginBottom: 6 },
  emptyText: {
    fontFamily: ZuriFonts.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
    color: UI.inkSoft,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 50,
    borderRadius: 25,
    backgroundColor: UI.ink,
    paddingHorizontal: 24,
  },
  emptyBtnText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 15, color: '#fff' },
  noMatch: { fontFamily: ZuriFonts.bodyRegular, fontSize: 14, color: UI.muted, textAlign: 'center', marginTop: 24 },
});

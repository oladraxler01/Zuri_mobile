import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useAcademic } from '@/context/academic-context';
import { useMaterials } from '@/context/materials-context';
import { MaterialCard } from '@/components/materials/material-card';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/states/state-view';
import { SkeletonCard } from '@/components/states/loading';
import { MATERIAL_CATEGORIES, type Material, type MaterialCategory } from '@/types/material';
import { pickAndUploadMaterial } from '@/utils/pick-material';

type Sort = 'recent' | 'name';

function matches(m: Material, q: string) {
  const a = m.analysis;
  return [m.name, m.courseCode, a?.title, a?.summary, ...(a?.concepts.map((c) => c.title) ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(q);
}

/** Materials library: everything uploaded, searchable and organised by course and type. */
export default function MaterialsScreen() {
  const params = useLocalSearchParams<{ courseId?: string; upload?: string }>();
  const { state } = useAcademic();
  const { materials, loaded } = useMaterials();
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState<string | null>(params.courseId || null);
  const [category, setCategory] = useState<MaterialCategory | null>(null);
  const [sort, setSort] = useState<Sort>('recent');

  useEffect(() => {
    if (params.upload === '1') pickAndUploadMaterial(params.courseId);
  }, []);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return materials
      .filter((m) => !course || m.courseId === course)
      .filter((m) => !category || m.category === category)
      .filter((m) => !q || matches(m, q))
      .sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        return sort === 'name'
          ? (a.analysis?.title ?? a.name).localeCompare(b.analysis?.title ?? b.name)
          : b.addedAt.localeCompare(a.addedAt);
      });
  }, [materials, query, course, category, sort]);

  const coursesWith = state.courses.filter((c) => materials.some((m) => m.courseId === c.id));
  const upload = () => pickAndUploadMaterial(course ?? undefined);

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
        <Text style={styles.topTitle}>Materials</Text>
        <Pressable onPress={upload} style={styles.uploadPill} accessibilityLabel="Upload material">
          <Ionicons name="cloud-upload-outline" size={15} color="#fff" />
          <Text style={styles.uploadText}>Upload</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {materials.length > 0 && (
          <>
            <View style={styles.search}>
              <Ionicons name="search" size={16} color={UI.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search titles, topics and concepts"
                placeholderTextColor={UI.muted}
                value={query}
                onChangeText={setQuery}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Chip label="All types" on={!category} onPress={() => setCategory(null)} />
              {MATERIAL_CATEGORIES.map((c) => (
                <Chip key={c.key} label={c.label} on={category === c.key} onPress={() => setCategory(c.key)} />
              ))}
            </ScrollView>
            {coursesWith.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                <Chip label="All courses" on={!course} onPress={() => setCourse(null)} />
                {coursesWith.map((c) => (
                  <Chip key={c.id} label={c.code} on={course === c.id} onPress={() => setCourse(c.id)} />
                ))}
              </ScrollView>
            )}
            <View style={styles.sortRow}>
              <Text style={styles.count}>
                {list.length} {list.length === 1 ? 'item' : 'items'}
              </Text>
              <Pressable onPress={() => setSort(sort === 'recent' ? 'name' : 'recent')} style={styles.sortBtn}>
                <Ionicons name="swap-vertical" size={14} color={UI.inkSoft} />
                <Text style={styles.sortText}>{sort === 'recent' ? 'Newest first' : 'A–Z'}</Text>
              </Pressable>
            </View>
          </>
        )}

        {!loaded ? (
          <View style={{ gap: 10 }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : materials.length === 0 ? (
          <EmptyState
            icon="folder-open-outline"
            title="No materials yet"
            message="Upload lecture notes, slides or past questions. Each one gets a summary, key concepts, practice questions and quotable passages."
            primary={{ label: 'Upload a file', icon: 'cloud-upload-outline', onPress: upload }}
          />
        ) : list.length === 0 ? (
          <EmptyState
            compact
            icon="search-outline"
            title="No matches"
            message="Try a different search or filter."
            secondary={{
              label: 'Clear filters',
              onPress: () => {
                setQuery('');
                setCategory(null);
                setCourse(null);
              },
            }}
          />
        ) : (
          <View style={{ gap: 10 }}>
            {list.map((m) => (
              <MaterialCard key={m.id} m={m} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
  uploadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: UI.ink,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  uploadText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 13, color: '#fff' },
  scroll: { padding: 20, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
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
  chips: { gap: 8, paddingBottom: 10 },
  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 },
  count: { fontFamily: ZuriFonts.labelSmBold, fontSize: 12, color: UI.muted },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 12, color: UI.inkSoft },
});

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, StatusBar, type TextInputInstance } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useAcademic } from '@/context/academic-context';
import { useLectures } from '@/context/lectures-context';
import { useMaterials } from '@/context/materials-context';
import { usePlanner } from '@/context/planner-context';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/states/state-view';
import { globalSearch, RESULT_GROUPS, type ResultKind } from '@/utils/global-search';
import { loadJSON, saveJSON } from '@/utils/storage';

const RECENT_KEY = 'lexi.recent-searches.v1';

/** Global search across courses, deadlines, topics, lectures, materials and their contents. */
export default function GlobalSearchScreen() {
  const { state } = useAcademic();
  const { lectures } = useLectures();
  const { materials } = useMaterials();
  const { assessments } = usePlanner();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState<ResultKind | 'all'>('all');
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<TextInputInstance>(null);

  useEffect(() => {
    loadJSON<string[]>(RECENT_KEY).then((r) => r && setRecent(r));
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  const results = useMemo(
    () => globalSearch(debounced, { courses: state.courses, lectures, materials, assessments }),
    [debounced, state.courses, lectures, materials, assessments]
  );
  const counts = RESULT_GROUPS.map((g) => ({ ...g, n: results.filter((r) => r.kind === g.kind).length })).filter((g) => g.n);
  const shown = filter === 'all' ? results : results.filter((r) => r.kind === filter);

  const remember = (q: string) => {
    const t = q.trim();
    if (t.length < 2) return;
    const next = [t, ...recent.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 8);
    setRecent(next);
    saveJSON(RECENT_KEY, next);
  };

  const open = (href: string) => {
    remember(query);
    router.push(href as Href);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Close search">
          <Ionicons name="arrow-back" size={24} color={UI.ink} />
        </Pressable>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={16} color={UI.muted} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              setFilter('all');
            }}
            onSubmitEditing={() => remember(query)}
            placeholder="Search courses, topics, lectures, notes…"
            placeholderTextColor={UI.muted}
            autoFocus
            returnKeyType="search"
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear">
              <Ionicons name="close-circle" size={16} color={UI.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {counts.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ flexGrow: 0 }}>
          <Chip label={`All · ${results.length}`} on={filter === 'all'} onPress={() => setFilter('all')} />
          {counts.map((g) => (
            <Chip key={g.kind} label={`${g.label} · ${g.n}`} on={filter === g.kind} onPress={() => setFilter(g.kind)} />
          ))}
        </ScrollView>
      )}

      <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {debounced.trim().length < 2 ? (
          recent.length ? (
            <>
              <View style={styles.recentHead}>
                <Text style={styles.group}>RECENT SEARCHES</Text>
                <Pressable
                  onPress={() => {
                    setRecent([]);
                    saveJSON(RECENT_KEY, []);
                  }}
                >
                  <Text style={styles.clear}>Clear</Text>
                </Pressable>
              </View>
              {recent.map((r) => (
                <Pressable key={r} style={styles.recent} onPress={() => setQuery(r)}>
                  <Ionicons name="time-outline" size={16} color={UI.muted} />
                  <Text style={styles.recentText}>{r}</Text>
                </Pressable>
              ))}
            </>
          ) : (
            <Text style={styles.hint}>Search finds courses, deadlines, topics, lectures and materials, and words spoken in your lecture transcripts.</Text>
          )
        ) : shown.length === 0 ? (
          <EmptyState
            compact
            icon="search-outline"
            title="No results"
            message={`Nothing matches “${debounced.trim()}”. Try fewer or different words, or ask Zuri.`}
            primary={{ label: 'Ask Zuri instead', icon: 'chatbubble-ellipses-outline', onPress: () => router.push({ pathname: '/ask', params: { q: debounced } } as any) }}
          />
        ) : (
          RESULT_GROUPS.filter((g) => filter === 'all' || g.kind === filter).map((g) => {
            const list = shown.filter((r) => r.kind === g.kind);
            if (!list.length) return null;
            return (
              <View key={g.kind} style={{ marginBottom: 18 }}>
                <Text style={styles.group}>{g.label.toUpperCase()}</Text>
                <View style={styles.card}>
                  {list.map((r, i) => (
                    <Pressable
                      key={r.id}
                      style={({ pressed }) => [styles.row, i > 0 && styles.rowBorder, pressed && { opacity: 0.8 }]}
                      onPress={() => open(r.href)}
                      accessibilityRole="button"
                    >
                      <View style={styles.icon}>
                        <Ionicons name={r.icon} size={17} color={UI.ink} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.title, r.kind === 'quote' && styles.quote]} numberOfLines={r.kind === 'quote' ? 3 : 2}>
                          {r.title}
                        </Text>
                        <Text style={styles.subtitle} numberOfLines={1}>
                          {r.subtitle}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 10 },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: 23, borderWidth: 1, borderColor: UI.border, backgroundColor: UI.card, paddingHorizontal: 16 },
  input: { flex: 1, fontFamily: ZuriFonts.bodyRegular, fontSize: 15, color: UI.ink },
  chips: { gap: 8, paddingHorizontal: 20, paddingBottom: 10 },
  scroll: { padding: 20, paddingTop: 6, paddingBottom: 48, maxWidth: 680, width: '100%', alignSelf: 'center' },
  group: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, letterSpacing: 1.2, color: UI.muted, marginBottom: 8 },
  card: { backgroundColor: UI.card, borderRadius: 16, borderWidth: 1, borderColor: UI.border, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: UI.borderSoft },
  icon: { width: 34, height: 34, borderRadius: 10, backgroundColor: UI.cardMuted, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: ZuriFonts.bodyMedium, fontSize: 15, color: UI.ink },
  quote: { fontFamily: ZuriFonts.bodyRegular, fontSize: 14, fontStyle: 'italic', color: UI.inkSoft },
  subtitle: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 2 },
  recentHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clear: { fontFamily: ZuriFonts.labelSmBold, fontSize: 12, color: UI.amber },
  recent: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  recentText: { fontFamily: ZuriFonts.bodyRegular, fontSize: 15, color: UI.ink },
  hint: { fontFamily: ZuriFonts.bodyRegular, fontSize: 14, lineHeight: 21, color: UI.muted, textAlign: 'center', marginTop: 24 },
});

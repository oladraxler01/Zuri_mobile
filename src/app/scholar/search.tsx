import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useResearch } from '@/context/research-context';
import { ED, EdPage, Rule, PaperRow, edStyles } from '@/components/research/editorial';
import { ErrorState } from '@/components/states/state-view';
import { searchPapers, type PaperSort } from '@/services/scholar-api';
import { ApiError } from '@/services/lecture-api';
import type { Paper } from '@/types/research';

const SINCE = [
  { label: 'Any time', year: undefined },
  { label: 'Since 2020', year: 2020 },
  { label: 'Since 2015', year: 2015 },
];

/** Search scholarly papers (OpenAlex). ?projectId= adds results straight to a project. */
export default function ScholarSearchScreen() {
  const params = useLocalSearchParams<{ q?: string; projectId?: string }>();
  const research = useResearch();
  const project = research.projects.find((p) => p.id === params.projectId);
  const [query, setQuery] = useState(params.q ?? '');
  const [sort, setSort] = useState<PaperSort>('relevance');
  const [since, setSince] = useState<number | undefined>();
  const [oaOnly, setOaOnly] = useState(false);
  const [results, setResults] = useState<Paper[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const run = async (p = 1) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await searchPapers(query.trim(), { sort, fromYear: since, openAccessOnly: oaOnly, page: p });
      setResults((prev) => (p === 1 ? r.papers : [...prev, ...r.papers]));
      setTotal(r.total);
      setPage(p);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError('server', 'Search failed.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    run(1);
  }, [sort, since, oaOnly]);

  return (
    <EdPage>
      {project && <Text style={styles.adding}>Adding sources to “{project.title}”</Text>}
      <View style={styles.searchRow}>
        <TextInput
          style={[edStyles.input, { flex: 1 }]}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => run(1)}
          placeholder="Search papers, authors, topics"
          placeholderTextColor={ED.muted}
          returnKeyType="search"
          autoFocus={!params.q}
        />
        <Pressable onPress={() => run(1)} style={styles.go} accessibilityLabel="Search">
          <Ionicons name="search" size={18} color={ED.paper} />
        </Pressable>
      </View>

      <View style={styles.filters}>
        {(['relevance', 'cited', 'newest'] as PaperSort[]).map((s) => (
          <Pressable key={s} style={[edStyles.tag, sort === s && edStyles.tagOn]} onPress={() => setSort(s)}>
            <Text style={[edStyles.tagText, sort === s && { color: ED.paper }]}>{s === 'relevance' ? 'Most relevant' : s === 'cited' ? 'Most cited' : 'Newest'}</Text>
          </Pressable>
        ))}
        {SINCE.map((y) => (
          <Pressable key={y.label} style={[edStyles.tag, since === y.year && edStyles.tagOn]} onPress={() => setSince(y.year)}>
            <Text style={[edStyles.tagText, since === y.year && { color: ED.paper }]}>{y.label}</Text>
          </Pressable>
        ))}
        <Pressable style={[edStyles.tag, oaOnly && edStyles.tagOn]} onPress={() => setOaOnly(!oaOnly)}>
          <Text style={[edStyles.tagText, oaOnly && { color: ED.paper }]}>Open access</Text>
        </Pressable>
      </View>
      <Rule heavy />

      {error ? (
        <ErrorState kind={error.kind === 'network' ? 'network' : 'server'} message={error.message} onRetry={() => run(1)} compact />
      ) : (
        <>
          {!!total && <Text style={edStyles.muted}>{total.toLocaleString()} results</Text>}
          {results.map((p) => {
            const inProject = project?.sourceIds.includes(p.id);
            const saved = research.isSaved(p.id);
            return (
              <PaperRow
                key={p.id}
                paper={p}
                showAbstract
                onPress={undefined}
                right={
                  project ? (
                    <Pressable
                      onPress={() => (inProject ? research.removeSource(project.id, p.id) : research.addSource(project.id, p))}
                      hitSlop={10}
                      accessibilityLabel={inProject ? 'Remove from project' : 'Add to project'}
                    >
                      <Ionicons name={inProject ? 'checkmark-circle' : 'add-circle-outline'} size={24} color={inProject ? ED.accent : ED.ink} />
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => research.toggleSaved(p)} hitSlop={10} accessibilityLabel={saved ? 'Unsave paper' : 'Save paper'}>
                      <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={saved ? ED.accent : ED.ink} />
                    </Pressable>
                  )
                }
              />
            );
          })}
          {loading && <ActivityIndicator color={ED.accent} style={{ marginVertical: 20 }} />}
          {!loading && results.length > 0 && results.length < total && (
            <Pressable style={edStyles.btnGhost} onPress={() => run(page + 1)}>
              <Text style={edStyles.btnGhostText}>Load more</Text>
            </Pressable>
          )}
          {!loading && !results.length && !!query.trim() && <Text style={edStyles.muted}>No papers found. Try broader words.</Text>}
        </>
      )}
    </EdPage>
  );
}

const styles = StyleSheet.create({
  adding: { fontFamily: 'SourceSerif4_400Regular', fontSize: 15, fontStyle: 'italic', color: ED.accent },
  searchRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  go: { width: 46, height: 46, backgroundColor: ED.ink, alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

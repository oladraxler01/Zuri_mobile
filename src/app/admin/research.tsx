import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { useInstitution } from '@/context/institution-context';
import { ED, EdPage, Masthead, Rule, PaperRow, edStyles } from '@/components/research/editorial';
import { ErrorState } from '@/components/states/state-view';
import { findInstitution, institutionWorks, type InstitutionInfo, type PaperSort } from '@/services/scholar-api';
import type { Paper } from '@/types/research';

/** Institutional research search: papers by the university's own authors (OpenAlex). */
export default function InstitutionResearchScreen() {
  const { settings } = useInstitution();
  const [inst, setInst] = useState<InstitutionInfo | null | undefined>(undefined);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<PaperSort>('cited');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    findInstitution(settings.name)
      .then((i) => setInst(i ?? null))
      .catch((e) => {
        setInst(null);
        setError(e.message);
      });
  }, [settings.name]);

  const run = async (q = query) => {
    if (!inst) return;
    setLoading(true);
    setError('');
    try {
      const r = await institutionWorks(inst.id, q, sort);
      setPapers(r.papers);
      setTotal(r.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (inst) run();
  }, [inst, sort]);

  return (
    <EdPage edges={['top', 'bottom']}>
      <Masthead
        kicker="INSTITUTIONAL RESEARCH"
        title={inst?.name ?? settings.name}
        dek={inst ? `${inst.worksCount.toLocaleString()} publications by authors at this institution, from OpenAlex.` : 'Research published by your university’s staff and students.'}
      />
      <Rule heavy />
      {inst === undefined ? (
        <ActivityIndicator color={ED.accent} style={{ marginTop: 30 }} />
      ) : inst === null ? (
        error ? (
          <ErrorState kind="network" message={error} compact />
        ) : (
          <Text style={edStyles.body}>“{settings.name}” wasn’t found in the OpenAlex catalogue. Check the institution name in Settings.</Text>
        )
      ) : (
        <>
          <View style={styles.row}>
            <TextInput
              style={[edStyles.input, { flex: 1 }]}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => run()}
              placeholder={`Search ${inst.name} research`}
              placeholderTextColor={ED.muted}
              returnKeyType="search"
            />
            <Pressable style={styles.go} onPress={() => run()} accessibilityLabel="Search">
              <Ionicons name="search" size={18} color={ED.paper} />
            </Pressable>
          </View>
          <View style={styles.tags}>
            {(['cited', 'newest', 'relevance'] as PaperSort[]).map((s) => (
              <Pressable key={s} style={[edStyles.tag, sort === s && edStyles.tagOn]} onPress={() => setSort(s)}>
                <Text style={[edStyles.tagText, sort === s && { color: ED.paper }]}>{s === 'cited' ? 'Most cited' : s === 'newest' ? 'Newest' : 'Most relevant'}</Text>
              </Pressable>
            ))}
          </View>
          {!!error && <ErrorState kind="network" message={error} onRetry={() => run()} compact />}
          {loading ? (
            <ActivityIndicator color={ED.accent} style={{ marginTop: 20 }} />
          ) : (
            <>
              <Text style={edStyles.muted}>{total.toLocaleString()} papers</Text>
              {papers.map((p) => (
                <PaperRow key={p.id} paper={p} />
              ))}
            </>
          )}
        </>
      )}
      <Text style={styles.credit}>Data from OpenAlex. Only the institution name and your search words are sent.</Text>
    </EdPage>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  go: { width: 46, height: 46, backgroundColor: ED.ink, alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  credit: { fontFamily: ZuriFonts.bodyRegular, fontSize: 11, color: ED.muted, textAlign: 'center', marginTop: 12 },
});

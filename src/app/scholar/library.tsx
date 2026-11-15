import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useResearch } from '@/context/research-context';
import { useMaterials } from '@/context/materials-context';
import { ED, EdPage, Masthead, Rule, PaperRow, edStyles } from '@/components/research/editorial';

/** Research library: saved papers, every paper in your projects, and your own reading material. */
export default function ResearchLibraryScreen() {
  const research = useResearch();
  const { materials } = useMaterials();
  const [view, setView] = useState<'saved' | 'all' | 'documents' | 'archived'>('saved');
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const match = (t: string) => !q || t.toLowerCase().includes(q);
  const saved = research.saved.map((id) => research.papers[id]).filter(Boolean).filter((p) => match(`${p.title} ${p.authors.join(' ')}`));
  const all = Object.values(research.papers).filter((p) => match(`${p.title} ${p.authors.join(' ')}`)).sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  const docs = materials.filter((m) => (m.category === 'reading' || m.category === 'notes') && match(`${m.name} ${m.analysis?.title ?? ''}`));
  const archived = research.projects.filter((p) => p.archived);

  const VIEWS = [
    { key: 'saved', label: `Saved · ${research.saved.length}` },
    { key: 'all', label: `All papers · ${Object.keys(research.papers).length}` },
    { key: 'documents', label: `Your documents · ${docs.length}` },
    { key: 'archived', label: `Archived · ${archived.length}` },
  ] as const;

  return (
    <EdPage>
      <Masthead kicker="ZURI RESEARCH" title="Library" dek="Papers you’ve saved or used, available offline." />
      <View style={styles.tabs}>
        {VIEWS.map((v) => (
          <Pressable key={v.key} style={[edStyles.tag, view === v.key && edStyles.tagOn]} onPress={() => setView(v.key)}>
            <Text style={[edStyles.tagText, view === v.key && { color: ED.paper }]}>{v.label}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput style={[edStyles.input, { fontSize: 16 }]} value={query} onChangeText={setQuery} placeholder="Filter by title or author" placeholderTextColor={ED.muted} />
      <Rule heavy />

      {view === 'saved' &&
        (saved.length ? (
          saved.map((p) => (
            <PaperRow
              key={p.id}
              paper={p}
              right={
                <Pressable onPress={() => research.toggleSaved(p)} hitSlop={10} accessibilityLabel="Unsave">
                  <Ionicons name="bookmark" size={20} color={ED.accent} />
                </Pressable>
              }
            />
          ))
        ) : (
          <Text style={edStyles.muted}>Bookmark papers from search or a paper page to keep them here.</Text>
        ))}
      {view === 'all' && (all.length ? all.map((p) => <PaperRow key={p.id} paper={p} />) : <Text style={edStyles.muted}>No papers yet.</Text>)}
      {view === 'documents' &&
        (docs.length ? (
          docs.map((m) => (
            <Pressable key={m.id} style={styles.doc} onPress={() => router.push(`/material/${m.id}` as Href)}>
              <Text style={styles.docTitle}>{m.analysis?.title ?? m.name}</Text>
              <Text style={edStyles.muted}>{[m.courseCode, m.name].filter(Boolean).join(' · ')}</Text>
            </Pressable>
          ))
        ) : (
          <Text style={edStyles.muted}>Reading and notes you upload in Materials appear here.</Text>
        ))}
      {view === 'archived' &&
        (archived.length ? (
          archived.map((p) => (
            <Pressable key={p.id} style={styles.doc} onPress={() => router.push(`/scholar/project/${p.id}` as Href)}>
              <Text style={styles.docTitle}>{p.title}</Text>
              <Text style={edStyles.muted}>{p.sourceIds.length} sources · archived</Text>
            </Pressable>
          ))
        ) : (
          <Text style={edStyles.muted}>No archived projects.</Text>
        ))}
    </EdPage>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  doc: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ED.rule, gap: 4 },
  docTitle: { fontFamily: 'SourceSerif4_600SemiBold', fontSize: 18, color: ED.ink },
});

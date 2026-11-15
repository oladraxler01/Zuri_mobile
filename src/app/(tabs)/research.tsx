import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiFonts } from '@/constants/lexi-theme';
import { useResearch } from '@/context/research-context';
import { useAcademic } from '@/context/academic-context';
import { useNetwork } from '@/context/network-context';
import { ED, EdPage, Masthead, Rule, SectionHead, PaperRow, edStyles } from '@/components/research/editorial';

/** Research home: search the literature, your projects, saved papers. */
export default function ResearchHomeScreen() {
  const { projects, saved, papers } = useResearch();
  const { state } = useAcademic();
  const { isOnline } = useNetwork();
  const [query, setQuery] = useState('');

  const active = projects.filter((p) => !p.archived);
  const recentSaved = saved.slice(0, 4).map((id) => papers[id]).filter(Boolean);
  const suggestions = state.courses.slice(0, 4).map((c) => c.title);
  const search = (q: string) => q.trim() && router.push({ pathname: '/scholar/search', params: { q: q.trim() } } as any);

  return (
    <EdPage back={false} right={<Pressable onPress={() => router.push('/scholar/library' as Href)} hitSlop={10} accessibilityLabel="Library"><Ionicons name="library-outline" size={22} color={ED.ink} /></Pressable>}>
      <Masthead kicker="ZURI RESEARCH" title="Read the literature, build an argument" dek="Search millions of scholarly papers, collect evidence into projects, and draft a synthesis with every source cited." />
      <Rule heavy />

      <View style={styles.searchRow}>
        <TextInput
          style={[edStyles.input, { flex: 1 }]}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => search(query)}
          placeholder="Search papers, authors, topics"
          placeholderTextColor={ED.muted}
          returnKeyType="search"
        />
        <Pressable onPress={() => search(query)} style={styles.go} accessibilityLabel="Search">
          <Ionicons name="arrow-forward" size={20} color={ED.paper} />
        </Pressable>
      </View>
      {!isOnline && <Text style={edStyles.muted}>You’re offline. Saved papers and projects still open; searching needs a connection.</Text>}
      <View style={styles.suggest}>
        {suggestions.map((s) => (
          <Pressable key={s} style={edStyles.tag} onPress={() => search(s)}>
            <Text style={edStyles.tagText}>{s}</Text>
          </Pressable>
        ))}
      </View>

      <SectionHead title={`Projects · ${active.length}`} action={{ label: 'New project', onPress: () => router.push('/scholar/project/new' as Href) }} />
      {active.length === 0 ? (
        <Pressable style={styles.empty} onPress={() => router.push('/scholar/project/new' as Href)}>
          <Text style={styles.emptyTitle}>Start your first research project</Text>
          <Text style={edStyles.muted}>Give it a question, add sources from search, extract evidence, and Zuri drafts the synthesis and citations.</Text>
        </Pressable>
      ) : (
        active.map((p) => (
          <Pressable key={p.id} style={({ pressed }) => [styles.project, pressed && { opacity: 0.75 }]} onPress={() => router.push(`/scholar/project/${p.id}` as Href)}>
            <Text style={styles.projectTitle}>{p.title}</Text>
            {!!p.question && <Text style={styles.projectQ} numberOfLines={2}>{p.question}</Text>}
            <Text style={styles.projectMeta}>
              {p.sourceIds.length} sources · {p.evidence.length} evidence · {p.notes.length} notes
            </Text>
          </Pressable>
        ))
      )}

      {recentSaved.length > 0 && (
        <>
          <SectionHead title="Recently saved" action={{ label: 'Library', onPress: () => router.push('/scholar/library' as Href) }} />
          {recentSaved.map((p) => (
            <PaperRow key={p.id} paper={p} />
          ))}
        </>
      )}

      <Text style={styles.credit}>Paper data from OpenAlex, an open catalogue of scholarly works. Only your search words are sent.</Text>
    </EdPage>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 8 },
  go: { width: 46, height: 46, backgroundColor: ED.ink, alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
  suggest: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  empty: { borderWidth: 1, borderColor: ED.rule, borderStyle: 'dashed', padding: 18, gap: 6 },
  emptyTitle: { fontFamily: 'SourceSerif4_600SemiBold', fontSize: 19, color: ED.ink },
  project: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ED.rule, gap: 4 },
  projectTitle: { fontFamily: 'SourceSerif4_600SemiBold', fontSize: 21, lineHeight: 27, color: ED.ink },
  projectQ: { fontFamily: 'SourceSerif4_400Regular', fontSize: 15, lineHeight: 22, color: ED.inkSoft, fontStyle: 'italic' },
  projectMeta: { fontFamily: LexiFonts.labelSmBold, fontSize: 11, letterSpacing: 0.6, color: ED.muted },
  credit: { fontFamily: LexiFonts.bodyRegular, fontSize: 11, color: ED.muted, textAlign: 'center', marginTop: 16 },
});

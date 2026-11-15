import React from 'react';
import { View, Text, Pressable, Share, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useResearch } from '@/context/research-context';
import { ED, EdPage, Masthead, Rule, edStyles } from '@/components/research/editorial';
import { EmptyState } from '@/components/states/state-view';
import { formatCitation, STYLE_LABEL } from '@/utils/research';
import type { CitationStyle } from '@/types/research';

/** Citation manager: every source in the project, formatted in the chosen style. */
export default function CitationsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const research = useResearch();
  const project = research.projects.find((p) => p.id === id);
  if (!project) return <EdPage><EmptyState icon="list-outline" title="Project not found" /></EdPage>;

  const style = project.citationStyle;
  const papers = [...research.projectPapers(project.id)].sort((a, b) => (a.authors[0] ?? a.title).localeCompare(b.authors[0] ?? b.title));
  const all = papers.map((p) => formatCitation(p, style)).join(style === 'bibtex' ? '\n\n' : '\n');

  return (
    <EdPage edges={['top', 'bottom']}>
      <Masthead kicker={project.title.toUpperCase()} title="Citations" dek={`${papers.length} sources, alphabetical, in ${STYLE_LABEL[style]}.`} />
      <View style={styles.tags}>
        {(Object.keys(STYLE_LABEL) as CitationStyle[]).map((s) => (
          <Pressable key={s} style={[edStyles.tag, style === s && edStyles.tagOn]} onPress={() => research.updateProject(project.id, { citationStyle: s })}>
            <Text style={[edStyles.tagText, style === s && { color: ED.paper }]}>{STYLE_LABEL[s]}</Text>
          </Pressable>
        ))}
      </View>
      <Rule heavy />
      {papers.length === 0 ? (
        <EmptyState compact icon="list-outline" title="No sources yet" message="Sources you add to the project appear here, formatted and ready to paste." />
      ) : (
        <>
          {papers.map((p) => (
            <View key={p.id} style={styles.entry}>
              <Text style={style === 'bibtex' ? styles.code : styles.cite} selectable>
                {formatCitation(p, style)}
              </Text>
              <Pressable onPress={() => Share.share({ message: formatCitation(p, style) })} hitSlop={8} accessibilityLabel="Share this citation">
                <Ionicons name="share-outline" size={16} color={ED.muted} />
              </Pressable>
            </View>
          ))}
          <Pressable style={edStyles.btn} onPress={() => Share.share({ message: all })}>
            <Ionicons name="share-outline" size={16} color={ED.paper} />
            <Text style={edStyles.btnText}>Share all citations</Text>
          </Pressable>
          <Text style={edStyles.muted}>Check author names and capitalisation against your course’s style guide before submitting.</Text>
        </>
      )}
    </EdPage>
  );
}

const styles = StyleSheet.create({
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  entry: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ED.rule },
  cite: { flex: 1, fontFamily: 'SourceSerif4_400Regular', fontSize: 15, lineHeight: 23, color: ED.ink },
  code: { flex: 1, fontFamily: 'monospace', fontSize: 12, lineHeight: 18, color: ED.ink },
});

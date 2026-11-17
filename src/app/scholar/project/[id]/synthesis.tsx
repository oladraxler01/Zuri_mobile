import React, { useState } from 'react';
import { View, Text, Pressable, Share, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { useResearch } from '@/context/research-context';
import { ED, EdPage, Masthead, Rule, SectionHead, edStyles } from '@/components/research/editorial';
import { EmptyState } from '@/components/states/state-view';
import { buildSynthesis, formatCitation, inText } from '@/utils/research';
import { askZuri } from '@/services/ai-api';
import { MarkdownText } from '@/components/markdown-text';

/** Synthesis: evidence organised by theme (agreeing, disagreeing, context), gaps, and references. */
export default function SynthesisScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const research = useResearch();
  const project = research.projects.find((p) => p.id === id);
  const [overview, setOverview] = useState<{ busy: boolean; text: string; error: string }>({ busy: false, text: '', error: '' });
  if (!project) return <EdPage><EmptyState icon="document-text-outline" title="Project not found" /></EdPage>;

  const papers = research.projectPapers(project.id);
  const { sections, gaps } = buildSynthesis(project, papers);
  const cited = papers.filter((p) => project.evidence.some((e) => e.paperId === p.id));

  const asText = () => {
    const lines = [`${project.title}`, project.question ? `Question: ${project.question}` : '', ''];
    for (const s of sections) {
      lines.push(s.theme.toUpperCase());
      if (s.supports.length) lines.push(`Evidence for (${s.supports.length}):`, ...s.supports.map(({ e, p }) => `• “${e.quote}” ${p ? inText(p) : ''}`));
      if (s.contradicts.length) lines.push(`Evidence against (${s.contradicts.length}):`, ...s.contradicts.map(({ e, p }) => `• “${e.quote}” ${p ? inText(p) : ''}`));
      if (s.background.length) lines.push('Context:', ...s.background.map(({ e, p }) => `• “${e.quote}” ${p ? inText(p) : ''}`));
      lines.push('');
    }
    if (gaps.length) lines.push(`Gaps: ${gaps.join(', ')}`, '');
    lines.push('References', ...cited.map((p) => formatCitation(p, project.citationStyle)));
    return lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
  };

  /** Zuri's AI reads the evidence, theme by theme (max 5 themes), and writes an overview with citations. */
  const writeOverview = async () => {
    setOverview({ busy: true, text: '', error: '' });
    const context = sections.slice(0, 5).map((s) => {
      const lines = [
        ...s.supports.map(({ e, p }) => `FOR: "${e.quote}" ${p ? inText(p) : ''}`),
        ...s.contradicts.map(({ e, p }) => `AGAINST: "${e.quote}" ${p ? inText(p) : ''}`),
        ...s.background.map(({ e, p }) => `CONTEXT: "${e.quote}" ${p ? inText(p) : ''}`),
      ];
      return `Theme: ${s.theme}\n${lines.join('\n')}`;
    });
    const prompt =
      `Write a short literature overview for my project "${project.title}"${project.question ? ` on the question: ${project.question}` : ''}. ` +
      'For each theme, say what the evidence suggests, where sources disagree, and how strong the evidence is, citing author-year exactly as given. ' +
      `End with the gaps${gaps.length ? ` (themes with no evidence yet: ${gaps.join(', ')})` : ''} and what to read next. ` +
      'Use only the evidence provided. Keep it under 350 words. This is a study aid; I will write the final text myself.';
    try {
      setOverview({ busy: false, text: await askZuri(prompt, context, []), error: '' });
    } catch (e) {
      setOverview({ busy: false, text: '', error: e instanceof Error ? e.message : 'Zuri’s AI couldn’t write this right now.' });
    }
  };

  return (
    <EdPage edges={['top', 'bottom']}>
      <Masthead kicker={project.title.toUpperCase()} title="Synthesis" dek={project.question || 'What your sources say, theme by theme.'} />
      <Rule heavy />
      {project.evidence.length === 0 ? (
        <EmptyState
          compact
          icon="document-text-outline"
          title="No evidence yet"
          message="Open your sources and tap sentences to save them as evidence. The synthesis organises them by theme, with citations."
          primary={{ label: 'Go to sources', onPress: () => router.back() }}
        />
      ) : (
        <>
          <View style={styles.summary}>
            <Text style={edStyles.body}>
              {project.evidence.length} pieces of evidence from {cited.length} sources across {sections.length} themes.{' '}
              {project.evidence.filter((e) => e.stance === 'contradicts').length
                ? `${project.evidence.filter((e) => e.stance === 'contradicts').length} point against, which is worth addressing directly.`
                : 'No contradicting evidence yet; look for sources that disagree to strengthen the argument.'}
            </Text>
          </View>

          <View style={styles.overview}>
            {overview.text ? (
              <>
                <Text style={styles.groupLabel}>ZURI’S OVERVIEW OF YOUR EVIDENCE</Text>
                <MarkdownText text={overview.text} style={edStyles.serifBody} />
                <Pressable onPress={() => Share.share({ message: overview.text })} style={{ alignSelf: 'flex-start' }}>
                  <Text style={styles.cite}>Share overview</Text>
                </Pressable>
              </>
            ) : overview.busy ? (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <ActivityIndicator color={ED.ink} />
                <Text style={edStyles.muted}>Zuri is reading your evidence…</Text>
              </View>
            ) : (
              <Pressable style={edStyles.btn} onPress={writeOverview} accessibilityRole="button">
                <Ionicons name="sparkles-outline" size={16} color={ED.paper} />
                <Text style={edStyles.btnText}>{overview.error ? 'Try again' : 'Overview with Zuri'}</Text>
              </Pressable>
            )}
            {!!overview.error && <Text style={edStyles.muted}>{overview.error}</Text>}
          </View>

          {sections.map((s) => (
            <View key={s.theme} style={styles.section}>
              <Text style={styles.theme}>{s.theme}</Text>
              <Text style={edStyles.muted}>
                {s.supports.length} for · {s.contradicts.length} against · {s.background.length} context
              </Text>
              {[
                { label: 'The evidence suggests', list: s.supports },
                { label: 'However', list: s.contradicts },
                { label: 'Context', list: s.background },
              ].map((g) =>
                g.list.length ? (
                  <View key={g.label} style={{ gap: 6, marginTop: 8 }}>
                    <Text style={styles.groupLabel}>{g.label.toUpperCase()}</Text>
                    {g.list.map(({ e, p }) => (
                      <Text key={e.id} style={edStyles.serifBody}>
                        “{e.quote}” <Text style={styles.cite}>{p ? inText(p) : ''}</Text>
                      </Text>
                    ))}
                  </View>
                ) : null
              )}
            </View>
          ))}

          {gaps.length > 0 && (
            <>
              <SectionHead title="Gaps" />
              <Text style={edStyles.body}>Themes in your sources with no evidence extracted yet: {gaps.join(', ')}.</Text>
            </>
          )}

          <SectionHead title="References" />
          {cited.map((p) => (
            <Text key={p.id} style={styles.ref}>
              {formatCitation(p, project.citationStyle)}
            </Text>
          ))}

          <Pressable style={edStyles.btn} onPress={() => Share.share({ message: asText() })}>
            <Ionicons name="share-outline" size={16} color={ED.paper} />
            <Text style={edStyles.btnText}>Share synthesis</Text>
          </Pressable>
          <Text style={edStyles.muted}>This is an organised draft of your evidence, not finished prose. Write the argument in your own words.</Text>
        </>
      )}
    </EdPage>
  );
}

const styles = StyleSheet.create({
  overview: { gap: 8, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ED.rule },
  summary: { borderLeftWidth: 3, borderLeftColor: ED.accent, paddingLeft: 12 },
  section: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ED.rule },
  theme: { fontFamily: 'SourceSerif4_600SemiBold', fontSize: 22, color: ED.ink },
  groupLabel: { fontFamily: ZuriFonts.labelSmBold, fontSize: 10, letterSpacing: 1.4, color: ED.accent },
  cite: { fontFamily: ZuriFonts.bodyMedium, fontSize: 13, fontStyle: 'normal', color: ED.inkSoft },
  ref: { fontFamily: 'SourceSerif4_400Regular', fontSize: 14, lineHeight: 21, color: ED.ink, paddingLeft: 18, textIndent: -18 } as any,
});

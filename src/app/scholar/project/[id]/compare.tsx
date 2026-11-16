import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { useResearch } from '@/context/research-context';
import { ED, EdPage, Masthead, Rule, SectionHead, edStyles } from '@/components/research/editorial';
import { EmptyState } from '@/components/states/state-view';
import { inText, keyFindings } from '@/utils/research';

/** Compare 2–3 sources side by side. */
export default function CompareSourcesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const research = useResearch();
  const project = research.projects.find((p) => p.id === id);
  const [picked, setPicked] = useState<string[]>([]);
  if (!project) return <EdPage><EmptyState icon="git-compare-outline" title="Project not found" /></EdPage>;

  const papers = research.projectPapers(project.id);
  const chosen = (picked.length ? picked : papers.slice(0, 2).map((p) => p.id)).map((pid) => papers.find((p) => p.id === pid)).filter(Boolean) as typeof papers;
  const toggle = (pid: string) =>
    setPicked((cur) => {
      const base = cur.length ? cur : chosen.map((c) => c.id);
      return base.includes(pid) ? base.filter((x) => x !== pid) : [...base, pid].slice(-3);
    });
  const evidenceCount = (pid: string, stance?: string) => project.evidence.filter((e) => e.paperId === pid && (!stance || e.stance === stance)).length;

  const rows: { label: string; value: (p: (typeof papers)[number]) => string }[] = [
    { label: 'Year', value: (p) => (p.year ? String(p.year) : '—') },
    { label: 'Published in', value: (p) => p.venue ?? '—' },
    { label: 'Cited by', value: (p) => p.citedBy.toLocaleString() },
    { label: 'Open access', value: (p) => (p.oaUrl ? 'Yes' : 'No') },
    { label: 'Your evidence', value: (p) => `${evidenceCount(p.id)} (${evidenceCount(p.id, 'supports')} supports, ${evidenceCount(p.id, 'contradicts')} contradicts)` },
    { label: 'Topics', value: (p) => p.topics.slice(0, 4).join(', ') || '—' },
    { label: 'Key finding', value: (p) => keyFindings(p)[0] ?? 'No abstract available' },
  ];
  const shared = chosen.length > 1 ? chosen[0].topics.filter((t) => chosen.every((c) => c.topics.includes(t))) : [];

  return (
    <EdPage edges={['top', 'bottom']}>
      <Masthead kicker={project.title.toUpperCase()} title="Compare sources" dek="Pick up to three sources to set side by side." />
      <Rule heavy />
      {papers.length < 2 ? (
        <EmptyState compact icon="git-compare-outline" title="Add at least two sources" message="Comparison needs two or more sources in this project." />
      ) : (
        <>
          {papers.map((p) => {
            const on = chosen.some((c) => c.id === p.id);
            return (
              <Pressable key={p.id} style={styles.pickRow} onPress={() => toggle(p.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={20} color={on ? ED.accent : ED.ink} />
                <Text style={styles.pickTitle} numberOfLines={1}>
                  {inText(p)} {p.title}
                </Text>
              </Pressable>
            );
          })}

          <SectionHead title="Side by side" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.tr}>
                <View style={[styles.th, styles.labelCol]} />
                {chosen.map((p) => (
                  <View key={p.id} style={[styles.th, styles.col]}>
                    <Text style={styles.colTitle} numberOfLines={4}>
                      {p.title}
                    </Text>
                    <Text style={edStyles.muted}>{inText(p)}</Text>
                  </View>
                ))}
              </View>
              {rows.map((r) => (
                <View key={r.label} style={styles.tr}>
                  <View style={[styles.td, styles.labelCol]}>
                    <Text style={styles.rowLabel}>{r.label.toUpperCase()}</Text>
                  </View>
                  {chosen.map((p) => (
                    <View key={p.id} style={[styles.td, styles.col]}>
                      <Text style={styles.cell}>{r.value(p)}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
          {chosen.length > 1 && (
            <Text style={edStyles.body}>
              {shared.length ? `Common ground: ${shared.slice(0, 4).join(', ')}.` : 'These sources don’t share listed topics; they may answer different parts of your question.'}
            </Text>
          )}
        </>
      )}
    </EdPage>
  );
}

const styles = StyleSheet.create({
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  pickTitle: { flex: 1, fontFamily: ZuriFonts.bodyRegular, fontSize: 14, color: ED.ink },
  tr: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ED.rule },
  th: { paddingVertical: 10, paddingRight: 12 },
  td: { paddingVertical: 10, paddingRight: 12 },
  labelCol: { width: 100 },
  col: { width: 220 },
  colTitle: { fontFamily: 'SourceSerif4_600SemiBold', fontSize: 15, lineHeight: 20, color: ED.ink },
  rowLabel: { fontFamily: ZuriFonts.labelSmBold, fontSize: 10, letterSpacing: 1.2, color: ED.muted },
  cell: { fontFamily: ZuriFonts.bodyRegular, fontSize: 13, lineHeight: 19, color: ED.ink },
});

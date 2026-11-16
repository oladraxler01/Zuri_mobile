import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { useResearch } from '@/context/research-context';
import { useAcademic } from '@/context/academic-context';
import { ED, EdPage, Masthead, Rule, SectionHead, PaperRow, edStyles } from '@/components/research/editorial';
import { EmptyState } from '@/components/states/state-view';
import { deriveThemes, inText } from '@/utils/research';
import type { EvidenceStance } from '@/types/research';
import type { IoniconName } from '@/types/lecture';

type Tab = 'sources' | 'evidence' | 'notes';
const STANCE_ICON: Record<EvidenceStance, IoniconName> = { supports: 'add-circle-outline', contradicts: 'remove-circle-outline', background: 'ellipse-outline' };

/** Research workspace: question, tools, and the project's sources, evidence and notes. */
export default function ProjectWorkspaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const research = useResearch();
  const { state } = useAcademic();
  const project = research.projects.find((p) => p.id === id);
  const [tab, setTab] = useState<Tab>('sources');
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<string | null>(null);

  if (!project) {
    return (
      <EdPage>
        <EmptyState icon="folder-open-outline" title="Project not found" message="It may have been deleted." />
      </EdPage>
    );
  }
  const papers = research.projectPapers(project.id);
  const byId = new Map(papers.map((p) => [p.id, p]));
  const themes = deriveThemes(papers, project.themes);
  const course = state.courses.find((c) => c.id === project.courseId);
  const go = (sub: string) => router.push(`/scholar/project/${project.id}/${sub}` as Href);

  const tools: { key: string; label: string; icon: IoniconName; meta: string }[] = [
    { key: 'map', label: 'Literature map & themes', icon: 'git-network-outline', meta: `${themes.length} themes` },
    { key: 'compare', label: 'Compare sources', icon: 'git-compare-outline', meta: `${papers.length} sources` },
    { key: 'synthesis', label: 'Synthesis', icon: 'document-text-outline', meta: `${project.evidence.length} evidence` },
    { key: 'citations', label: 'Citations', icon: 'list-outline', meta: project.citationStyle.toUpperCase() },
    { key: 'chat', label: 'Ask your sources', icon: 'chatbubble-ellipses-outline', meta: 'Research chat' },
  ];

  const saveNote = () => {
    if (!draft.trim()) return;
    research.saveNote(project.id, { id: editing ?? undefined, text: draft.trim() });
    setDraft('');
    setEditing(null);
  };

  return (
    <EdPage
      right={
        <Pressable onPress={() => go('settings')} hitSlop={10} accessibilityLabel="Project settings">
          <Ionicons name="settings-outline" size={21} color={ED.ink} />
        </Pressable>
      }
    >
      <Masthead kicker={['RESEARCH PROJECT', course?.code].filter(Boolean).join(' · ')} title={project.title} dek={project.question || undefined} />
      <View style={styles.stats}>
        <Stat n={papers.length} label="sources" />
        <Stat n={project.evidence.length} label="evidence" />
        <Stat n={project.notes.length} label="notes" />
        <Stat n={themes.length} label="themes" />
      </View>
      <Rule heavy />

      <View style={styles.tools}>
        {tools.map((t) => (
          <Pressable key={t.key} style={({ pressed }) => [styles.tool, pressed && { opacity: 0.7 }]} onPress={() => go(t.key)}>
            <Ionicons name={t.icon} size={20} color={ED.ink} />
            <Text style={styles.toolLabel}>{t.label}</Text>
            <Text style={styles.toolMeta}>{t.meta}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.tabs}>
        {(['sources', 'evidence', 'notes'] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === t }}>
            <Text style={[styles.tabText, tab === t && { color: ED.ink }]}>{t[0].toUpperCase() + t.slice(1)}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'sources' && (
        <>
          <Pressable style={edStyles.btnGhost} onPress={() => router.push({ pathname: '/scholar/search', params: { q: project.keywords.join(' ') || project.title, projectId: project.id } } as any)}>
            <Ionicons name="add" size={16} color={ED.ink} />
            <Text style={edStyles.btnGhostText}>Find sources</Text>
          </Pressable>
          {papers.length ? (
            papers.map((p) => (
              <PaperRow
                key={p.id}
                paper={p}
                onPress={() => router.push({ pathname: '/scholar/paper/[id]', params: { id: p.id, projectId: project.id } } as any)}
                right={
                  <Pressable onPress={() => research.removeSource(project.id, p.id)} hitSlop={10} accessibilityLabel="Remove source">
                    <Ionicons name="close" size={18} color={ED.muted} />
                  </Pressable>
                }
              />
            ))
          ) : (
            <Text style={edStyles.muted}>No sources yet. Search the literature and add the papers that matter.</Text>
          )}
        </>
      )}

      {tab === 'evidence' && (
        <>
          <Text style={edStyles.muted}>Open a source and tap a sentence to extract it as evidence.</Text>
          {project.evidence.map((e) => {
            const p = byId.get(e.paperId);
            return (
              <View key={e.id} style={styles.evidence}>
                <View style={styles.evHead}>
                  <Ionicons name={STANCE_ICON[e.stance]} size={14} color={ED.accent} />
                  <Text style={styles.evStance}>{e.stance.toUpperCase()}</Text>
                  {!!e.theme && <Text style={styles.evTheme}>· {e.theme}</Text>}
                  <View style={{ flex: 1 }} />
                  <Pressable onPress={() => research.removeEvidence(project.id, e.id)} hitSlop={10} accessibilityLabel="Remove evidence">
                    <Ionicons name="trash-outline" size={15} color={ED.muted} />
                  </Pressable>
                </View>
                <Text style={styles.evQuote}>“{e.quote}”</Text>
                {p && <Text style={styles.evCite}>{inText(p)} {p.title}</Text>}
                <View style={styles.themeRow}>
                  {themes.slice(0, 6).map((t) => (
                    <Pressable
                      key={t.name}
                      style={[edStyles.tag, e.theme === t.name && edStyles.tagOn, { paddingVertical: 2 }]}
                      onPress={() => research.updateEvidence(project.id, e.id, { theme: e.theme === t.name ? undefined : t.name })}
                    >
                      <Text style={[edStyles.tagText, { fontSize: 11 }, e.theme === t.name && { color: ED.paper }]}>{t.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}
        </>
      )}

      {tab === 'notes' && (
        <>
          <TextInput
            style={[edStyles.input, { height: 90, textAlignVertical: 'top', paddingTop: 10, fontSize: 16 }]}
            value={draft}
            onChangeText={setDraft}
            multiline
            placeholder="Write a note, an idea, a counter-argument…"
            placeholderTextColor={ED.muted}
          />
          <Pressable style={[edStyles.btn, !draft.trim() && { opacity: 0.4 }]} disabled={!draft.trim()} onPress={saveNote}>
            <Text style={edStyles.btnText}>{editing ? 'Update note' : 'Add note'}</Text>
          </Pressable>
          {project.notes.map((n) => (
            <View key={n.id} style={styles.note}>
              <Text style={edStyles.serifBody}>{n.text}</Text>
              <View style={styles.noteActions}>
                <Text style={edStyles.muted}>{new Date(n.updatedAt).toLocaleDateString()}</Text>
                <View style={{ flex: 1 }} />
                <Pressable onPress={() => { setDraft(n.text); setEditing(n.id); }} hitSlop={8}>
                  <Text style={styles.noteAction}>Edit</Text>
                </Pressable>
                <Pressable onPress={() => research.removeNote(project.id, n.id)} hitSlop={8}>
                  <Text style={styles.noteAction}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      )}
    </EdPage>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statL}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', marginTop: 4 },
  statN: { fontFamily: 'SourceSerif4_600SemiBold', fontSize: 24, color: ED.ink },
  statL: { fontFamily: ZuriFonts.labelSmBold, fontSize: 10, letterSpacing: 1.2, color: ED.muted },
  tools: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: StyleSheet.hairlineWidth, borderLeftWidth: StyleSheet.hairlineWidth, borderColor: ED.rule },
  tool: { width: '50%', padding: 14, gap: 4, borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: ED.rule },
  toolLabel: { fontFamily: 'SourceSerif4_600SemiBold', fontSize: 15, color: ED.ink },
  toolMeta: { fontFamily: ZuriFonts.labelSmBold, fontSize: 10, letterSpacing: 1, color: ED.muted },
  tabs: { flexDirection: 'row', gap: 22, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ED.rule, marginTop: 8 },
  tab: { paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: ED.ink },
  tabText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 14, color: ED.muted },
  evidence: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ED.rule, gap: 6 },
  evHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  evStance: { fontFamily: ZuriFonts.labelSmBold, fontSize: 10, letterSpacing: 1.4, color: ED.accent },
  evTheme: { fontFamily: ZuriFonts.labelSmBold, fontSize: 10, color: ED.muted },
  evQuote: { fontFamily: 'SourceSerif4_400Regular', fontSize: 16, lineHeight: 24, color: ED.ink, fontStyle: 'italic' },
  evCite: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: ED.inkSoft },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  note: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ED.rule, gap: 8 },
  noteActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  noteAction: { fontFamily: ZuriFonts.labelSmBold, fontSize: 12, color: ED.accent },
});

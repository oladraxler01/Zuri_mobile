import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { useResearch } from '@/context/research-context';
import { ED, EdPage, Masthead, Rule, SectionHead, edStyles } from '@/components/research/editorial';
import { EmptyState } from '@/components/states/state-view';
import { connections, deriveThemes, inText } from '@/utils/research';

/** Literature map: themes (clusters of sources) and the strongest links between sources. */
export default function LiteratureMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const research = useResearch();
  const project = research.projects.find((p) => p.id === id);
  const [newTheme, setNewTheme] = useState('');
  if (!project) return <EdPage><EmptyState icon="git-network-outline" title="Project not found" /></EdPage>;

  const papers = research.projectPapers(project.id);
  const themes = deriveThemes(papers, project.themes);
  const links = connections(papers).slice(0, 8);
  const degree = new Map<string, number>();
  connections(papers).forEach((l) => {
    degree.set(l.a.id, (degree.get(l.a.id) ?? 0) + 1);
    degree.set(l.b.id, (degree.get(l.b.id) ?? 0) + 1);
  });
  const hubs = [...papers].sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0)).slice(0, 3);
  const open = (pid: string) => router.push({ pathname: '/scholar/paper/[id]', params: { id: pid, projectId: project.id } } as any);

  return (
    <EdPage edges={['top', 'bottom']}>
      <Masthead kicker={project.title.toUpperCase()} title="Literature map" dek="How your sources group into themes and connect to each other through shared topics." />
      <Rule heavy />
      {papers.length < 2 ? (
        <EmptyState compact icon="git-network-outline" title="Add a few more sources" message="The map needs at least two sources to find shared themes." />
      ) : (
        <>
          <SectionHead title={`Research themes · ${themes.length}`} />
          {themes.map((t) => (
            <View key={t.name} style={styles.theme}>
              <View style={styles.themeHead}>
                <Text style={styles.themeName}>{t.name}</Text>
                {t.custom && <Text style={styles.custom}>YOURS</Text>}
                <Text style={styles.count}>{t.paperIds.length}</Text>
                {t.custom && (
                  <Pressable onPress={() => research.updateProject(project.id, { themes: project.themes.filter((x) => x !== t.name) })} hitSlop={8} accessibilityLabel="Remove theme">
                    <Ionicons name="close" size={16} color={ED.muted} />
                  </Pressable>
                )}
              </View>
              {/* a simple bar shows how much of the literature sits in this theme */}
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(t.paperIds.length / papers.length) * 100}%` }]} />
              </View>
              {t.paperIds.map((pid) => {
                const p = papers.find((x) => x.id === pid);
                return p ? (
                  <Pressable key={pid} onPress={() => open(pid)}>
                    <Text style={styles.member} numberOfLines={1}>
                      {inText(p)} {p.title}
                    </Text>
                  </Pressable>
                ) : null;
              })}
            </View>
          ))}
          <View style={styles.addRow}>
            <TextInput style={[edStyles.input, { flex: 1, fontSize: 16 }]} value={newTheme} onChangeText={setNewTheme} placeholder="Add your own theme" placeholderTextColor={ED.muted} />
            <Pressable
              style={[styles.addBtn, !newTheme.trim() && { opacity: 0.4 }]}
              disabled={!newTheme.trim()}
              onPress={() => {
                research.updateProject(project.id, { themes: [...project.themes, newTheme.trim()] });
                setNewTheme('');
              }}
            >
              <Ionicons name="add" size={20} color={ED.paper} />
            </Pressable>
          </View>

          <SectionHead title="Most connected sources" />
          <Text style={edStyles.muted}>Papers that share the most topics with the rest of your sources; often the best starting point.</Text>
          {hubs.map((p, i) => (
            <Pressable key={p.id} style={styles.hub} onPress={() => open(p.id)}>
              <Text style={styles.hubN}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.hubTitle}>{p.title}</Text>
                <Text style={edStyles.muted}>{degree.get(p.id) ?? 0} connections · {inText(p)}</Text>
              </View>
            </Pressable>
          ))}

          <SectionHead title="Strongest links" />
          {links.length ? (
            links.map((l) => (
              <View key={`${l.a.id}-${l.b.id}`} style={styles.link}>
                <Text style={styles.linkPair} numberOfLines={2}>
                  {inText(l.a)} ⟷ {inText(l.b)}
                </Text>
                <Text style={edStyles.muted}>Share: {l.shared.slice(0, 3).join(', ')}</Text>
              </View>
            ))
          ) : (
            <Text style={edStyles.muted}>These sources don’t share topics yet; they may cover separate threads.</Text>
          )}
        </>
      )}
    </EdPage>
  );
}

const styles = StyleSheet.create({
  theme: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ED.rule, gap: 6 },
  themeHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  themeName: { flex: 1, fontFamily: 'SourceSerif4_600SemiBold', fontSize: 18, color: ED.ink },
  custom: { fontFamily: ZuriFonts.labelSmBold, fontSize: 9, letterSpacing: 1.2, color: ED.accent },
  count: { fontFamily: 'SourceSerif4_600SemiBold', fontSize: 16, color: ED.inkSoft },
  track: { height: 3, backgroundColor: ED.rule },
  fill: { height: 3, backgroundColor: ED.accent },
  member: { fontFamily: ZuriFonts.bodyRegular, fontSize: 13, color: ED.inkSoft },
  addRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  addBtn: { width: 44, height: 44, backgroundColor: ED.ink, alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
  hub: { flexDirection: 'row', gap: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ED.rule },
  hubN: { fontFamily: 'SourceSerif4_600SemiBold', fontSize: 26, color: ED.accent, width: 22 },
  hubTitle: { fontFamily: 'SourceSerif4_600SemiBold', fontSize: 16, lineHeight: 22, color: ED.ink },
  link: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ED.rule, gap: 2 },
  linkPair: { fontFamily: ZuriFonts.bodyMedium, fontSize: 14, color: ED.ink },
});

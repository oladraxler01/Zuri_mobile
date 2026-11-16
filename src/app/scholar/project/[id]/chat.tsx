import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { useResearch } from '@/context/research-context';
import { ED, EdPage, Masthead, Rule, edStyles } from '@/components/research/editorial';
import { EmptyState } from '@/components/states/state-view';
import { askProject, inText, type ResearchHit } from '@/utils/research';

type Turn = { q: string; hits: ResearchHit[] };

/** Research chat: questions answered from this project's sources, evidence and notes. */
export default function ResearchChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const research = useResearch();
  const project = research.projects.find((p) => p.id === id);
  const [q, setQ] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  if (!project) return <EdPage><EmptyState icon="chatbubble-ellipses-outline" title="Project not found" /></EdPage>;

  const papers = research.projectPapers(project.id);
  const ask = (text?: string) => {
    const question = (text ?? q).trim();
    if (!question) return;
    setTurns((t) => [{ q: question, hits: askProject(question, project, papers) }, ...t]);
    setQ('');
  };
  const starters = [project.question, ...project.keywords.map((k) => `What do the sources say about ${k}?`)].filter(Boolean).slice(0, 3) as string[];

  return (
    <EdPage edges={['top', 'bottom']}>
      <Masthead kicker={project.title.toUpperCase()} title="Ask your sources" dek={`Answers quote your ${papers.length} sources, extracted evidence and notes, with citations.`} />
      <Rule heavy />
      <View style={styles.row}>
        <TextInput style={[edStyles.input, { flex: 1, fontSize: 16 }]} value={q} onChangeText={setQ} onSubmitEditing={() => ask()} placeholder="Ask a question about your literature" placeholderTextColor={ED.muted} returnKeyType="send" />
        <Pressable style={styles.send} onPress={() => ask()} accessibilityLabel="Ask">
          <Ionicons name="arrow-up" size={20} color={ED.paper} />
        </Pressable>
      </View>
      {turns.length === 0 && starters.map((s) => (
        <Pressable key={s} onPress={() => ask(s)}>
          <Text style={styles.starter}>{s} →</Text>
        </Pressable>
      ))}

      {turns.map((t, i) => (
        <View key={i} style={styles.turn}>
          <Text style={styles.q}>{t.q}</Text>
          {t.hits.length ? (
            t.hits.map((h, j) => (
              <Pressable key={j} style={styles.hit} onPress={() => router.push({ pathname: '/scholar/paper/[id]', params: { id: h.paper.id, projectId: project.id } } as any)}>
                <Text style={styles.hitNum}>{j + 1}</Text>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={edStyles.serifBody}>“{h.text}”</Text>
                  <Text style={styles.hitCite}>
                    {inText(h.paper)} · {h.kind === 'evidence' ? 'your evidence' : h.kind === 'note' ? 'your note' : 'abstract'}
                  </Text>
                </View>
              </Pressable>
            ))
          ) : (
            <Text style={edStyles.muted}>Nothing in your sources answers that. Try other words, or add sources that cover it.</Text>
          )}
        </View>
      ))}
      <Text style={edStyles.muted}>Answers are quotes from your sources. AI-written answers arrive when the backend is connected.</Text>
    </EdPage>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  send: { width: 44, height: 44, backgroundColor: ED.ink, alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
  starter: { fontFamily: 'SourceSerif4_400Regular', fontSize: 15, fontStyle: 'italic', color: ED.accent, paddingVertical: 6 },
  turn: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ED.rule, gap: 10 },
  q: { fontFamily: 'SourceSerif4_600SemiBold', fontSize: 19, color: ED.ink },
  hit: { flexDirection: 'row', gap: 12 },
  hitNum: { fontFamily: 'SourceSerif4_600SemiBold', fontSize: 16, color: ED.accent, width: 14 },
  hitCite: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, color: ED.muted },
});

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet, StatusBar, Platform, ActivityIndicator, type ScrollViewInstance } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useAcademic } from '@/context/academic-context';
import { useLectures } from '@/context/lectures-context';
import { useMaterials } from '@/context/materials-context';
import { Chip } from '@/components/ui/chip';
import { SourceCard } from '@/components/source-card';
import { queryTerms, searchSources, type SourceHit } from '@/utils/source-search';
import { askZuriStream, searchMaterial } from '@/services/ai-api';
import { chatWithCoursePartner } from '@/services/academic-api';
import { PartnerWidget } from '@/components/partner-widget';
import { MarkdownText } from '@/components/markdown-text';
import { AIQuotaNote } from '@/components/ai-quota-note';
import { lightColors, radius, space } from '@/theme';
import { useConversations } from '@/context/conversations-context';

type Msg = import('@/context/conversations-context').ChatMessage;

/**
 * Ask Zuri (chat.generate). Each question is answered by Zuri's AI using the
 * best-matching passages from the student's own lectures and materials, shown
 * under the answer. If the AI is unavailable, the passages alone are shown.
 * Scope: everything, one course (?courseId), or one document (?materialId).
 */
export default function AskScreen() {
  const params = useLocalSearchParams<{ courseId?: string; materialId?: string; q?: string; conversationId?: string }>();
  const convs = useConversations();
  const existing = params.conversationId ? convs.get(params.conversationId) : undefined;
  const { state } = useAcademic();
  const { lectures } = useLectures();
  const { materials, getMaterial } = useMaterials();
  const scrollRef = useRef<ScrollViewInstance>(null);

  const materialId = existing?.scope.materialId ?? params.materialId;
  const material = materialId ? getMaterial(materialId) : undefined;
  const [courseId, setCourseId] = useState<string | null>(existing?.scope.courseId ?? (params.courseId || null));
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>(existing?.messages ?? []);
  const [convId, setConvId] = useState<string | undefined>(existing?.id);
  const saved = convId ? convs.get(convId)?.saved : false;

  const scopeLabel = material
    ? `“${material.analysis?.title ?? material.name}”`
    : courseId
      ? state.courses.find((c) => c.id === courseId)?.code ?? 'this course'
      : 'all your lectures and materials';

  const sourceCount = useMemo(() => {
    if (material) return 1;
    const l = lectures.filter((x) => x.analysis && (!courseId || x.courseId === courseId)).length;
    const m = materials.filter((x) => x.analysis && (!courseId || x.courseId === courseId)).length;
    return l + m;
  }, [lectures, materials, courseId, material]);

  const suggestions = useMemo(() => {
    const pool = material
      ? material.analysis?.concepts ?? []
      : [
          ...lectures.filter((l) => !courseId || l.courseId === courseId).flatMap((l) => l.analysis?.concepts ?? []),
          ...materials.filter((m) => !courseId || m.courseId === courseId).flatMap((m) => m.analysis?.concepts ?? []),
        ];
    return Array.from(new Set(pool.map((c) => c.title))).slice(0, 4).map((t) => `What is ${t.toLowerCase()}?`);
  }, [lectures, materials, courseId, material]);

  const [thinking, setThinking] = useState(false);
  /** The course study partner's session, so it remembers this conversation. */
  const partnerSession = useRef<string | undefined>(undefined);
  /** The answer so far while it streams in. */
  const [liveText, setLiveText] = useState('');

  /** Context for the AI: the best local passages, plus the user's own processed server materials. */
  const gatherSources = async (q: string): Promise<{ hits: SourceHit[]; chunks: string[] }> => {
    const style = state.preferences.aiAnswerStyle === 'concise' ? 2 : 4;
    const hits = searchSources(q, { lectures, materials }, { courseId: courseId ?? undefined, materialId: material?.id }, style);

    // One document: ask the server for its best-matching passages.
    if (material?.serverId && material.analysis?.source === 'server') {
      try {
        const found = await searchMaterial(material.serverId, q, 4);
        found.forEach((c, i) =>
          hits.push({
            kind: 'material',
            id: material.id,
            title: material.analysis?.title ?? material.name,
            courseCode: material.courseCode,
            location: c.heading || (typeof c.chunk_index === 'number' ? `Part ${c.chunk_index + 1}` : `Passage ${i + 1}`),
            text: c.text.length > 600 ? `${c.text.slice(0, 600).trim()}…` : c.text,
            score: 10 - i,
          })
        );
      } catch {
        // Fall back to the summary below.
      }
      if (!hits.length && material.analysis?.summary) {
        hits.push({ kind: 'material', id: material.id, title: material.analysis.title, courseCode: material.courseCode, location: 'Summary', text: material.analysis.summary, score: 1 });
      }
    } else if (!material) {
      // Everything / one course: add the summaries of the user's processed documents that match the question.
      const terms = queryTerms(q);
      materials
        .filter((m) => m.analysis?.source === 'server' && m.analysis.summary && (!courseId || m.courseId === courseId))
        .map((m) => {
          const hay = `${m.analysis!.title} ${m.analysis!.summary} ${m.analysis!.concepts.map((c) => `${c.title} ${c.summary}`).join(' ')}`.toLowerCase();
          return { m, score: terms.filter((t) => hay.includes(t)).length };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .forEach(({ m, score }) =>
          hits.push({ kind: 'material', id: m.id, title: m.analysis!.title, courseCode: m.courseCode, location: 'Summary', text: m.analysis!.summary, score })
        );
    }

    const top = hits.slice(0, 5);
    const chunks = top.map((h) => `${h.title}${h.courseCode ? ` (${h.courseCode})` : ''}, ${h.location}:\n${h.text}`);
    return { hits: top, chunks };
  };

  const ask = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || thinking) return;
    const userMsg: Msg = { role: 'user', text: q };
    const history = msgs.map((m) => ({ role: m.role, content: m.text }));
    setMsgs((m) => [...m, userMsg]);
    setInput('');
    setThinking(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    const { hits, chunks } = await gatherSources(q);
    let reply: Msg | null = null;

    // A catalogue course has a study partner on the server that knows its syllabus,
    // your weak topics and past chats, and can reply with flashcards, a quiz or a concept card.
    const partnerCourse = !material && courseId ? state.courses.find((c) => c.id === courseId && c.catalogue && c.serverId) : undefined;
    if (partnerCourse) {
      try {
        const res = await chatWithCoursePartner(partnerCourse.serverId!, {
          message: q,
          session_id: partnerSession.current,
          history: history.slice(-6).map((h) => ({ role: h.role === 'zuri' ? 'assistant' : 'user', content: h.content })),
        });
        partnerSession.current = res.session_id;
        reply = {
          role: 'zuri',
          text: res.message,
          sources: hits.length ? hits : undefined,
          widget: res.widget_type && res.widget_data ? { type: res.widget_type, data: res.widget_data } : undefined,
          citations: res.provenance_citations?.length ? res.provenance_citations : undefined,
        };
      } catch {
        // Fall back to the general assistant below.
      }
    }

    if (!reply) try {
      const answer = await askZuriStream(
        q,
        chunks,
        history,
        (soFar) => {
          setLiveText(soFar);
          scrollRef.current?.scrollToEnd({ animated: false });
        },
        convId
      );
      reply = { role: 'zuri', text: answer, sources: hits.length ? hits : undefined };
    } catch (e) {
      const why = e instanceof Error ? e.message : 'Zuri’s AI isn’t available right now.';
      reply = hits.length
        ? { role: 'zuri', text: `${why}\n\nHere’s what your ${hits.length === 1 ? 'source says' : 'sources say'} meanwhile:`, sources: hits }
        : { role: 'zuri', text: why };
    }

    const final: Msg = reply ?? { role: 'zuri', text: 'Zuri’s AI isn’t available right now. Please try again.' };
    const turn: Msg[] = [userMsg, final];
    setMsgs((m) => [...m, final]);
    setThinking(false);
    setLiveText('');
    // Every chat is kept in history; star it to save it.
    if (convId) convs.append(convId, turn);
    else setConvId(convs.start({ courseId: courseId ?? undefined, materialId: material?.id }, turn));
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  // A question passed in (e.g. from an assignment) is asked straight away.
  useEffect(() => {
    if (params.q && !existing) ask(params.q);
  }, []);

  const newChat = () => {
    setMsgs([]);
    setConvId(undefined);
    partnerSession.current = undefined;
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as Href))}
          hitSlop={10}
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color={UI.ink} />
        </Pressable>
        <Text style={styles.topTitle}>Ask Zuri</Text>
        <View style={{ flexDirection: 'row', gap: 18 }}>
          {convId && (
            <Pressable onPress={() => convs.toggleSaved(convId)} hitSlop={10} accessibilityLabel={saved ? 'Unsave conversation' : 'Save conversation'}>
              <Ionicons name={saved ? 'star' : 'star-outline'} size={21} color={saved ? UI.amber : UI.ink} />
            </Pressable>
          )}
          {msgs.length > 0 && (
            <Pressable onPress={newChat} hitSlop={10} accessibilityLabel="New conversation">
              <Ionicons name="create-outline" size={21} color={UI.ink} />
            </Pressable>
          )}
          <Pressable onPress={() => router.push('/ask-history' as Href)} hitSlop={10} accessibilityLabel="Conversation history">
            <Ionicons name="time-outline" size={22} color={UI.ink} />
          </Pressable>
        </View>
      </View>

      {!material && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scope} style={{ flexGrow: 0 }}>
          <Chip label="Everything" on={!courseId} onPress={() => setCourseId(null)} />
          {state.courses.map((c) => (
            <Chip key={c.id} label={c.code} on={courseId === c.id} onPress={() => setCourseId(c.id)} />
          ))}
        </ScrollView>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView ref={scrollRef} contentContainerStyle={styles.thread} keyboardShouldPersistTaps="handled">
          {msgs.length === 0 && (
            <View style={styles.intro}>
              <View style={styles.introIcon}>
                <Ionicons name="chatbubble-ellipses-outline" size={26} color={UI.amber} />
              </View>
              <Text style={styles.introTitle}>Ask about {scopeLabel}</Text>
              <Text style={styles.introText}>
                Zuri answers using your own {material ? 'document' : 'lectures and notes'}, and shows the passages it used.{' '}
                {!material && `${sourceCount} ${sourceCount === 1 ? 'source' : 'sources'} available.`}
              </Text>
            </View>
          )}

          {msgs.map((m, i) => (
            <View key={i} style={[styles.bubble, m.role === 'user' ? styles.user : styles.zuri]}>
              {m.role === 'zuri' ? (
                <MarkdownText text={m.text} style={styles.bubbleText} />
              ) : (
                <Text style={[styles.bubbleText, { color: lightColors['on-primary'] }]}>{m.text}</Text>
              )}
              {m.widget && <PartnerWidget widget={m.widget} />}
              {m.citations && (
                <Text style={[styles.footnote, { textAlign: 'left', paddingVertical: 4 }]}>From your course: {m.citations.slice(0, 3).join(' · ')}</Text>
              )}
              {m.sources && (
                <View style={{ gap: 8, marginTop: 10 }}>
                  {m.sources.map((s, idx) => (
                    <SourceCard key={`${s.id}-${s.location}`} hit={s} index={idx} />
                  ))}
                </View>
              )}
            </View>
          ))}
          {thinking &&
            (liveText ? (
              <View style={[styles.bubble, styles.zuri]} accessibilityLiveRegion="polite">
                <MarkdownText text={liveText} style={styles.bubbleText} />
              </View>
            ) : (
              <View style={[styles.bubble, styles.zuri, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                <ActivityIndicator size="small" color={UI.ink} />
                <Text style={styles.bubbleText}>Zuri is thinking…</Text>
              </View>
            ))}
        </ScrollView>

        {suggestions.length > 0 && msgs.length === 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggest} style={{ flexGrow: 0 }}>
            {suggestions.map((s) => (
              <Pressable key={s} style={styles.suggestChip} onPress={() => ask(s)}>
                <Text style={styles.suggestText}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask a question…"
            placeholderTextColor={UI.muted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => ask()}
            returnKeyType="send"
          />
          <Pressable style={styles.send} onPress={() => ask()} accessibilityLabel="Send">
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </Pressable>
        </View>
        <Text style={styles.footnote}>Zuri answers from your lectures and notes, and uses general knowledge when they don’t cover it. Check important facts.</Text>
        <AIQuotaNote />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: UI.borderSoft,
  },
  topTitle: { fontFamily: ZuriFonts.labelSmBold, fontSize: 15, color: UI.ink },
  scope: { gap: 8, paddingHorizontal: 20, paddingVertical: 10 },
  thread: { padding: 20, gap: 12, maxWidth: 680, width: '100%', alignSelf: 'center', flexGrow: 1 },
  intro: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 12 },
  introIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: UI.amberSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  introTitle: { fontFamily: ZuriFonts.headlineMd, fontSize: 21, color: UI.ink, textAlign: 'center', marginBottom: 6 },
  introText: { fontFamily: ZuriFonts.bodyRegular, fontSize: 14, lineHeight: 21, color: UI.inkSoft, textAlign: 'center' },
  bubble: { maxWidth: '92%', borderRadius: 16, padding: 12 },
  user: { alignSelf: 'flex-end', backgroundColor: UI.ink },
  zuri: { alignSelf: 'flex-start', backgroundColor: UI.cardMuted },
  bubbleText: { fontFamily: ZuriFonts.bodyRegular, fontSize: 14, lineHeight: 20, color: UI.ink },
  suggest: { gap: 8, paddingHorizontal: 20, paddingVertical: 8 },
  suggestChip: {
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: UI.card,
  },
  suggestText: { fontFamily: ZuriFonts.bodyMedium, fontSize: 13, color: UI.ink },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 20, paddingTop: 4 },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.card,
    paddingHorizontal: 16,
    fontFamily: ZuriFonts.bodyRegular,
    fontSize: 15,
    color: UI.ink,
  },
  send: { width: 48, height: 48, borderRadius: 24, backgroundColor: UI.ink, alignItems: 'center', justifyContent: 'center' },
  footnote: { fontFamily: ZuriFonts.bodyRegular, fontSize: 11, color: UI.muted, textAlign: 'center', paddingVertical: 8 },
});

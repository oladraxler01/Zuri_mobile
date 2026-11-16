import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  type ScrollViewInstance,
} from 'react-native';
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
import { searchSources, type SourceHit } from '@/utils/source-search';
import { useConversations } from '@/context/conversations-context';

type Msg = import('@/context/conversations-context').ChatMessage;

/**
 * Ask questions across your lectures and materials. Every answer is made of
 * quotes from your own sources, each linking to the exact moment or passage.
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

  const ask = (text?: string) => {
    const q = (text ?? input).trim();
    if (!q) return;
    const hits = searchSources(q, { lectures, materials }, { courseId: courseId ?? undefined, materialId: material?.id }, state.preferences.aiAnswerStyle === 'concise' ? 2 : 4);
    const reply: Msg = hits.length
      ? { role: 'zuri', text: `Here’s what your ${hits.length === 1 ? 'source says' : 'sources say'} about that:`, sources: hits }
      : {
          role: 'zuri',
          text:
            sourceCount === 0
              ? 'There’s nothing to search yet. Record a lecture or upload notes, and I’ll answer from them.'
              : `I couldn’t find that in ${scopeLabel}. Try other words${courseId || material ? ', or widen the search to everything' : ''}.`,
        };
    const turn: Msg[] = [{ role: 'user', text: q }, reply];
    setMsgs((m) => [...m, ...turn]);
    // Every chat is kept in history; star it to save it.
    if (convId) convs.append(convId, turn);
    else setConvId(convs.start({ courseId: courseId ?? undefined, materialId: material?.id }, turn));
    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  // A question passed in (e.g. from an assignment) is asked straight away.
  useEffect(() => {
    if (params.q && !existing) ask(params.q);
  }, []);

  const newChat = () => {
    setMsgs([]);
    setConvId(undefined);
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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.thread} keyboardShouldPersistTaps="handled">
          {msgs.length === 0 && (
            <View style={styles.intro}>
              <View style={styles.introIcon}>
                <Ionicons name="chatbubble-ellipses-outline" size={26} color={UI.amber} />
              </View>
              <Text style={styles.introTitle}>Ask about {scopeLabel}</Text>
              <Text style={styles.introText}>
                Answers are quotes from your own {material ? 'document' : 'lectures and notes'}, each linked to the exact moment
                or page.{' '}
                {!material && `${sourceCount} ${sourceCount === 1 ? 'source' : 'sources'} available.`}
              </Text>
            </View>
          )}

          {msgs.map((m, i) => (
            <View key={i} style={[styles.bubble, m.role === 'user' ? styles.user : styles.zuri]}>
              <Text style={[styles.bubbleText, m.role === 'user' && { color: '#fff' }]}>{m.text}</Text>
              {m.sources && (
                <View style={{ gap: 8, marginTop: 10 }}>
                  {m.sources.map((s, idx) => (
                    <SourceCard key={`${s.id}-${s.location}`} hit={s} index={idx} />
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {suggestions.length > 0 && (
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
        <Text style={styles.footnote}>Searches your sources directly. AI-written answers arrive when the backend is connected.</Text>
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

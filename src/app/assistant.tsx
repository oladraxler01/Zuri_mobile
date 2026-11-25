import React, { useMemo, useRef, useState } from 'react';
import { View, Pressable, ScrollView, TextInput, ActivityIndicator, type ScrollViewInstance } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAcademic } from '@/context/academic-context';
import { usePlanner } from '@/context/planner-context';
import { useLectures } from '@/context/lectures-context';
import { askZuriStream, type ChatTurn } from '@/services/ai-api';
import { MarkdownText } from '@/components/markdown-text';
import { answerLocally, buildAssistantContext, summaryAnswer, type AssistantData } from '@/utils/assistant';
import { makeStyles, useTheme, Text } from '@/theme';

interface Msg {
  role: 'user' | 'zuri';
  text: string;
}

const SUGGESTIONS = [
  'What classes do I have today?',
  'Do I have a test today?',
  'What’s due this week?',
  'Classes tomorrow',
  'Lectures I recorded this week',
];

/**
 * Zuri, the personal assistant behind the round button. Answers questions
 * about the student's day from the phone (classes, tests, deadlines,
 * recordings); anything else goes to Zuri's AI with that schedule as context.
 */
export default function AssistantScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { state } = useAcademic();
  const { assessments } = usePlanner();
  const { lectures } = useLectures();
  const data: AssistantData = useMemo(
    () => ({ courses: state.courses, timetable: state.timetable, assessments, lectures }),
    [state.courses, state.timetable, assessments, lectures]
  );

  const firstName = state.studentName.trim().split(/\s+/)[0];
  const [msgs, setMsgs] = useState<Msg[]>(() => [
    { role: 'zuri', text: `Hi${firstName ? ` ${firstName}` : ''}! Here’s your day:\n\n${summaryAnswer(data)}` },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [liveText, setLiveText] = useState('');
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollDown = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

  const ask = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || thinking) return;
    setInput('');
    const next: Msg[] = [...msgs, { role: 'user', text: q }];
    setMsgs(next);
    scrollDown();

    const local = answerLocally(q, data);
    if (local) {
      setMsgs([...next, { role: 'zuri', text: local }]);
      scrollDown();
      return;
    }

    setThinking(true);
    setLiveText('');
    try {
      const history: ChatTurn[] = next.slice(-5, -1).map((m) => ({ role: m.role, content: m.text }));
      const answer = await askZuriStream(q, [buildAssistantContext(data)], history, (t) => {
        setLiveText(t);
        scrollDown();
      });
      setMsgs([...next, { role: 'zuri', text: answer }]);
    } catch (e) {
      const why = e instanceof Error ? e.message : '';
      setMsgs([
        ...next,
        {
          role: 'zuri',
          text:
            `I couldn’t reach Zuri’s AI just now${why ? ` (${why})` : ''}.\n\n` +
            'I can still answer things like “What classes do I have today?”, “Do I have a test this week?” or “Summarise my day”.',
        },
      ]);
    } finally {
      setThinking(false);
      setLiveText('');
      scrollDown();
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as Href))}
          hitSlop={10}
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.titleRow}>
          <View style={styles.avatar}>
            <Ionicons name="sparkles" size={14} color={colors['on-accent']} />
          </View>
          <Text style={styles.title}>Zuri Assistant</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Ask Zuri about a course, kept up top so it's easy to find */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.courseRow}>
        <Pressable style={styles.courseChip} onPress={() => router.push('/ask' as Href)} accessibilityRole="button">
          <Ionicons name="chatbubbles-outline" size={14} color={colors['on-primary']} />
          <Text style={styles.courseChipText}>Ask Zuri about your notes</Text>
        </Pressable>
        {state.courses.map((c) => (
          <Pressable
            key={c.id}
            style={styles.courseChipLight}
            onPress={() => router.push({ pathname: '/ask', params: { courseId: c.id } } as Href)}
            accessibilityRole="button"
            accessibilityLabel={`Ask Zuri about ${c.code}`}
          >
            <Text style={styles.courseChipLightText}>Ask about {c.code}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView ref={scrollRef} contentContainerStyle={styles.thread} keyboardShouldPersistTaps="handled">
          {msgs.map((m, i) => (
            <View key={i} style={[styles.bubble, m.role === 'user' ? styles.user : styles.zuri]}>
              {m.role === 'zuri' ? (
                <MarkdownText text={m.text} style={styles.bubbleText} />
              ) : (
                <Text style={[styles.bubbleText, styles.userText]}>{m.text}</Text>
              )}
            </View>
          ))}
          {thinking &&
            (liveText ? (
              <View style={[styles.bubble, styles.zuri]} accessibilityLiveRegion="polite">
                <MarkdownText text={liveText} style={styles.bubbleText} />
              </View>
            ) : (
              <View style={[styles.bubble, styles.zuri, styles.thinking]}>
                <ActivityIndicator size="small" color={colors.text} />
                <Text style={styles.bubbleText}>Thinking…</Text>
              </View>
            ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.suggest} keyboardShouldPersistTaps="handled">
          {SUGGESTIONS.map((s) => (
            <Pressable key={s} style={styles.suggestChip} onPress={() => ask(s)} accessibilityRole="button">
              <Text style={styles.suggestText}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask about your day…"
            placeholderTextColor={colors['text-subtle']}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => ask()}
            returnKeyType="send"
          />
          <Pressable style={styles.send} onPress={() => ask()} accessibilityLabel="Send">
            <Ionicons name="arrow-up" size={20} color={colors['on-primary']} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.surface },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: t.space[5],
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...t.type.headline, color: t.colors.text },
  courseRow: { gap: t.space[2], paddingHorizontal: t.space[4], paddingVertical: t.space[3] },
  courseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: t.colors.primary,
    paddingHorizontal: t.space[3],
    paddingVertical: t.space[2],
    borderRadius: t.radius.md,
  },
  courseChipText: { ...t.type.footnote, color: t.colors['on-primary'], fontWeight: '600' },
  courseChipLight: {
    backgroundColor: t.colors.tint,
    paddingHorizontal: t.space[3],
    paddingVertical: t.space[2],
    borderRadius: t.radius.md,
  },
  courseChipLightText: { ...t.type.footnote, color: t.colors['on-tint'], fontWeight: '600' },
  thread: { padding: t.space[4], gap: t.space[3] },
  bubble: { maxWidth: '88%', borderRadius: t.radius.lg, paddingHorizontal: t.space[4], paddingVertical: t.space[3] },
  user: { alignSelf: 'flex-end', backgroundColor: t.colors.primary },
  zuri: { alignSelf: 'flex-start', backgroundColor: t.colors['surface-raised'], borderWidth: 1, borderColor: t.colors.border },
  bubbleText: { ...t.type.body, color: t.colors.text },
  userText: { color: t.colors['on-primary'] },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
  suggest: { gap: t.space[2], paddingHorizontal: t.space[4], paddingBottom: t.space[2] },
  suggestChip: {
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors['surface-raised'],
    paddingHorizontal: t.space[3],
    paddingVertical: t.space[2],
    borderRadius: t.radius.md,
  },
  suggestText: { ...t.type.footnote, color: t.colors.text },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[2],
    paddingHorizontal: t.space[4],
    paddingTop: t.space[2],
    paddingBottom: t.space[3],
  },
  input: {
    flex: 1,
    ...t.type.body,
    color: t.colors.text,
    backgroundColor: t.colors['surface-raised'],
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.lg,
    paddingHorizontal: t.space[4],
    paddingVertical: t.space[3],
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

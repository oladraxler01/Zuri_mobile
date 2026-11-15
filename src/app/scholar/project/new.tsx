import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { LexiFonts } from '@/constants/lexi-theme';
import { useResearch } from '@/context/research-context';
import { useAcademic } from '@/context/academic-context';
import { ED, EdPage, Masthead, Rule, edStyles } from '@/components/research/editorial';

/** Start a research project: title, question, course, keywords. */
export default function NewProjectScreen() {
  const { createProject } = useResearch();
  const { state } = useAcademic();
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [courseId, setCourseId] = useState<string | undefined>();
  const [keywords, setKeywords] = useState('');

  const create = () => {
    if (!title.trim()) return;
    const kw = keywords.split(',').map((k) => k.trim()).filter(Boolean);
    const id = createProject({ title: title.trim(), question: question.trim(), courseId, keywords: kw });
    // Go straight to finding sources, using the keywords or the title.
    router.replace(`/scholar/project/${id}` as Href);
    router.push({ pathname: '/scholar/search', params: { q: kw.join(' ') || title.trim(), projectId: id } } as any);
  };

  return (
    <EdPage edges={['top', 'bottom']}>
      <Masthead kicker="NEW RESEARCH PROJECT" title="What are you investigating?" />
      <Rule heavy />
      <Text style={styles.label}>TITLE</Text>
      <TextInput style={edStyles.input} value={title} onChangeText={setTitle} placeholder="e.g. Dynamic programming in route planning" placeholderTextColor={ED.muted} />
      <Text style={styles.label}>RESEARCH QUESTION</Text>
      <TextInput
        style={[edStyles.input, { height: 90, textAlignVertical: 'top', paddingTop: 10 }]}
        value={question}
        onChangeText={setQuestion}
        multiline
        placeholder="e.g. How does memoization affect the performance of shortest-path algorithms?"
        placeholderTextColor={ED.muted}
      />
      <Text style={styles.label}>KEYWORDS (COMMA-SEPARATED)</Text>
      <TextInput style={edStyles.input} value={keywords} onChangeText={setKeywords} placeholder="memoization, shortest path, graph algorithms" placeholderTextColor={ED.muted} />
      <Text style={styles.label}>FOR A COURSE (OPTIONAL)</Text>
      <View style={styles.tags}>
        <Pressable style={[edStyles.tag, !courseId && edStyles.tagOn]} onPress={() => setCourseId(undefined)}>
          <Text style={[edStyles.tagText, !courseId && { color: ED.paper }]}>None</Text>
        </Pressable>
        {state.courses.map((c) => (
          <Pressable key={c.id} style={[edStyles.tag, courseId === c.id && edStyles.tagOn]} onPress={() => setCourseId(c.id)}>
            <Text style={[edStyles.tagText, courseId === c.id && { color: ED.paper }]}>{c.code}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={[edStyles.btn, { marginTop: 18 }, !title.trim() && { opacity: 0.4 }]} disabled={!title.trim()} onPress={create}>
        <Text style={edStyles.btnText}>Create and find sources</Text>
      </Pressable>
    </EdPage>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: LexiFonts.labelSmBold, fontSize: 11, letterSpacing: 1.6, color: ED.muted, marginTop: 14 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

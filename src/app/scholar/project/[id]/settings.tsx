import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import type { Href } from 'expo-router';
import { ZuriFonts } from '@/constants/zuri-theme';
import { useResearch } from '@/context/research-context';
import { useAcademic } from '@/context/academic-context';
import { ED, EdPage, Masthead, Rule, edStyles } from '@/components/research/editorial';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { EmptyState } from '@/components/states/state-view';
import { STYLE_LABEL } from '@/utils/research';
import type { CitationStyle } from '@/types/research';

/** Project settings: rename, question, keywords, course, citation style, archive, delete. */
export default function ProjectSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const research = useResearch();
  const { state } = useAcademic();
  const project = research.projects.find((p) => p.id === id);
  const [title, setTitle] = useState(project?.title ?? '');
  const [question, setQuestion] = useState(project?.question ?? '');
  const [keywords, setKeywords] = useState(project?.keywords.join(', ') ?? '');
  const [confirm, setConfirm] = useState(false);
  if (!project) return <EdPage><EmptyState icon="settings-outline" title="Project not found" /></EdPage>;

  const save = () => {
    research.updateProject(project.id, {
      title: title.trim() || project.title,
      question: question.trim(),
      keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
    });
    router.back();
  };

  return (
    <EdPage edges={['top', 'bottom']}>
      <Masthead kicker="PROJECT SETTINGS" title={project.title} />
      <Rule heavy />
      <Text style={styles.label}>TITLE</Text>
      <TextInput style={edStyles.input} value={title} onChangeText={setTitle} />
      <Text style={styles.label}>RESEARCH QUESTION</Text>
      <TextInput style={[edStyles.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]} value={question} onChangeText={setQuestion} multiline />
      <Text style={styles.label}>KEYWORDS</Text>
      <TextInput style={edStyles.input} value={keywords} onChangeText={setKeywords} />
      <Text style={styles.label}>COURSE</Text>
      <View style={styles.tags}>
        <Pressable style={[edStyles.tag, !project.courseId && edStyles.tagOn]} onPress={() => research.updateProject(project.id, { courseId: undefined })}>
          <Text style={[edStyles.tagText, !project.courseId && { color: ED.paper }]}>None</Text>
        </Pressable>
        {state.courses.map((c) => (
          <Pressable key={c.id} style={[edStyles.tag, project.courseId === c.id && edStyles.tagOn]} onPress={() => research.updateProject(project.id, { courseId: c.id })}>
            <Text style={[edStyles.tagText, project.courseId === c.id && { color: ED.paper }]}>{c.code}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>CITATION STYLE</Text>
      <View style={styles.tags}>
        {(Object.keys(STYLE_LABEL) as CitationStyle[]).map((s) => (
          <Pressable key={s} style={[edStyles.tag, project.citationStyle === s && edStyles.tagOn]} onPress={() => research.updateProject(project.id, { citationStyle: s })}>
            <Text style={[edStyles.tagText, project.citationStyle === s && { color: ED.paper }]}>{STYLE_LABEL[s]}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={[edStyles.btn, { marginTop: 18 }]} onPress={save}>
        <Text style={edStyles.btnText}>Save changes</Text>
      </Pressable>
      <Pressable
        style={edStyles.btnGhost}
        onPress={() => {
          research.updateProject(project.id, { archived: !project.archived });
          router.replace('/(tabs)/research' as Href);
        }}
      >
        <Text style={edStyles.btnGhostText}>{project.archived ? 'Restore project' : 'Archive project'}</Text>
      </Pressable>
      <Pressable onPress={() => setConfirm(true)} style={{ alignSelf: 'center', padding: 10 }}>
        <Text style={styles.delete}>Delete project</Text>
      </Pressable>
      <ConfirmSheet
        visible={confirm}
        title="Delete this project?"
        message="Its evidence and notes will be removed. Saved papers stay in your library."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          research.deleteProject(project.id);
          router.replace('/(tabs)/research' as Href);
        }}
      />
    </EdPage>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, letterSpacing: 1.6, color: ED.muted, marginTop: 14 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  delete: { fontFamily: ZuriFonts.labelSmBold, fontSize: 14, color: '#ba1a1a' },
});

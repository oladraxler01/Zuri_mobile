import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useLectures } from '@/context/lectures-context';
import { useMaterials } from '@/context/materials-context';
import { useProgress } from '@/context/progress-context';
import { useConversations } from '@/context/conversations-context';
import { useResearch } from '@/context/research-context';
import { useAcademic } from '@/context/academic-context';
import { ScreenShell, Panel, ListRow, Divider } from '@/components/dashboard';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { courseMastery } from '@/utils/mastery';
import { removeKey } from '@/utils/storage';
import { formatDuration } from '@/utils/time';

/** Knowledge & memory: everything Zuri keeps about your learning, with per-type clearing. */
export default function KnowledgeScreen() {
  const { state } = useAcademic();
  const { lectures } = useLectures();
  const { materials } = useMaterials();
  const progress = useProgress();
  const convs = useConversations();
  const research = useResearch();
  const [confirm, setConfirm] = useState<null | 'progress' | 'conversations' | 'searches'>(null);

  const transcribed = lectures.reduce((n, l) => n + (l.analysis ? l.durationSeconds : 0), 0);
  const concepts = state.courses.reduce((n, c) => n + courseMastery(c.id, lectures, materials, progress.events).length, 0);
  const answers = progress.events.filter((e) => e.type === 'quiz-answer' || e.type === 'flashcard').length;

  const clear = () => {
    if (confirm === 'progress') progress.clear();
    if (confirm === 'conversations') convs.conversations.forEach((c) => convs.remove(c.id));
    if (confirm === 'searches') removeKey('lexi.recent-searches.v1');
    setConfirm(null);
  };

  return (
    <ScreenShell back eyebrow="PROFILE" title="Knowledge & memory" edges={['top', 'bottom']}>
      <Text style={styles.lead}>
        Everything below is stored on this phone and used only to personalise your study. Nothing is shared until your account is connected
        to your university.
      </Text>

      <Panel title="What Zuri knows from your courses">
        <ListRow icon="mic-outline" title={`${lectures.length} lectures`} subtitle={`${formatDuration(transcribed)} transcribed`} onPress={() => router.push('/lectures' as Href)} />
        <Divider />
        <ListRow icon="document-text-outline" title={`${materials.length} materials`} subtitle="Summaries, concepts and passages" onPress={() => router.push('/materials' as Href)} />
        <Divider />
        <ListRow icon="git-network-outline" title={`${concepts} concepts tracked`} subtitle="Across all your courses" onPress={() => router.push('/study/mastery' as Href)} />
        <Divider />
        <ListRow icon="library-outline" title={`${research.projects.length} research projects`} subtitle={`${Object.keys(research.papers).length} papers saved or used`} onPress={() => router.push('/scholar/library' as Href)} />
      </Panel>

      <Panel title="What Zuri remembers about you">
        <MemoryRow title="Learning history" detail={`${answers} answers, ${progress.events.filter((e) => e.type === 'study-session').length} study sessions`} onClear={() => setConfirm('progress')} />
        <Divider />
        <MemoryRow title="Conversations" detail={`${convs.conversations.length} chats with Ask Zuri`} onClear={() => setConfirm('conversations')} />
        <Divider />
        <MemoryRow title="Recent searches" detail="Shown when you open search" onClear={() => setConfirm('searches')} />
      </Panel>

      <Pressable onPress={() => router.push('/settings/privacy' as Href)}>
        <Text style={styles.link}>Export or delete all your data →</Text>
      </Pressable>

      <ConfirmSheet
        visible={!!confirm}
        title={confirm === 'progress' ? 'Clear learning history?' : confirm === 'conversations' ? 'Delete all conversations?' : 'Clear recent searches?'}
        message={
          confirm === 'progress'
            ? 'Mastery levels, study history and streaks reset. Lectures and materials are kept.'
            : confirm === 'conversations'
              ? 'Saved and unsaved chats are removed. Your sources are kept.'
              : 'Your search suggestions are removed.'
        }
        confirmLabel="Clear"
        destructive
        onCancel={() => setConfirm(null)}
        onConfirm={clear}
      />
    </ScreenShell>
  );
}

function MemoryRow({ title, detail, onClear }: { title: string; detail: string; onClear: () => void }) {
  return (
    <View style={styles.memRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.memTitle}>{title}</Text>
        <Text style={styles.memDetail}>{detail}</Text>
      </View>
      <Pressable onPress={onClear} style={styles.clearBtn}>
        <Text style={styles.clearText}>Clear</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily: ZuriFonts.bodyRegular, fontSize: 14, lineHeight: 21, color: UI.inkSoft },
  memRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  memTitle: { fontFamily: ZuriFonts.bodyMedium, fontSize: 15, color: UI.ink },
  memDetail: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 2 },
  clearBtn: { borderWidth: 1, borderColor: UI.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  clearText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 12, color: UI.error },
  link: { fontFamily: ZuriFonts.labelSmBold, fontSize: 14, color: UI.amber, textAlign: 'center' },
});

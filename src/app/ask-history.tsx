import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useConversations } from '@/context/conversations-context';
import { useAcademic } from '@/context/academic-context';
import { Segmented } from '@/components/ui/chip';
import { EmptyState } from '@/components/states/state-view';
import { formatLectureDate } from '@/utils/time';

/** Conversation history (all chats) and saved conversations (starred). */
export default function AskHistoryScreen() {
  const { conversations, toggleSaved, remove } = useConversations();
  const { state } = useAcademic();
  const [view, setView] = useState<'all' | 'saved'>('all');
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const list = conversations
    .filter((c) => view === 'all' || c.saved)
    .filter((c) => !q || c.title.toLowerCase().includes(q) || c.messages.some((m) => m.text.toLowerCase().includes(q)));
  const scopeLabel = (c: (typeof conversations)[number]) =>
    c.scope.materialId
      ? 'One document'
      : c.scope.projectId
        ? 'Research project'
        : `${c.scope.courseId ? state.courses.find((x) => x.id === c.scope.courseId)?.code ?? 'Course' : 'All courses'} · ${c.scope.mode === 'notes' ? 'My notes' : 'Everything'}`;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={UI.ink} />
        </Pressable>
        <Text style={styles.topTitle}>Conversations</Text>
        <Pressable onPress={() => router.replace('/ask' as Href)} hitSlop={10} accessibilityLabel="New conversation">
          <Ionicons name="create-outline" size={22} color={UI.ink} />
        </Pressable>
      </View>

      <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Segmented<'all' | 'saved'>
          options={[
            { key: 'all', label: `History · ${conversations.length}` },
            { key: 'saved', label: `Saved · ${conversations.filter((c) => c.saved).length}` },
          ]}
          value={view}
          onChange={setView}
        />
        {conversations.length > 0 && (
          <View style={styles.search}>
            <Ionicons name="search" size={16} color={UI.muted} />
            <TextInput style={styles.searchInput} value={query} onChangeText={setQuery} placeholder="Search conversations" placeholderTextColor={UI.muted} />
          </View>
        )}

        {list.length === 0 ? (
          <EmptyState
            compact
            icon={view === 'saved' ? 'star-outline' : 'chatbubbles-outline'}
            title={view === 'saved' ? 'No saved conversations' : q ? 'No matches' : 'No conversations yet'}
            message={view === 'saved' ? 'Tap the star in a conversation to keep it here.' : 'Questions you ask Zuri are kept here so you can come back to them.'}
            primary={!q ? { label: 'Ask a question', icon: 'chatbubble-ellipses-outline', onPress: () => router.replace('/ask' as Href) } : undefined}
          />
        ) : (
          <View style={styles.card}>
            {list.map((c, i) => (
              <Pressable
                key={c.id}
                style={({ pressed }) => [styles.row, i > 0 && styles.rowBorder, pressed && { opacity: 0.8 }]}
                onPress={() => router.push({ pathname: '/ask', params: { conversationId: c.id } } as any)}
                accessibilityRole="button"
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={2}>
                    {c.title}
                  </Text>
                  <Text style={styles.meta}>
                    {scopeLabel(c)} · {c.messages.filter((m) => m.role === 'user').length} questions · {formatLectureDate(c.updatedAt)}
                  </Text>
                </View>
                <Pressable onPress={() => toggleSaved(c.id)} hitSlop={10} accessibilityLabel={c.saved ? 'Unsave' : 'Save'}>
                  <Ionicons name={c.saved ? 'star' : 'star-outline'} size={19} color={c.saved ? UI.amber : UI.muted} />
                </Pressable>
                <Pressable onPress={() => remove(c.id)} hitSlop={10} accessibilityLabel="Delete conversation">
                  <Ionicons name="trash-outline" size={18} color={UI.muted} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },
  topBar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: UI.borderSoft },
  topTitle: { fontFamily: ZuriFonts.labelSmBold, fontSize: 15, color: UI.ink },
  scroll: { padding: 20, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center', gap: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: 22, borderWidth: 1, borderColor: UI.border, backgroundColor: UI.card, paddingHorizontal: 16 },
  searchInput: { flex: 1, fontFamily: ZuriFonts.bodyRegular, fontSize: 14, color: UI.ink },
  card: { backgroundColor: UI.card, borderRadius: 16, borderWidth: 1, borderColor: UI.border, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: UI.borderSoft },
  title: { fontFamily: ZuriFonts.bodyMedium, fontSize: 15, lineHeight: 21, color: UI.ink },
  meta: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 2 },
});

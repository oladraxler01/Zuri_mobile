import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { useFeed } from '@/context/feed-context';
import { EmptyState } from '@/components/states/state-view';
import { relativeTime, type FeedItem } from '@/utils/recommendations';

const GROUPS: { title: string; kinds: FeedItem['kind'][] }[] = [
  { title: 'NEEDS ATTENTION', kinds: ['class-soon', 'deadline', 'exam', 'lecture-waiting'] },
  { title: 'RECOMMENDED FOR YOU', kinds: ['gap', 'study-today'] },
  { title: 'UPDATES', kinds: ['lecture-ready', 'material-ready'] },
];

/** Notification centre: everything that needs you, built from your own data. */
export default function NotificationCenterScreen() {
  const { items, isRead, markRead, markAllRead, dismiss, unread } = useFeed();

  const open = (i: FeedItem) => {
    markRead(i.id);
    router.push(i.href as Href);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as Href))} hitSlop={10} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={UI.ink} />
        </Pressable>
        <Text style={styles.topTitle}>Notifications</Text>
        <Pressable onPress={markAllRead} disabled={!unread} hitSlop={10}>
          <Text style={[styles.markAll, !unread && { opacity: 0.4 }]}>Mark all read</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {items.length === 0 ? (
          <EmptyState
            icon="notifications-outline"
            title="You’re all caught up"
            message="Upcoming classes, deadlines, lecture notes and study suggestions will show up here."
          />
        ) : (
          GROUPS.map((g) => {
            const list = items.filter((i) => g.kinds.includes(i.kind));
            if (!list.length) return null;
            return (
              <View key={g.title} style={{ marginBottom: 20 }}>
                <Text style={styles.group}>{g.title}</Text>
                <View style={styles.card}>
                  {list.map((i, idx) => {
                    const read = isRead(i.id);
                    return (
                      <Pressable
                        key={i.id}
                        style={({ pressed }) => [styles.row, idx > 0 && styles.rowBorder, pressed && { opacity: 0.8 }]}
                        onPress={() => open(i)}
                        accessibilityRole="button"
                        accessibilityLabel={`${read ? '' : 'Unread. '}${i.title}. ${i.body}`}
                      >
                        <View style={[styles.icon, !read && styles.iconUnread]}>
                          <Ionicons name={i.icon} size={18} color={UI.ink} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.titleRow}>
                            <Text style={[styles.title, !read && styles.titleUnread]} numberOfLines={2}>
                              {i.title}
                            </Text>
                            {!read && <View style={styles.dot} />}
                          </View>
                          <Text style={styles.body} numberOfLines={2}>
                            {i.body}
                          </Text>
                          <Text style={styles.time}>{relativeTime(i.at)}</Text>
                        </View>
                        <Pressable onPress={() => dismiss(i.id)} hitSlop={10} accessibilityLabel="Dismiss">
                          <Ionicons name="close" size={16} color={UI.muted} />
                        </Pressable>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })
        )}
        <Pressable style={styles.settings} onPress={() => router.push('/(tabs)/you' as Href)}>
          <Ionicons name="options-outline" size={16} color={UI.inkSoft} />
          <Text style={styles.settingsText}>Notification settings</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },
  topBar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: UI.borderSoft },
  topTitle: { fontFamily: LexiFonts.labelSmBold, fontSize: 15, color: UI.ink },
  markAll: { fontFamily: LexiFonts.labelSmBold, fontSize: 13, color: UI.amber },
  scroll: { padding: 20, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  group: { fontFamily: LexiFonts.labelSmBold, fontSize: 11, letterSpacing: 1.2, color: UI.muted, marginBottom: 8 },
  card: { backgroundColor: UI.card, borderRadius: 16, borderWidth: 1, borderColor: UI.border, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: UI.borderSoft },
  icon: { width: 36, height: 36, borderRadius: 10, backgroundColor: UI.cardMuted, alignItems: 'center', justifyContent: 'center' },
  iconUnread: { backgroundColor: UI.amberSoft },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontFamily: LexiFonts.bodyMedium, fontSize: 14, color: UI.inkSoft },
  titleUnread: { fontFamily: LexiFonts.labelSmBold, color: UI.ink },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: UI.amber },
  body: { fontFamily: LexiFonts.bodyRegular, fontSize: 13, lineHeight: 18, color: UI.muted, marginTop: 2 },
  time: { fontFamily: LexiFonts.labelSmBold, fontSize: 11, color: UI.muted, marginTop: 4 },
  settings: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  settingsText: { fontFamily: LexiFonts.labelSmBold, fontSize: 13, color: UI.inkSoft },
});

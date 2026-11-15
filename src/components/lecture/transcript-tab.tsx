import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import type { TranscriptSegment } from '@/types/lecture';
import { formatClock } from '@/utils/time';
import { tabStyles as t } from './tab-styles';

interface Props {
  transcript: TranscriptSegment[];
  currentTime: number;
  playing: boolean;
  canSeek: boolean;
  onSeek: (seconds: number) => void;
}

/** Timestamped transcript that highlights and follows the audio. */
export function TranscriptTab({ transcript, currentTime, playing, canSeek, onSeek }: Props) {
  const [query, setQuery] = useState('');
  const [follow, setFollow] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const positions = useRef<Record<number, number>>({});

  const activeIdx = useMemo(
    () => transcript.findIndex((s) => currentTime >= s.start && currentTime < s.end),
    [transcript, currentTime]
  );

  const q = query.trim().toLowerCase();
  const visible = q ? transcript.filter((s) => s.text.toLowerCase().includes(q)) : transcript;

  // Keep the current line in view while audio plays.
  useEffect(() => {
    if (!follow || !playing || q || activeIdx < 0) return;
    const y = positions.current[activeIdx];
    if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - 120), animated: true });
  }, [activeIdx, follow, playing, q]);

  if (!transcript.length) {
    return (
      <View style={t.empty}>
        <Ionicons name="document-text-outline" size={28} color={UI.muted} />
        <Text style={t.emptyText}>No transcript for this lecture.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.toolbar}>
        <View style={styles.search}>
          <Ionicons name="search" size={16} color={UI.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transcript"
            placeholderTextColor={UI.muted}
            value={query}
            onChangeText={setQuery}
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={16} color={UI.muted} />
            </Pressable>
          )}
        </View>
        {canSeek && (
          <Pressable
            onPress={() => setFollow((f) => !f)}
            style={[styles.follow, follow && styles.followOn]}
            accessibilityRole="switch"
            accessibilityState={{ checked: follow }}
            accessibilityLabel="Follow audio"
          >
            <Ionicons name="locate" size={14} color={follow ? '#fff' : UI.ink} />
            <Text style={[styles.followText, follow && { color: '#fff' }]}>Follow</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={t.scroll}
        onScrollBeginDrag={() => setFollow(false)}
      >
        {q && (
          <Text style={styles.resultCount}>
            {visible.length} {visible.length === 1 ? 'match' : 'matches'}
          </Text>
        )}
        {visible.map((seg) => {
          const idx = transcript.indexOf(seg);
          const active = idx === activeIdx;
          return (
            <Pressable
              key={idx}
              disabled={!canSeek}
              onLayout={(e) => {
                positions.current[idx] = e.nativeEvent.layout.y;
              }}
              onPress={() => onSeek(seg.start)}
              style={({ pressed }) => [styles.line, active && styles.lineActive, pressed && { opacity: 0.8 }]}
              accessibilityRole={canSeek ? 'button' : 'text'}
              accessibilityLabel={`${formatClock(seg.start)}. ${seg.text}`}
            >
              <View style={t.timeChip}>
                <Text style={t.timeChipText}>{formatClock(seg.start)}</Text>
              </View>
              <Text style={[styles.lineText, active && styles.lineTextActive]}>{seg.text}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.card,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 14,
    color: UI.ink,
  },
  follow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 12,
    backgroundColor: UI.card,
  },
  followOn: {
    backgroundColor: UI.ink,
    borderColor: UI.ink,
  },
  followText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 12,
    color: UI.ink,
  },
  resultCount: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 12,
    color: UI.muted,
    marginBottom: 8,
  },
  line: {
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginHorizontal: -12,
  },
  lineActive: {
    backgroundColor: UI.amberSoft,
  },
  lineText: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 16,
    lineHeight: 25,
    color: UI.inkSoft,
  },
  lineTextActive: {
    color: UI.ink,
    fontFamily: LexiFonts.bodyMedium,
  },
});

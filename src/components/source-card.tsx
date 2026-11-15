import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import type { SourceHit } from '@/utils/source-search';

/** A cited source: quote + where it came from; tap to open it at that spot. */
export function SourceCard({ hit, index }: { hit: SourceHit; index?: number }) {
  const open = () => {
    if (hit.kind === 'lecture') {
      router.push({ pathname: '/lecture/[id]', params: { id: hit.id, tab: 'transcript', t: String(hit.seconds ?? 0) } } as any);
    } else {
      router.push({ pathname: '/material/[id]', params: { id: hit.id, tab: 'passages' } } as any);
    }
  };
  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={`Source: ${hit.title}, ${hit.location}`}
    >
      <View style={styles.head}>
        {index !== undefined && (
          <View style={styles.num}>
            <Text style={styles.numText}>{index + 1}</Text>
          </View>
        )}
        <Ionicons name={hit.kind === 'lecture' ? 'mic-outline' : 'document-text-outline'} size={14} color={UI.amber} />
        <Text style={styles.title} numberOfLines={1}>
          {hit.courseCode ? `${hit.courseCode} · ` : ''}
          {hit.title}
        </Text>
        <Text style={styles.loc}>{hit.location}</Text>
      </View>
      <Text style={styles.quote} numberOfLines={4}>
        “{hit.text}”
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.borderSoft,
    padding: 12,
    gap: 6,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  num: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: UI.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontFamily: LexiFonts.labelSmBold, fontSize: 10, color: '#fff' },
  title: { flex: 1, fontFamily: LexiFonts.labelSmBold, fontSize: 12, color: UI.ink },
  loc: { fontFamily: LexiFonts.labelSmBold, fontSize: 11, color: UI.amber, fontVariant: ['tabular-nums'] },
  quote: { fontFamily: LexiFonts.bodyRegular, fontSize: 13, lineHeight: 19, color: UI.inkSoft, fontStyle: 'italic' },
});

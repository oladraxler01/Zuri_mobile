import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, makeStyles, useTheme } from '@/theme';
import type { ClassmateShare } from '@/services/classmates-api';

/**
 * What a classmate shared: a lecture summary (summary, key points, notes,
 * flashcards) or a processed material (title + summary, with "Ask Zuri about it").
 */
export function SharedContent({ share }: { share: ClassmateShare }) {
  const styles = useStyles();
  const { colors, size } = useTheme();
  const [showCards, setShowCards] = useState(false);
  const c = share.content;

  if (share.share_type === 'material' && share.material) {
    const m = share.material;
    return (
      <View style={styles.wrap}>
        <View style={styles.row}>
          <Ionicons name="document-text-outline" size={size['icon-md']} color={colors.text} />
          <Text variant="subhead" style={{ flex: 1 }}>
            {m.title}
          </Text>
        </View>
        {!!m.summary && (
          <Text variant="footnote" color="text-muted">
            {m.summary}
          </Text>
        )}
        <Pressable
          onPress={() => router.push({ pathname: '/ask', params: { q: `Explain the main ideas in "${m.title}"` } } as any)}
          style={styles.link}
          accessibilityRole="button"
        >
          <Ionicons name="chatbubble-ellipses-outline" size={size['icon-sm']} color={colors['accent-text']} />
          <Text variant="subhead" color="accent-text">
            Ask Zuri about it
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!c) return null;
  const minutes = c.duration_seconds ? Math.round(c.duration_seconds / 60) : 0;
  return (
    <View style={styles.wrap}>
      <Text variant="headline">{c.title}</Text>
      {(c.recorded_at || minutes > 0) && (
        <Text variant="caption" color="text-subtle">
          {[c.recorded_at ? `Recorded ${new Date(c.recorded_at).toLocaleDateString()}` : '', minutes ? `${minutes} min` : '']
            .filter(Boolean)
            .join(' · ')}
        </Text>
      )}
      {!!c.summary && <Text variant="callout">{c.summary}</Text>}

      {c.key_points.length > 0 && (
        <View style={styles.section}>
          <Text variant="eyebrow" color="accent-text">
            KEY POINTS
          </Text>
          {c.key_points.map((p, i) => (
            <Text key={i} variant="footnote">
              • {p}
            </Text>
          ))}
        </View>
      )}

      {c.notes.map((n, i) => (
        <View key={i} style={styles.section}>
          <Text variant="subhead">{n.heading}</Text>
          {n.points.map((p, k) => (
            <Text key={k} variant="footnote" color="text-muted">
              • {p}
            </Text>
          ))}
        </View>
      ))}

      {c.flashcards.length > 0 && (
        <View style={styles.section}>
          <Pressable
            onPress={() => setShowCards((s) => !s)}
            style={styles.link}
            accessibilityRole="button"
            accessibilityState={{ expanded: showCards }}
          >
            <Ionicons name={showCards ? 'chevron-up' : 'albums-outline'} size={size['icon-sm']} color={colors['accent-text']} />
            <Text variant="subhead" color="accent-text">
              {showCards ? 'Hide flashcards' : `Show ${c.flashcards.length} flashcards`}
            </Text>
          </Pressable>
          {showCards &&
            c.flashcards.map((f, i) => (
              <View key={i} style={styles.card}>
                <Text variant="subhead">{f.question}</Text>
                <Text variant="footnote" color="text-muted">
                  {f.answer}
                </Text>
              </View>
            ))}
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles(({ colors, space, radius, size }) => ({
  wrap: { gap: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  section: { gap: space[1], marginTop: space[2] },
  link: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: size['touch-target'] },
  card: {
    backgroundColor: colors['surface-sunken'],
    borderRadius: radius.md,
    padding: space[3],
    gap: space[1],
  },
}));

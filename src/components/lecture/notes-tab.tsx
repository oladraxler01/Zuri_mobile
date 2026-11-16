import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import type { NoteSection } from '@/types/lecture';
import { tabStyles as t } from './tab-styles';

/** Structured lecture notes: headed sections of short points. */
export function NotesTab({ notes }: { notes: NoteSection[] }) {
  if (!notes.length) {
    return (
      <View style={t.empty}>
        <Ionicons name="reader-outline" size={28} color={UI.muted} />
        <Text style={t.emptyText}>No notes for this lecture yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={t.scroll} showsVerticalScrollIndicator={false}>
      {notes.map((section, i) => (
        <View key={section.heading} style={styles.section}>
          <View style={styles.headingRow}>
            <Text style={styles.number}>{String(i + 1).padStart(2, '0')}</Text>
            <Text style={styles.heading}>{section.heading}</Text>
          </View>
          {section.points.map((point) => (
            <View key={point} style={styles.point}>
              <View style={styles.bullet} />
              <Text style={styles.pointText}>{point}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 26,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 10,
  },
  number: {
    fontFamily: ZuriFonts.labelSmBold,
    fontSize: 12,
    color: UI.amber,
    fontVariant: ['tabular-nums'],
  },
  heading: {
    flex: 1,
    fontFamily: ZuriFonts.headlineMd,
    fontSize: 19,
    color: UI.ink,
  },
  point: {
    flexDirection: 'row',
    gap: 12,
    paddingLeft: 26,
    marginBottom: 8,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: UI.ink,
    marginTop: 9,
  },
  pointText: {
    flex: 1,
    fontFamily: ZuriFonts.bodyRegular,
    fontSize: 15,
    lineHeight: 23,
    color: UI.inkSoft,
  },
});

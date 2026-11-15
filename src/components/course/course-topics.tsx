import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { Segmented } from '@/components/ui/chip';
import { StatusBadge, type Status } from '@/components/dashboard';
import { EmptyState } from '@/components/states/state-view';
import { LEVEL_LABEL, type ConceptMastery, type MasteryLevel } from '@/utils/mastery';
import { activityFor, type ActivityItem } from '@/utils/activity';
import { formatLectureDate } from '@/utils/time';

const LEVEL_STATUS: Record<MasteryLevel, Status | null> = { strong: 'good', developing: 'warning', weak: 'critical', new: null };

function LevelBadge({ level }: { level: MasteryLevel }) {
  const s = LEVEL_STATUS[level];
  if (!s) {
    return (
      <View style={styles.newBadge}>
        <Ionicons name="ellipse-outline" size={11} color={UI.muted} />
        <Text style={styles.newBadgeText}>{LEVEL_LABEL.new}</Text>
      </View>
    );
  }
  return <StatusBadge status={s} label={LEVEL_LABEL[level]} />;
}

/** Strength map + full topic list for one course. */
export function CourseTopics({ concepts, onRecord }: { concepts: ConceptMastery[]; onRecord: () => void }) {
  const [view, setView] = useState<'map' | 'all'>('map');

  if (!concepts.length) {
    return (
      <EmptyState
        compact
        icon="git-network-outline"
        title="No topics yet"
        message="Topics come from your recorded lectures and uploaded materials. Record a class or upload notes to build this course’s map."
        primary={{ label: 'Record a lecture', icon: 'mic', onPress: onRecord }}
      />
    );
  }

  const counts = (['strong', 'developing', 'weak', 'new'] as MasteryLevel[]).map((l) => ({
    level: l,
    n: concepts.filter((c) => c.level === l).length,
  }));
  const weakest = concepts.find((c) => c.level === 'weak') ?? concepts.find((c) => c.level === 'developing') ?? concepts.find((c) => c.level === 'new');
  const practise = (c: ConceptMastery) => {
    const src = c.sources.find((s) => s.kind === 'lecture') ?? c.sources[0];
    if (!src) return;
    router.push((src.kind === 'lecture' ? `/lecture/${src.id}?tab=questions` : `/material/${src.id}?tab=questions`) as Href);
  };

  return (
    <View style={{ gap: 12 }}>
      <Segmented<'map' | 'all'>
        options={[
          { key: 'map', label: 'Strength map' },
          { key: 'all', label: `All topics · ${concepts.length}` },
        ]}
        value={view}
        onChange={setView}
      />

      {view === 'map' ? (
        <>
          <View style={styles.summary}>
            {counts.map((c) => (
              <View key={c.level} style={styles.summaryCell}>
                <Text style={styles.summaryN}>{c.n}</Text>
                <Text style={styles.summaryL}>{LEVEL_LABEL[c.level]}</Text>
              </View>
            ))}
          </View>

          {weakest && (
            <Pressable style={styles.practise} onPress={() => practise(weakest)}>
              <Ionicons name="flash-outline" size={18} color="#fff" />
              <Text style={styles.practiseText}>Practise {weakest.concept}</Text>
            </Pressable>
          )}

          <View style={styles.grid}>
            {concepts.map((c) => (
              <Pressable key={c.concept} style={styles.tile} onPress={() => practise(c)} accessibilityRole="button">
                <View style={styles.tileTop}>
                  <Text style={styles.tileTitle} numberOfLines={2}>
                    {c.concept}
                  </Text>
                  {c.flagged && <Ionicons name="flag" size={13} color={UI.error} accessibilityLabel="Flagged to revisit" />}
                </View>
                <LevelBadge level={c.level} />
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${c.score ?? 0}%` }]} />
                </View>
                <Text style={styles.tileMeta}>
                  {c.score === null ? 'Answer questions to measure' : `${c.score}% · ${c.attempts} answers`}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.note}>
            Levels come from your recent quiz answers and flashcards on each topic (newer answers count more). Tap a topic to practise it.
          </Text>
        </>
      ) : (
        <View style={styles.card}>
          {concepts.map((c, i) => (
            <View key={c.concept} style={[styles.topic, i > 0 && styles.topicBorder]}>
              <View style={styles.topicHead}>
                <Text style={styles.topicTitle}>{c.concept}</Text>
                <LevelBadge level={c.level} />
              </View>
              {!!c.summary && <Text style={styles.topicSummary}>{c.summary}</Text>}
              <View style={styles.sources}>
                {c.sources.map((s) => (
                  <Pressable
                    key={s.id}
                    style={styles.source}
                    onPress={() => router.push((s.kind === 'lecture' ? `/lecture/${s.id}` : `/material/${s.id}`) as Href)}
                  >
                    <Ionicons name={s.kind === 'lecture' ? 'mic-outline' : 'document-text-outline'} size={12} color={UI.amber} />
                    <Text style={styles.sourceText} numberOfLines={1}>
                      {s.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/** Activity history for a course (or everything when courseId is omitted). */
export function ActivityList({ items }: { items: ActivityItem[] }) {
  if (!items.length) {
    return <EmptyState compact icon="time-outline" title="No activity yet" message="Recordings, uploads, quizzes and flashcards will show up here." />;
  }
  let lastDay = '';
  return (
    <View style={styles.card}>
      {items.slice(0, 60).map((it) => {
        const day = new Date(it.at).toDateString();
        const showDay = day !== lastDay;
        lastDay = day;
        return (
          <View key={it.id}>
            {showDay && <Text style={styles.day}>{formatLectureDate(it.at).replace(/,.*$/, '')}</Text>}
            <Pressable
              style={styles.act}
              disabled={!it.href}
              onPress={() => it.href && router.push(it.href as Href)}
              accessibilityRole={it.href ? 'button' : 'text'}
            >
              <View style={styles.actIcon}>
                <Ionicons name={it.icon} size={16} color={UI.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actTitle}>{it.title}</Text>
                {!!it.detail && <Text style={styles.actDetail}>{it.detail}</Text>}
              </View>
              <Text style={styles.actTime}>{new Date(it.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

export { activityFor };

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', backgroundColor: UI.card, borderRadius: 16, borderWidth: 1, borderColor: UI.border, paddingVertical: 12 },
  summaryCell: { flex: 1, alignItems: 'center' },
  summaryN: { fontFamily: LexiFonts.headlineMd, fontSize: 20, color: UI.ink },
  summaryL: { fontFamily: LexiFonts.bodyRegular, fontSize: 11, color: UI.muted, textAlign: 'center' },
  practise: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 24, backgroundColor: UI.ink },
  practiseText: { fontFamily: LexiFonts.labelSmBold, fontSize: 14, color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexBasis: '47%', flexGrow: 1, backgroundColor: UI.card, borderRadius: 14, borderWidth: 1, borderColor: UI.border, padding: 12, gap: 8 },
  tileTop: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  tileTitle: { flex: 1, fontFamily: LexiFonts.labelSmBold, fontSize: 14, color: UI.ink },
  track: { height: 5, borderRadius: 3, backgroundColor: UI.cardMuted, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#c5832b' },
  tileMeta: { fontFamily: LexiFonts.bodyRegular, fontSize: 11, color: UI.muted },
  newBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: UI.cardMuted, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  newBadgeText: { fontFamily: LexiFonts.labelSmBold, fontSize: 11, color: UI.muted },
  note: { fontFamily: LexiFonts.bodyRegular, fontSize: 12, lineHeight: 18, color: UI.muted },
  card: { backgroundColor: UI.card, borderRadius: 16, borderWidth: 1, borderColor: UI.border, paddingHorizontal: 14 },
  topic: { paddingVertical: 12, gap: 6 },
  topicBorder: { borderTopWidth: 1, borderTopColor: UI.borderSoft },
  topicHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topicTitle: { flex: 1, fontFamily: LexiFonts.bodyMedium, fontSize: 15, color: UI.ink },
  topicSummary: { fontFamily: LexiFonts.bodyRegular, fontSize: 13, lineHeight: 19, color: UI.inkSoft },
  sources: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: UI.cardMuted, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, maxWidth: '100%' },
  sourceText: { fontFamily: LexiFonts.labelSmBold, fontSize: 11, color: UI.ink, flexShrink: 1 },
  day: { fontFamily: LexiFonts.labelSmBold, fontSize: 11, letterSpacing: 1, color: UI.muted, marginTop: 14, marginBottom: 2 },
  act: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  actIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: UI.cardMuted, alignItems: 'center', justifyContent: 'center' },
  actTitle: { fontFamily: LexiFonts.bodyMedium, fontSize: 14, color: UI.ink },
  actDetail: { fontFamily: LexiFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 1 },
  actTime: { fontFamily: LexiFonts.labelSmBold, fontSize: 11, color: UI.muted },
});

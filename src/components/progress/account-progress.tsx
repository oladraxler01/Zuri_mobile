import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, ActivityIndicator } from 'react-native';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { Panel, Grid, StatTile, HBarList } from '@/components/dashboard';
import { useSession } from '@/context/session-context';
import {
  getServerStudyStats,
  getStudyStreak,
  getTopicMastery,
  getTopicsForReview,
  masteryPercent,
  type ServerStudyStats,
  type ServerTopicMastery,
} from '@/services/progress-api';

/** Streak and totals from the account (GET /analytics/study-streak, /analytics/study-stats). */
export function AccountStatsPanel() {
  const { user } = useSession();
  const [data, setData] = useState<{ streak: number; stats: ServerStudyStats | null } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    Promise.all([getStudyStreak(), getServerStudyStats()])
      .then(([streak, stats]) => setData({ streak, stats }))
      .catch((e) => setError(e instanceof Error ? e.message : 'Couldn’t load your account stats.'));
  }, [user]);

  if (!user) return null;
  return (
    <Panel title="In your account" subtitle="Counted on Zuri’s server across all your devices">
      {error ? (
        <Text style={styles.muted}>{error}</Text>
      ) : !data ? (
        <ActivityIndicator color={UI.ink} />
      ) : (
        <Grid min={140}>
          <StatTile label="Day streak" value={`${data.streak}`} icon="flame-outline" />
          <StatTile label="Minutes studied" value={`${data.stats?.total_study_minutes ?? 0}`} icon="time-outline" />
          <StatTile label="Quizzes done" value={`${data.stats?.total_quizzes_completed ?? 0}`} icon="checkmark-done-outline" />
          <StatTile label="Study days" value={`${data.stats?.total_study_days ?? 0}`} icon="calendar-outline" />
        </Grid>
      )}
    </Panel>
  );
}

/** Topic mastery from server-graded quizzes (GET /analytics/topic-mastery, /analytics/topics-for-review). */
export function AccountMasteryPanel() {
  const { user } = useSession();
  const [topics, setTopics] = useState<ServerTopicMastery[] | null>(null);
  const [due, setDue] = useState<ServerTopicMastery[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    Promise.all([getTopicMastery(), getTopicsForReview()])
      .then(([all, review]) => {
        setTopics(all);
        setDue(review);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Couldn’t load your mastery.'));
  }, [user]);

  if (!user) return null;
  return (
    <Panel title="Mastery in your account" subtitle="From quizzes graded by Zuri’s server">
      {error ? (
        <Text style={styles.muted}>{error}</Text>
      ) : !topics ? (
        <ActivityIndicator color={UI.ink} />
      ) : topics.length === 0 ? (
        <Text style={styles.muted}>Finish a practice quiz on one of your materials to see topics here.</Text>
      ) : (
        <>
          <HBarList
            rows={topics
              .slice()
              .sort((a, b) => masteryPercent(a) - masteryPercent(b))
              .slice(0, 8)
              .map((t) => ({
                label: t.topic,
                value: masteryPercent(t),
                sub: `${t.questions_correct}/${t.questions_attempted} correct`,
              }))}
            warnBelow={50}
          />
          {due.length > 0 && (
            <Text style={[styles.muted, { marginTop: 12 }]}>
              Due for review: {due.slice(0, 5).map((t) => t.topic).join(', ')}
            </Text>
          )}
        </>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  muted: { fontFamily: ZuriFonts.bodyRegular, fontSize: 13, lineHeight: 19, color: UI.muted },
});

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Text, makeStyles, useTheme } from '@/theme';
import { useSession } from '@/context/session-context';
import { getLecturerSignals, type LecturerClassSignalDTO } from '@/services/academic-api';

/**
 * Lecturer → Insights: real class data from Zuri's academic service
 * (GET /academic/courses/:code/lecturer-signals): the subtopics where the most
 * students are struggling, with the share of the class and Zuri's suggestion.
 * Shown above the sample figures; hidden when the course isn't on the server.
 */
export function ClassSignals({ courseCode }: { courseCode: string }) {
  const styles = useStyles();
  const { colors, size } = useTheme();
  const { user } = useSession();
  const [signals, setSignals] = useState<LecturerClassSignalDTO[] | null | undefined>(undefined);

  useEffect(() => {
    if (!user) return setSignals(null);
    setSignals(undefined);
    getLecturerSignals(courseCode)
      .then((list) => setSignals(list.slice().sort((a, b) => b.struggling_percentage - a.struggling_percentage)))
      .catch(() => setSignals(null));
  }, [user, courseCode]);

  if (signals === null) return null;
  if (signals === undefined) return <ActivityIndicator color={colors.text} style={styles.loading} />;

  return (
    <Card eyebrow="FROM YOUR STUDENTS ON ZURI" style={styles.card}>
      {signals.length === 0 ? (
        <Text variant="footnote" color="text-muted">
          No struggles reported yet. This fills in as your students practise {courseCode} on Zuri.
        </Text>
      ) : (
        <View style={styles.list}>
          <Text variant="caption" color="text-subtle">
            Out of {signals[0].total_students} students using Zuri for {courseCode}
          </Text>
          {signals.slice(0, 6).map((s) => (
            <View key={`${s.topic}-${s.subtopic}`} style={styles.row}>
              <Ionicons
                name={s.struggling_percentage >= 40 ? 'alert-circle-outline' : 'information-circle-outline'}
                size={size['icon-md']}
                color={s.struggling_percentage >= 40 ? colors.danger : colors.warning}
              />
              <View style={styles.text}>
                <Text variant="subhead">{s.subtopic || s.topic}</Text>
                <Text variant="caption" color={s.struggling_percentage >= 40 ? 'danger' : 'warning'}>
                  {s.struggling_percentage}% struggling ({s.struggling_count} students){s.subtopic ? ` · ${s.topic}` : ''}
                </Text>
                {!!s.recommendation && (
                  <Text variant="footnote" color="text-muted">
                    {s.recommendation}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const useStyles = makeStyles(({ space }) => ({
  loading: { marginVertical: space[3] },
  card: { marginBottom: space[4] },
  list: { gap: space[3] },
  row: { flexDirection: 'row', gap: space[3], alignItems: 'flex-start' },
  text: { flex: 1, gap: space[1] },
}));

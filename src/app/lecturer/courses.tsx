import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useLecturer } from '@/context/lecturer-context';
import { useLectures } from '@/context/lectures-context';
import { useMaterials } from '@/context/materials-context';
import { ScreenShell, Grid } from '@/components/dashboard';
import { EmptyState } from '@/components/states/state-view';
import { insightsFor } from '@/utils/lecturer';

/** Courses the lecturer teaches. */
export default function LecturerCoursesScreen() {
  const { courses } = useLecturer();
  const { lectures } = useLectures();
  const { materials } = useMaterials();

  return (
    <ScreenShell
      eyebrow="TEACHING"
      title="Your courses"
      right={
        <Pressable style={styles.manage} onPress={() => router.push('/onboarding/lecturer-setup' as Href)}>
          <Ionicons name="create-outline" size={16} color="#fff" />
          <Text style={styles.manageText}>Manage</Text>
        </Pressable>
      }
    >
      {courses.length === 0 ? (
        <EmptyState
          icon="library-outline"
          title="No courses yet"
          message="Add the courses you teach to record lectures and see class insights."
          primary={{ label: 'Add courses', onPress: () => router.push('/onboarding/lecturer-setup' as Href) }}
        />
      ) : (
        <Grid min={300}>
          {courses.map((c) => {
            const i = insightsFor(c, lectures);
            const recorded = lectures.filter((l) => l.courseId === c.id).length;
            const mats = materials.filter((m) => m.courseId === c.id).length;
            return (
              <Pressable
                key={c.id}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
                onPress={() => router.push(`/teach/course/${c.id}` as Href)}
                accessibilityRole="button"
              >
                <View style={styles.cardTop}>
                  <Text style={styles.code}>
                    {c.code} · {c.level}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={UI.muted} />
                </View>
                <Text style={styles.title}>{c.title}</Text>
                <Text style={styles.meta}>
                  {c.slots.length ? c.slots.map((s) => `${s.day} ${s.startTime} · ${s.venue}`).join('  |  ') : 'No weekly time set'}
                </Text>
                <View style={styles.stats}>
                  <Stat value={`${i.cohortSize}`} label="students" />
                  <Stat value={`${recorded}`} label="lectures" />
                  <Stat value={`${mats}`} label="materials" />
                  <Stat value={`${i.avgMastery}%`} label="mastery" />
                </View>
              </Pressable>
            );
          })}
        </Grid>
      )}
    </ScreenShell>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  manage: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: UI.ink, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  manageText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 13, color: '#fff' },
  card: { backgroundColor: UI.card, borderRadius: 18, borderWidth: 1, borderColor: UI.border, padding: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontFamily: ZuriFonts.labelSmBold, fontSize: 12, letterSpacing: 1, color: UI.amber },
  title: { fontFamily: ZuriFonts.headlineMd, fontSize: 19, lineHeight: 25, color: UI.ink, marginTop: 4 },
  meta: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 4 },
  stats: { flexDirection: 'row', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: UI.borderSoft },
  statValue: { fontFamily: ZuriFonts.headlineMd, fontSize: 18, color: UI.ink },
  statLabel: { fontFamily: ZuriFonts.bodyRegular, fontSize: 11, color: UI.muted },
});

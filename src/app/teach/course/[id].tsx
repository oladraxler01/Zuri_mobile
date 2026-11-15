import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { useLecturer } from '@/context/lecturer-context';
import { useLectures } from '@/context/lectures-context';
import { useMaterials } from '@/context/materials-context';
import { ScreenShell, Panel, Grid, StatTile, ListRow, Divider } from '@/components/dashboard';
import { Segmented } from '@/components/ui/chip';
import { LectureCard } from '@/components/lecture/lecture-card';
import { MaterialCard } from '@/components/materials/material-card';
import { EmptyState } from '@/components/states/state-view';
import { describeStart, upcomingClasses } from '@/utils/time';
import { insightsFor, teachingTimetable } from '@/utils/lecturer';
import { pickAndUploadMaterial } from '@/utils/pick-material';

type Tab = 'overview' | 'lectures' | 'materials' | 'schedule';

/** Lecturer's view of one course: overview, lecture archive, materials, schedule. */
export default function TeachCourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { courses } = useLecturer();
  const { lectures } = useLectures();
  const { materials } = useMaterials();
  const [tab, setTab] = useState<Tab>('overview');
  const course = courses.find((c) => c.id === id);

  if (!course) {
    return (
      <ScreenShell back title="Course">
        <EmptyState icon="library-outline" title="Course not found" message="It may have been removed from your list." />
      </ScreenShell>
    );
  }

  const i = insightsFor(course, lectures);
  const next = upcomingClasses(teachingTimetable([course]))[0];
  const courseLectures = lectures.filter((l) => l.courseId === course.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const courseMaterials = materials.filter((m) => m.courseId === course.id);
  const record = () =>
    router.push({ pathname: '/lecture-recording', params: { courseId: course.id, courseCode: course.code, courseTitle: course.title } } as any);

  return (
    <ScreenShell back eyebrow={`${course.code} · ${course.level}`} title={course.title} edges={['top', 'bottom']}>
      <Segmented<Tab>
        options={[
          { key: 'overview', label: 'Overview' },
          { key: 'lectures', label: 'Lectures' },
          { key: 'materials', label: 'Materials' },
          { key: 'schedule', label: 'Schedule' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'overview' && (
        <>
          <Grid min={150}>
            <StatTile label="Students" value={`${i.cohortSize}`} icon="people-outline" />
            <StatTile label="Lectures recorded" value={`${courseLectures.length}`} icon="mic-outline" />
            <StatTile label="Average mastery" value={`${i.avgMastery}%`} icon="school-outline" />
          </Grid>
          {next && (
            <Panel title="Next lecture">
              <Text style={styles.big}>{describeStart(next)}</Text>
              <Text style={styles.muted}>
                {next.slot.day} {next.slot.startTime} – {next.slot.endTime} · {next.slot.venue}
              </Text>
              <Pressable style={styles.recordBtn} onPress={record}>
                <Ionicons name="mic" size={16} color="#fff" />
                <Text style={styles.recordText}>Record this lecture</Text>
              </Pressable>
            </Panel>
          )}
          <Panel title="Course intelligence" action={{ label: 'Full insights', onPress: () => router.push({ pathname: '/lecturer/insights', params: { courseId: course.id } } as any) }}>
            <Text style={styles.body}>{i.trend}</Text>
            <Text style={[styles.muted, { marginTop: 8 }]}>
              Weakest topics: {i.topics.slice(0, 3).map((t) => `${t.topic} (${t.mastery}%)`).join(', ')}
            </Text>
          </Panel>
          <Panel title="Quick actions">
            <ListRow icon="help-circle-outline" title="Generate a quiz" subtitle="From a lecture or material in this course" onPress={() => router.push({ pathname: '/teach/quiz/new', params: { courseId: course.id } } as any)} />
            <Divider />
            <ListRow icon="layers-outline" title="Create revision material" onPress={() => router.push({ pathname: '/teach/revision/[id]', params: { id: 'new', courseId: course.id } } as any)} />
            <Divider />
            <ListRow icon="megaphone-outline" title="Post an announcement" onPress={() => router.push({ pathname: '/teach/announcement', params: { courseId: course.id } } as any)} />
          </Panel>
        </>
      )}

      {tab === 'lectures' && (
        <>
          <Pressable style={styles.inline} onPress={record}>
            <Ionicons name="mic-outline" size={18} color={UI.ink} />
            <Text style={styles.inlineText}>Record a lecture</Text>
          </Pressable>
          {courseLectures.length ? (
            <View style={{ gap: 10 }}>
              {courseLectures.map((l) => (
                <LectureCard key={l.id} lecture={l} showCourse={false} />
              ))}
            </View>
          ) : (
            <EmptyState compact icon="mic-outline" title="No lectures yet" message="Recorded lectures appear here with transcript, summary, concepts and questions." />
          )}
        </>
      )}

      {tab === 'materials' && (
        <>
          <Pressable style={styles.inline} onPress={() => pickAndUploadMaterial(course.id)}>
            <Ionicons name="cloud-upload-outline" size={18} color={UI.ink} />
            <Text style={styles.inlineText}>Upload lecture material</Text>
          </Pressable>
          {courseMaterials.length ? (
            <View style={{ gap: 10 }}>
              {courseMaterials.map((m) => (
                <MaterialCard key={m.id} m={m} showCourse={false} />
              ))}
            </View>
          ) : (
            <EmptyState compact icon="folder-open-outline" title="No materials yet" message="Upload slides, notes or past questions for your students." />
          )}
        </>
      )}

      {tab === 'schedule' && (
        <Panel title="Weekly schedule" action={{ label: 'Edit', onPress: () => router.push('/onboarding/lecturer-setup' as Href) }}>
          {course.slots.length ? (
            course.slots.map((s, idx) => (
              <View key={s.id}>
                {idx > 0 && <Divider />}
                <ListRow icon="calendar-outline" title={`${s.day} · ${s.startTime} – ${s.endTime}`} subtitle={s.venue} />
              </View>
            ))
          ) : (
            <Text style={styles.muted}>No weekly lecture time set.</Text>
          )}
        </Panel>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  big: { fontFamily: LexiFonts.headlineMd, fontSize: 22, color: UI.ink },
  muted: { fontFamily: LexiFonts.bodyRegular, fontSize: 13, color: UI.muted, marginTop: 2 },
  body: { fontFamily: LexiFonts.bodyRegular, fontSize: 14, lineHeight: 21, color: UI.inkSoft },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: UI.ink,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 14,
  },
  recordText: { fontFamily: LexiFonts.labelSmBold, fontSize: 14, color: '#fff' },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: UI.border,
  },
  inlineText: { fontFamily: LexiFonts.labelSmBold, fontSize: 14, color: UI.ink },
});

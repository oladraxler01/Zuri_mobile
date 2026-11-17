import React, { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAcademic } from '@/context/academic-context';
import { useLectures } from '@/context/lectures-context';
import { useMaterials } from '@/context/materials-context';
import { useProgress } from '@/context/progress-context';
import { ScreenShell, Panel, HBarList, Grid, StatTile } from '@/components/dashboard';
import { Chip } from '@/components/ui/chip';
import { CourseTopics } from '@/components/course/course-topics';
import { EmptyState } from '@/components/states/state-view';
import { courseMastery, overallMastery } from '@/utils/mastery';
import { AccountMasteryPanel } from '@/components/progress/account-progress';

/** Concept mastery across all courses. */
export default function ConceptMasteryScreen() {
  const { state } = useAcademic();
  const { lectures } = useLectures();
  const { materials } = useMaterials();
  const { events } = useProgress();
  const [courseId, setCourseId] = useState<string | null>(null);

  const perCourse = useMemo(
    () => state.courses.map((c) => ({ course: c, list: courseMastery(c.id, lectures, materials, events) })).filter((x) => x.list.length),
    [state.courses, lectures, materials, events]
  );
  const all = perCourse.flatMap((x) => x.list);
  const selected = perCourse.find((x) => x.course.id === courseId);

  return (
    <ScreenShell back eyebrow="STUDY" title="Concept mastery" edges={['top', 'bottom']}>
      <AccountMasteryPanel />
      {!perCourse.length ? (
        <EmptyState icon="git-network-outline" title="No topics yet" message="Topics appear once you have processed lectures or materials." />
      ) : (
        <>
          <Grid min={140}>
            <StatTile label="Topics" value={`${all.length}`} icon="layers-outline" />
            <StatTile label="Strong" value={`${all.filter((c) => c.level === 'strong').length}`} icon="checkmark-circle-outline" />
            <StatTile label="Weak" value={`${all.filter((c) => c.level === 'weak').length}`} icon="flag-outline" />
            <StatTile label="Not tested" value={`${all.filter((c) => c.level === 'new').length}`} icon="ellipse-outline" />
          </Grid>

          <Panel title="By course" subtitle="Average mastery of tested topics">
            <HBarList
              rows={perCourse.map((x) => ({
                label: `${x.course.code} · ${x.course.title}`,
                value: overallMastery(x.list) ?? 0,
                sub: overallMastery(x.list) === null ? 'Not tested yet' : `${x.list.filter((c) => c.score !== null).length} of ${x.list.length} topics tested`,
              }))}
              warnBelow={50}
              onPressRow={(i) => setCourseId(perCourse[i].course.id)}
            />
          </Panel>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {perCourse.map((x) => (
              <Chip key={x.course.id} label={x.course.code} on={x.course.id === (selected ?? perCourse[0]).course.id} onPress={() => setCourseId(x.course.id)} />
            ))}
          </ScrollView>
          <CourseTopics concepts={(selected ?? perCourse[0]).list} courseId={(selected ?? perCourse[0]).course.id} onRecord={() => router.push('/lecture-recording' as any)} />
        </>
      )}
    </ScreenShell>
  );
}

import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useLectures } from '@/context/lectures-context';
import { useMaterials } from '@/context/materials-context';
import { ScreenShell, Panel, Grid, HBarList, BarChart, ListRow, Divider, SampleBanner, StatusBadge } from '@/components/dashboard';
import { SourceCard } from '@/components/source-card';
import { COMMON_DIFFICULTIES, FACULTIES, INTERVENTIONS, SHARED_CONCEPTS, WEEKLY_ACTIVE, allCourses } from '@/data/sample-institution';
import { searchSources } from '@/utils/source-search';

/** University-wide intelligence: trends, shared difficulties, comparisons, knowledge search. */
export default function UniversityIntelligenceScreen() {
  const { lectures } = useLectures();
  const { materials } = useMaterials();
  const [query, setQuery] = useState('');
  const hits = useMemo(() => (query.trim() ? searchSources(query, { lectures, materials }, {}, 6) : []), [query, lectures, materials]);
  const courses = allCourses();
  const avg = (xs: number[]) => Math.round(xs.reduce((n, x) => n + x, 0) / Math.max(1, xs.length));

  return (
    <ScreenShell back eyebrow="UNIVERSITY-WIDE" title="Academic intelligence" edges={['top', 'bottom']}>
      <Panel title="Institutional research" subtitle="Papers published by your university, from OpenAlex" action={{ label: 'Open', onPress: () => router.push('/admin/research' as Href) }}>
        <Text style={styles.muted}>Search and browse the research output of your staff and students, most cited first.</Text>
      </Panel>

      <Panel title="University knowledge search" subtitle="Search lectures and materials across the institution (research included)">
        <View style={styles.search}>
          <Ionicons name="search" size={16} color={UI.muted} />
          <TextInput style={styles.searchInput} value={query} onChangeText={setQuery} placeholder="Search a concept, method or topic" placeholderTextColor={UI.muted} />
        </View>
        {!!query.trim() && (
          <View style={{ gap: 8, marginTop: 12 }}>
            {hits.length ? hits.map((h, i) => <SourceCard key={`${h.id}-${h.location}`} hit={h} index={i} />) : <Text style={styles.muted}>No matches in content on this device.</Text>}
          </View>
        )}
      </Panel>

      <Grid min={340}>
        <Panel title="Academic trends" subtitle="% of students active, last 8 weeks">
          <BarChart data={WEEKLY_ACTIVE.map((v, i) => ({ label: i === 7 ? 'Now' : `W${i + 1}`, value: v }))} max={100} format={(v) => `${v}%`} label="University weekly active students" />
          <Text style={styles.note}>
            Activity rose {WEEKLY_ACTIVE[7] - WEEKLY_ACTIVE[0]} points this semester, with the biggest jump after lecture capture reached most 200-level courses.
          </Text>
        </Panel>
        <Panel title="Common student difficulties" subtitle="Concepts with low mastery across courses">
          <HBarList rows={COMMON_DIFFICULTIES.map((d) => ({ label: d.concept, value: d.mastery, sub: d.courses.join(', ') }))} warnBelow={55} />
        </Panel>
      </Grid>

      <Grid min={340}>
        <Panel title="Faculty intelligence" subtitle="Average mastery and engagement">
          {FACULTIES.map((f, i) => {
            const cs = f.departments.flatMap((d) => d.courses);
            return (
              <View key={f.id}>
                {i > 0 && <Divider />}
                <ListRow
                  title={f.name}
                  subtitle={`${avg(cs.map((c) => c.mastery))}% mastery · ${avg(cs.map((c) => c.engagement))}% active`}
                  onPress={() => router.push(`/admin/faculty/${f.id}` as Href)}
                />
              </View>
            );
          })}
        </Panel>
        <Panel title="Department intelligence" subtitle="Ranked by average mastery">
          <HBarList
            rows={FACULTIES.flatMap((f) => f.departments)
              .map((d) => ({ label: d.name, value: avg(d.courses.map((c) => c.mastery)), sub: `${d.students} students` }))
              .sort((a, b) => b.value - a.value)}
            warnBelow={55}
          />
        </Panel>
      </Grid>

      <Panel title="Course comparison" subtitle="Mastery by course, highest first · tap to open">
        <HBarList
          rows={[...courses].sort((a, b) => b.mastery - a.mastery).map((c) => ({ label: `${c.code} · ${c.title}`, value: c.mastery, sub: `${c.engagement}% active · ${c.enrolled} enrolled` }))}
          warnBelow={55}
          onPressRow={(i) => router.push(`/admin/course/${[...courses].sort((a, b) => b.mastery - a.mastery)[i].id}` as Href)}
        />
      </Panel>

      <Grid min={340}>
        <Panel title="Cross-course knowledge map" subtitle="Concepts taught in more than one course">
          {SHARED_CONCEPTS.map((s, i) => (
            <View key={s.concept} style={[styles.mapRow, i > 0 && styles.mapBorder]}>
              <Text style={styles.mapConcept}>{s.concept}</Text>
              <View style={styles.mapCourses}>
                {s.courses.map((c) => (
                  <View key={c} style={styles.pill}>
                    <Text style={styles.pillText}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
          <Text style={styles.note}>Shared concepts are where joint revision material saves lecturers the most time.</Text>
        </Panel>
        <Panel title="Institutional intervention opportunities">
          {INTERVENTIONS.filter((x) => x.status !== 'resolved').map((x, i) => (
            <View key={x.id}>
              {i > 0 && <Divider />}
              <ListRow title={`${x.course}: ${x.issue}`} subtitle={`${x.students} students`} right={<StatusBadge status={x.status === 'open' ? 'critical' : 'warning'} label={x.status === 'open' ? 'Open' : 'In progress'} />} />
            </View>
          ))}
        </Panel>
      </Grid>

      <SampleBanner text="Sample university data; knowledge search uses the real lectures and materials on this device." />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.bg,
    paddingHorizontal: 16,
  },
  searchInput: { flex: 1, fontFamily: ZuriFonts.bodyRegular, fontSize: 14, color: UI.ink },
  muted: { fontFamily: ZuriFonts.bodyRegular, fontSize: 13, color: UI.muted },
  note: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, lineHeight: 18, color: UI.muted, marginTop: 10 },
  mapRow: { paddingVertical: 10, gap: 6 },
  mapBorder: { borderTopWidth: 1, borderTopColor: UI.borderSoft },
  mapConcept: { fontFamily: ZuriFonts.bodyMedium, fontSize: 15, color: UI.ink },
  mapCourses: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { backgroundColor: UI.cardMuted, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, color: UI.ink },
});

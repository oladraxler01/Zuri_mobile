import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { ScreenShell, Panel, Grid, StatTile, StatusBadge, Divider, SampleBanner } from '@/components/dashboard';
import { Chip } from '@/components/ui/chip';
import { sampleStudents } from '@/data/sample-institution';

/** Student overview: directory with engagement, mastery and risk, searchable and filterable. */
export default function StudentOverviewScreen() {
  const all = useMemo(() => sampleStudents(), []);
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState<string | null>(null);
  const [risk, setRisk] = useState<'all' | 'critical' | 'warning'>('all');
  const depts = Array.from(new Set(all.map((s) => s.department)));
  const q = query.trim().toLowerCase();
  const list = all
    .filter((s) => !dept || s.department === dept)
    .filter((s) => risk === 'all' || s.status === risk)
    .filter((s) => !q || `${s.name} ${s.matric}`.toLowerCase().includes(q))
    .sort((a, b) => a.engagement + a.mastery - (b.engagement + b.mastery));

  return (
    <ScreenShell back eyebrow="INSTITUTION" title="Students" edges={['top', 'bottom']}>
      <Grid min={150}>
        <StatTile label="In directory" value={`${all.length}`} icon="people-outline" />
        <StatTile label="At risk" value={`${all.filter((s) => s.status === 'critical').length}`} icon="alert-circle-outline" />
        <StatTile label="Need a nudge" value={`${all.filter((s) => s.status === 'warning').length}`} icon="flag-outline" />
      </Grid>

      <View style={styles.search}>
        <Ionicons name="search" size={16} color={UI.muted} />
        <TextInput style={styles.searchInput} value={query} onChangeText={setQuery} placeholder="Search name or matric number" placeholderTextColor={UI.muted} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="All risk levels" on={risk === 'all'} onPress={() => setRisk('all')} />
        <Chip label="At risk" on={risk === 'critical'} onPress={() => setRisk('critical')} />
        <Chip label="Need a nudge" on={risk === 'warning'} onPress={() => setRisk('warning')} />
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="All departments" on={!dept} onPress={() => setDept(null)} />
        {depts.map((d) => (
          <Chip key={d} label={d} on={dept === d} onPress={() => setDept(d)} />
        ))}
      </ScrollView>

      <Panel title={`${list.length} students`} subtitle="Lowest engagement and mastery first">
        {list.map((s, i) => (
          <View key={s.id}>
            {i > 0 && <Divider />}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{s.name}</Text>
                <Text style={styles.meta}>
                  {s.matric} · {s.department} · {s.level}
                </Text>
                <Text style={styles.meta}>
                  {s.engagement}% active · {s.mastery}% mastery
                </Text>
              </View>
              <StatusBadge status={s.status} label={s.status === 'critical' ? 'At risk' : s.status === 'warning' ? 'Nudge' : 'On track'} />
            </View>
          </View>
        ))}
      </Panel>
      <SampleBanner text="Sample students. The real directory syncs from the student information system." />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: 22, borderWidth: 1, borderColor: UI.border, backgroundColor: UI.card, paddingHorizontal: 16 },
  searchInput: { flex: 1, fontFamily: ZuriFonts.bodyRegular, fontSize: 14, color: UI.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  name: { fontFamily: ZuriFonts.bodyMedium, fontSize: 15, color: UI.ink },
  meta: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 2 },
});

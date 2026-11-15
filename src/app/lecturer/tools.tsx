import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { useLecturer } from '@/context/lecturer-context';
import { ScreenShell, Grid, Panel, ListRow, Divider, StatusBadge } from '@/components/dashboard';
import type { IoniconName } from '@/types/lecture';
import { formatDue } from '@/utils/planner';
import { formatLectureDate } from '@/utils/time';

/** Teaching tools: generate quizzes and revision material, assessments, announcements. */
export default function LecturerToolsScreen() {
  const { courses, quizzes, packs, assessments, announcements } = useLecturer();
  const code = (id: string) => courses.find((c) => c.id === id)?.code ?? '';

  return (
    <ScreenShell eyebrow="TEACHING TOOLS" title="Tools">
      <Grid min={240}>
        <Tool
          icon="help-circle-outline"
          title="Generate quiz"
          desc="Questions from a lecture you recorded or a material you uploaded."
          onPress={() => router.push('/teach/quiz/new' as Href)}
        />
        <Tool
          icon="layers-outline"
          title="Revision material"
          desc="A revision pack built from your lectures and the class's weak topics."
          onPress={() => router.push({ pathname: '/teach/revision/[id]', params: { id: 'new' } } as any)}
        />
        <Tool
          icon="create-outline"
          title="Create assessment"
          desc="Set an assignment, test or exam; students get it on their Plan."
          onPress={() => router.push('/teach/assessment' as Href)}
        />
        <Tool
          icon="megaphone-outline"
          title="Course announcement"
          desc="Send a message to everyone in a course."
          onPress={() => router.push('/teach/announcement' as Href)}
        />
      </Grid>

      <Grid min={320}>
        <Panel title="Quizzes" subtitle={quizzes.length ? undefined : 'None yet'}>
          {quizzes.map((q, i) => (
            <View key={q.id}>
              {i > 0 && <Divider />}
              <ListRow
                icon="help-circle-outline"
                title={q.title}
                subtitle={`${code(q.courseId)} · ${q.questions.length} questions · ${q.source}`}
                right={<StatusBadge status={q.status === 'published' ? 'good' : 'warning'} label={q.status === 'published' ? 'Published' : 'Draft'} />}
                onPress={() => router.push(`/teach/quiz/${q.id}` as Href)}
              />
            </View>
          ))}
        </Panel>

        <Panel title="Revision packs" subtitle={packs.length ? undefined : 'None yet'}>
          {packs.map((p, i) => (
            <View key={p.id}>
              {i > 0 && <Divider />}
              <ListRow
                icon="layers-outline"
                title={p.title}
                subtitle={`${code(p.courseId)} · ${p.sections.length} sections`}
                right={<StatusBadge status={p.published ? 'good' : 'warning'} label={p.published ? 'Shared' : 'Draft'} />}
                onPress={() => router.push(`/teach/revision/${p.id}` as Href)}
              />
            </View>
          ))}
        </Panel>
      </Grid>

      <Grid min={320}>
        <Panel title="Assessments" subtitle={assessments.length ? undefined : 'None yet'}>
          {[...assessments]
            .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
            .map((a, i) => (
              <View key={a.id}>
                {i > 0 && <Divider />}
                <ListRow icon="calendar-outline" title={a.title} subtitle={`${code(a.courseId)} · ${a.kind} · ${formatDue(a.dueAt)}`} />
              </View>
            ))}
        </Panel>

        <Panel
          title="Announcement history"
          subtitle={announcements.length ? undefined : 'None yet'}
          action={{ label: 'New', onPress: () => router.push('/teach/announcement' as Href) }}
        >
          {announcements.slice(0, 6).map((a, i) => (
            <View key={a.id}>
              {i > 0 && <Divider />}
              <ListRow
                icon={a.important ? 'alert-circle-outline' : 'megaphone-outline'}
                title={a.title}
                subtitle={`${code(a.courseId)} · ${formatLectureDate(a.createdAt)}`}
              />
            </View>
          ))}
        </Panel>
      </Grid>
    </ScreenShell>
  );
}

function Tool({ icon, title, desc, onPress }: { icon: IoniconName; title: string; desc: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.tool, pressed && { opacity: 0.9 }]} onPress={onPress} accessibilityRole="button">
      <View style={styles.toolIcon}>
        <Ionicons name={icon} size={22} color={UI.ink} />
      </View>
      <Text style={styles.toolTitle}>{title}</Text>
      <Text style={styles.toolDesc}>{desc}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tool: { backgroundColor: UI.card, borderRadius: 18, borderWidth: 1, borderColor: UI.border, padding: 16, minHeight: 150 },
  toolIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: UI.amberSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  toolTitle: { fontFamily: LexiFonts.headlineMd, fontSize: 17, color: UI.ink },
  toolDesc: { fontFamily: LexiFonts.bodyRegular, fontSize: 13, lineHeight: 19, color: UI.inkSoft, marginTop: 4 },
});

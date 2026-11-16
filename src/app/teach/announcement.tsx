import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Switch } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useLecturer } from '@/context/lecturer-context';
import { ScreenShell, Panel, Divider } from '@/components/dashboard';
import { Chip } from '@/components/ui/chip';
import { formatLectureDate } from '@/utils/time';

/** Compose a course announcement and see announcement history. */
export default function AnnouncementScreen() {
  const params = useLocalSearchParams<{ courseId?: string }>();
  const { courses, announcements, addAnnouncement, deleteAnnouncement } = useLecturer();
  const [courseId, setCourseId] = useState(params.courseId ?? courses[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [important, setImportant] = useState(false);
  const [sent, setSent] = useState(false);
  const course = courses.find((c) => c.id === courseId);
  const history = announcements.filter((a) => !params.courseId || a.courseId === params.courseId);

  const send = () => {
    if (!courseId || !title.trim() || !body.trim()) return;
    addAnnouncement({ courseId, title: title.trim(), body: body.trim(), important });
    setTitle('');
    setBody('');
    setImportant(false);
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  };

  return (
    <ScreenShell back eyebrow="COURSE ANNOUNCEMENT" title="Message your class" edges={['top', 'bottom']}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {courses.map((c) => (
          <Chip key={c.id} label={c.code} on={c.id === courseId} onPress={() => setCourseId(c.id)} />
        ))}
      </ScrollView>

      <Panel>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Subject" placeholderTextColor={UI.muted} />
        <TextInput
          style={[styles.input, styles.body]}
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
          placeholder={`Write to ${course?.cohortSize ?? ''} ${course?.code ?? ''} students…`}
          placeholderTextColor={UI.muted}
        />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Mark as important</Text>
            <Text style={styles.rowSub}>Sends a notification, not just an inbox message</Text>
          </View>
          <Switch value={important} onValueChange={setImportant} trackColor={{ false: '#e4e2dd', true: '#c5832b' }} />
        </View>
        <Pressable style={[styles.primary, (!title.trim() || !body.trim()) && { opacity: 0.4 }]} disabled={!title.trim() || !body.trim()} onPress={send}>
          <Ionicons name="paper-plane-outline" size={18} color="#fff" />
          <Text style={styles.primaryText}>Send to {course?.code ?? 'class'}</Text>
        </Pressable>
        {sent && <Text style={styles.sent}>Sent. Students see it once their app is connected.</Text>}
      </Panel>

      <Panel title="Announcement history" subtitle={history.length ? `${history.length} sent` : 'Nothing sent yet'}>
        {history.map((a, i) => (
          <View key={a.id}>
            {i > 0 && <Divider />}
            <View style={styles.hItem}>
              <View style={styles.hHead}>
                <Text style={styles.hTitle}>
                  {a.important ? '⚑ ' : ''}
                  {a.title}
                </Text>
                <Pressable onPress={() => deleteAnnouncement(a.id)} hitSlop={10} accessibilityLabel="Delete announcement">
                  <Ionicons name="trash-outline" size={16} color={UI.muted} />
                </Pressable>
              </View>
              <Text style={styles.hMeta}>
                {courses.find((c) => c.id === a.courseId)?.code} · {formatLectureDate(a.createdAt)}
              </Text>
              <Text style={styles.hBody}>{a.body}</Text>
            </View>
          </View>
        ))}
      </Panel>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.bg,
    paddingHorizontal: 14,
    fontFamily: ZuriFonts.bodyRegular,
    fontSize: 15,
    color: UI.ink,
    marginBottom: 10,
  },
  body: { height: 130, paddingTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  rowTitle: { fontFamily: ZuriFonts.bodyMedium, fontSize: 15, color: UI.ink },
  rowSub: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted },
  primary: { height: 50, borderRadius: 25, backgroundColor: UI.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  primaryText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 15, color: '#fff' },
  sent: { fontFamily: ZuriFonts.bodyMedium, fontSize: 13, color: UI.success, textAlign: 'center', marginTop: 10 },
  hItem: { paddingVertical: 12 },
  hHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hTitle: { flex: 1, fontFamily: ZuriFonts.bodyMedium, fontSize: 15, color: UI.ink },
  hMeta: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 2 },
  hBody: { fontFamily: ZuriFonts.bodyRegular, fontSize: 14, lineHeight: 20, color: UI.inkSoft, marginTop: 6 },
});

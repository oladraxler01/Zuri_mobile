import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { Button, Card, Chip, StateView, Text, TextField, makeStyles } from '@/theme';
import { ScreenShell } from '@/components/dashboard';
import { useAcademic } from '@/context/academic-context';
import { useSession } from '@/context/session-context';
import { ClassmatesUnavailable, KIND_LABEL, createRequest, type RequestKind } from '@/services/classmates-api';

const KINDS: RequestKind[] = ['lecture_notes', 'material', 'past_questions', 'other'];

/** The last 7 days as chips, plus "Not sure". */
function recentDays(): { key: string; label: string }[] {
  const days: { key: string; label: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
    days.push({ key, label });
  }
  return days;
}

/** Ask classmates for notes, a material or past questions (POST /classmates/requests). */
export default function NewClassmateRequestScreen() {
  const styles = useStyles();
  const params = useLocalSearchParams<{ courseId?: string; topic?: string }>();
  const { state } = useAcademic();
  const { user } = useSession();
  const days = useMemo(() => recentDays(), []);

  const [courseId, setCourseId] = useState(params.courseId || state.courses[0]?.id || '');
  const [kind, setKind] = useState<RequestKind>('lecture_notes');
  const [date, setDate] = useState<string>(days[1].key);
  const [topic, setTopic] = useState(params.topic ?? '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [unavailable, setUnavailable] = useState(false);

  const course = state.courses.find((c) => c.id === courseId);
  const profileMissing = !state.department.trim() || !state.level;

  const send = async () => {
    if (busy) return;
    if (!course) return setError('Pick the course.');
    if (message.trim().length < 5) return setError('Say briefly what you need, for example which part you missed.');
    setBusy(true);
    setError('');
    try {
      const req = await createRequest({
        course_code: course.code,
        course_title: course.title,
        kind,
        ...(kind === 'lecture_notes' && date ? { lecture_date: date } : {}),
        ...(topic.trim() ? { topic: topic.trim().slice(0, 200) } : {}),
        message: message.trim().slice(0, 500),
      });
      router.replace({ pathname: '/classmates/[id]', params: { id: req.id } } as any);
    } catch (e) {
      if (e instanceof ClassmatesUnavailable) setUnavailable(true);
      else setError(e instanceof Error ? e.message : 'Couldn’t send your request. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <ScreenShell back eyebrow="CLASSMATES" title="Ask for notes" edges={['top', 'bottom']}>
        <StateView kind="empty" icon="people-outline" title="Sign in first" body="Sign in to ask your classmates." />
      </ScreenShell>
    );
  }

  if (unavailable) {
    return (
      <ScreenShell back eyebrow="CLASSMATES" title="Ask for notes" edges={['top', 'bottom']}>
        <StateView
          kind="empty"
          icon="time-outline"
          title="Coming soon"
          body="Sharing with classmates isn’t switched on yet, so your request wasn’t sent."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell back eyebrow="CLASSMATES" title="Ask for notes" edges={['top', 'bottom']}>
      {profileMissing && (
        <Card eyebrow="ONE THING FIRST" body="Add your department and level so Zuri knows who your classmates are.">
          <Button size="sm" variant="secondary" label="Complete profile" onPress={() => router.push('/profile/academic' as Href)} />
        </Card>
      )}

      {state.courses.length === 0 ? (
        <StateView kind="empty" icon="book-outline" title="Add a course first" body="Requests go to classmates taking the same course." />
      ) : (
        <View style={styles.form}>
          <View style={styles.group}>
            <Text variant="subhead">Course</Text>
            <View style={styles.chips}>
              {state.courses.map((c) => (
                <Chip key={c.id} label={c.code} selected={courseId === c.id} role="radio" onPress={() => setCourseId(c.id)} />
              ))}
            </View>
          </View>

          <View style={styles.group}>
            <Text variant="subhead">What do you need?</Text>
            <View style={styles.chips}>
              {KINDS.map((k) => (
                <Chip key={k} label={KIND_LABEL[k]} selected={kind === k} role="radio" onPress={() => setKind(k)} />
              ))}
            </View>
          </View>

          {kind === 'lecture_notes' && (
            <View style={styles.group}>
              <Text variant="subhead">Which lecture?</Text>
              <View style={styles.chips}>
                {days.map((d) => (
                  <Chip key={d.key} label={d.label} selected={date === d.key} role="radio" onPress={() => setDate(d.key)} />
                ))}
                <Chip label="Not sure" selected={date === ''} role="radio" onPress={() => setDate('')} />
              </View>
            </View>
          )}

          <TextField
            label="Topic (optional)"
            value={topic}
            onChangeText={setTopic}
            placeholder="e.g. Recursion and the call stack"
            maxLength={200}
          />
          <TextField
            label="Message"
            value={message}
            onChangeText={setMessage}
            placeholder="e.g. I was sick on Tuesday. Could anyone share their notes?"
            maxLength={500}
            multiline
            help={`${message.length}/500 · Seen by students in your department and level, and anyone taking ${course?.code ?? 'this course'}. They see your first name.`}
          />

          {!!error && (
            <Text variant="footnote" color="danger">
              {error}
            </Text>
          )}
          <Button icon="send-outline" label="Send request" loading={busy} onPress={send} block />
          <Text variant="caption" color="text-subtle">
            You can ask 5 times a day. Requests close after 7 days.
          </Text>
        </View>
      )}
    </ScreenShell>
  );
}

const useStyles = makeStyles(({ space }) => ({
  form: { gap: space[5], marginTop: space[2] },
  group: { gap: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
}));

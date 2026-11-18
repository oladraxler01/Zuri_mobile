import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Alert, ActivityIndicator, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, StateView, Text, TextField, makeStyles, useTheme } from '@/theme';
import { ScreenShell } from '@/components/dashboard';
import { useLectures } from '@/context/lectures-context';
import { useMaterials } from '@/context/materials-context';
import { SharedContent } from '@/components/classmates/shared-content';
import {
  ClassmatesUnavailable,
  KIND_LABEL,
  closeRequest,
  getRequest,
  reportShare,
  shareLecture,
  shareMaterial,
  thankShare,
  type ClassmateRequest,
  type ClassmateShare,
} from '@/services/classmates-api';

type Pick = { kind: 'lecture' | 'material'; id: string } | null;

const sameCourse = (a?: string, b?: string) => !!a && !!b && a.replace(/\s+/g, '').toLowerCase() === b.replace(/\s+/g, '').toLowerCase();

/** One request: the requester sees what was shared; everyone else can share a lecture or a material. */
export default function ClassmateRequestScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [req, setReq] = useState<ClassmateRequest | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'unavailable' | 'error'>('loading');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setReq(await getRequest(id));
      setState('ok');
    } catch (e) {
      if (e instanceof ClassmatesUnavailable) setState('unavailable');
      else {
        setState('error');
        setError(e instanceof Error ? e.message : 'Couldn’t load this request.');
      }
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScreenShell back eyebrow="CLASSMATES" title={req ? req.course_code : 'Request'} edges={['top', 'bottom']}>
      {state === 'loading' ? (
        <ActivityIndicator color={colors.text} style={styles.loading} />
      ) : state === 'unavailable' ? (
        <StateView kind="empty" icon="time-outline" title="Coming soon" body="Sharing with classmates isn’t switched on yet." />
      ) : state === 'error' || !req ? (
        <StateView kind="error" body={error || 'Couldn’t load this request.'} actionLabel="Try again" onAction={load} />
      ) : (
        <>
          <RequestSummary req={req} />
          {req.is_mine ? <MyRequest req={req} onChange={load} /> : <HelpClassmate req={req} onShared={load} />}
        </>
      )}
    </ScreenShell>
  );
}

function RequestSummary({ req }: { req: ClassmateRequest }) {
  const styles = useStyles();
  const who = req.is_mine
    ? 'You asked'
    : `${req.requester.first_name}${req.requester.department ? ` · ${req.requester.department}` : ''}${req.requester.academic_level ? ` · ${req.requester.academic_level}` : ''}`;
  const status = req.status === 'open' ? 'Open' : req.status === 'fulfilled' ? 'Got what they needed' : 'Closed';
  return (
    <Card eyebrow={KIND_LABEL[req.kind].toUpperCase()} title={req.topic || req.course_title || req.course_code}>
      <View style={styles.summary}>
        <Text variant="callout">“{req.message}”</Text>
        <Text variant="caption" color="text-subtle">
          {[
            who,
            req.lecture_date ? `Lecture on ${new Date(req.lecture_date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}` : '',
            status,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
    </Card>
  );
}

// ─── The requester's view ────────────────────────────────────────

function MyRequest({ req, onChange }: { req: ClassmateRequest; onChange: () => void }) {
  const styles = useStyles();
  const [busy, setBusy] = useState(false);
  const shares = req.shares ?? [];

  const close = (fulfilled: boolean) => {
    setBusy(true);
    closeRequest(req.id, fulfilled)
      .then(onChange)
      .catch((e) => Alert.alert('Couldn’t update the request', e instanceof Error ? e.message : 'Please try again.'))
      .finally(() => setBusy(false));
  };

  return (
    <View style={styles.section}>
      <Text variant="headline">{shares.length ? `Shared with you (${shares.length})` : 'Nothing shared yet'}</Text>
      {shares.length === 0 && (
        <Text variant="footnote" color="text-muted">
          Your classmates have been asked. You’ll get a notification when someone shares.
        </Text>
      )}
      {shares.map((s) => (
        <ShareCard key={s.id} share={s} onChange={onChange} />
      ))}
      {req.status === 'open' && (
        <View style={styles.actions}>
          {shares.length > 0 && <Button icon="checkmark-circle-outline" label="I got what I needed" loading={busy} onPress={() => close(true)} block />}
          <Button variant="secondary" label="Close request" onPress={() => close(false)} block />
        </View>
      )}
    </View>
  );
}

function ShareCard({ share, onChange }: { share: ClassmateShare; onChange: () => void }) {
  const styles = useStyles();
  const [thanked, setThanked] = useState(share.thanked);

  const thank = () => {
    setThanked(true);
    thankShare(share.id).catch(() => setThanked(false));
  };

  const report = () =>
    Alert.alert('Report this share?', 'Zuri hides it and your university’s team reviews it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Off-topic or wrong',
        onPress: () => reportShare(share.id, 'off_topic').then(onChange).catch(() => {}),
      },
      {
        text: 'Inappropriate',
        style: 'destructive',
        onPress: () => reportShare(share.id, 'inappropriate').then(onChange).catch(() => {}),
      },
    ]);

  return (
    <Card eyebrow={`FROM ${share.sharer.first_name.toUpperCase()}`}>
      {!!share.message && (
        <Text variant="footnote" color="text-muted" style={styles.quote}>
          “{share.message}”
        </Text>
      )}
      <SharedContent share={share} />
      <View style={styles.cardActions}>
        <Button
          size="sm"
          variant={thanked ? 'secondary' : 'tonal'}
          icon={thanked ? 'heart' : 'heart-outline'}
          label={thanked ? 'Thanked' : `Thank ${share.sharer.first_name}`}
          disabled={thanked}
          onPress={thank}
        />
        <Button size="sm" variant="text" label="Report" onPress={report} />
      </View>
    </Card>
  );
}

// ─── A classmate's view: share something ─────────────────────────

function HelpClassmate({ req, onShared }: { req: ClassmateRequest; onShared: () => void }) {
  const styles = useStyles();
  const { colors, size } = useTheme();
  const { lectures } = useLectures();
  const { materials } = useMaterials();
  const [pick, setPick] = useState<Pick>(null);
  const [showAll, setShowAll] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const myLectures = useMemo(
    () =>
      lectures
        .filter((l) => l.status === 'ready' && l.analysis && l.analysis.source === 'server')
        .filter((l) => showAll || sameCourse(l.courseCode, req.course_code))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [lectures, showAll, req.course_code]
  );
  const myMaterials = useMemo(
    () =>
      materials
        .filter((m) => m.status === 'ready' && m.serverId && m.analysis?.source === 'server')
        .filter((m) => showAll || sameCourse(m.courseCode, req.course_code)),
    [materials, showAll, req.course_code]
  );

  if (req.i_shared) {
    return (
      <Card eyebrow="THANK YOU" body={`You shared with ${req.requester.first_name}. Helping classmates helps you remember it too.`} />
    );
  }
  if (req.status !== 'open') {
    return <StateView kind="empty" icon="lock-closed-outline" title="This request is closed" body="It no longer takes new shares." />;
  }

  const send = async () => {
    if (!pick || busy) return;
    setBusy(true);
    setError('');
    try {
      if (pick.kind === 'lecture') {
        const lecture = lectures.find((l) => l.id === pick.id);
        if (!lecture) throw new Error('That lecture is no longer on this phone.');
        await shareLecture(req.id, lecture, message);
      } else {
        const material = materials.find((m) => m.id === pick.id);
        if (!material?.serverId) throw new Error('That material isn’t on your account.');
        await shareMaterial(req.id, material.serverId, message);
      }
      onShared();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t share it. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const Option = ({ kind, id, title, meta }: { kind: 'lecture' | 'material'; id: string; title: string; meta: string }) => {
    const on = pick?.kind === kind && pick.id === id;
    return (
      <Pressable
        onPress={() => setPick(on ? null : { kind, id })}
        style={[styles.option, on && styles.optionOn]}
        accessibilityRole="radio"
        accessibilityState={{ checked: on }}
        accessibilityLabel={`${title}. ${meta}`}
      >
        <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={size['icon-md']} color={on ? colors.primary : colors['text-subtle']} />
        <Ionicons name={kind === 'lecture' ? 'mic-outline' : 'document-text-outline'} size={size['icon-md']} color={colors.text} />
        <View style={styles.optionText}>
          <Text variant="subhead">{title}</Text>
          <Text variant="caption" color="text-subtle">
            {meta}
          </Text>
        </View>
      </Pressable>
    );
  };

  const nothing = myLectures.length === 0 && myMaterials.length === 0;
  return (
    <View style={styles.section}>
      <Text variant="headline">Can you help {req.requester.first_name}?</Text>
      <Text variant="footnote" color="text-muted">
        Pick something to share. For lectures, Zuri shares your summary, key points, notes and flashcards, not your recording.
      </Text>

      {nothing ? (
        <StateView
          kind="empty"
          icon="folder-open-outline"
          title={showAll ? 'Nothing to share yet' : `Nothing for ${req.course_code} yet`}
          body={showAll ? 'Lectures and materials that Zuri has processed appear here.' : 'Show everything you have if it’s saved under another course.'}
          actionLabel={showAll ? undefined : 'Show all my lectures and materials'}
          onAction={showAll ? undefined : () => setShowAll(true)}
        />
      ) : (
        <View style={styles.options}>
          {myLectures.map((l) => (
            <Option
              key={l.id}
              kind="lecture"
              id={l.id}
              title={l.analysis!.title || `${l.courseCode} lecture`}
              meta={`${l.courseCode} lecture · ${new Date(l.createdAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}`}
            />
          ))}
          {myMaterials.map((m) => (
            <Option key={m.id} kind="material" id={m.id} title={m.analysis?.title ?? m.name} meta={`${m.courseCode ? `${m.courseCode} · ` : ''}Material`} />
          ))}
          {!showAll && <Button variant="text" size="sm" label="Show everything I have" onPress={() => setShowAll(true)} />}
        </View>
      )}

      {pick && (
        <TextField label="Message (optional)" value={message} onChangeText={setMessage} placeholder="e.g. Hope this helps!" maxLength={300} />
      )}
      {!!error && (
        <Text variant="footnote" color="danger">
          {error}
        </Text>
      )}
      <Button icon="share-outline" label={`Share with ${req.requester.first_name}`} disabled={!pick} loading={busy} onPress={send} block />
    </View>
  );
}

const useStyles = makeStyles(({ colors, space, radius, size }) => ({
  loading: { marginVertical: space[8] },
  summary: { gap: space[2] },
  section: { gap: space[3], marginTop: space[4] },
  actions: { gap: space[2], marginTop: space[2] },
  quote: { marginBottom: space[2] },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[3] },
  options: { gap: space[2] },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: size['touch-target'],
    padding: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors['surface-raised'],
  },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.tint },
  optionText: { flex: 1, gap: space[1] },
}));

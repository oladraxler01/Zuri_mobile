import React, { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import type { Href } from 'expo-router';
import { Button, Card, Chip, ListGroup, ListRow, StateView, Text, makeStyles, useTheme } from '@/theme';
import { ScreenShell } from '@/components/dashboard';
import { useSession } from '@/context/session-context';
import { useNetwork } from '@/context/network-context';
import { SharedContent } from '@/components/classmates/shared-content';
import {
  ClassmatesUnavailable,
  KIND_LABEL,
  listRequests,
  listSharedWithMe,
  type ClassmateRequest,
  type ClassmateShare,
} from '@/services/classmates-api';

type Tab = 'cohort' | 'mine' | 'shared';

const TABS: { key: Tab; label: string }[] = [
  { key: 'cohort', label: 'Classmates need' },
  { key: 'mine', label: 'My requests' },
  { key: 'shared', label: 'Shared with me' },
];

/** "Ask classmates": requests from your department and level, your own requests, and what's been shared with you. */
export default function ClassmatesScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { user } = useSession();
  const { isOnline } = useNetwork();
  const [tab, setTab] = useState<Tab>('cohort');
  const [requests, setRequests] = useState<ClassmateRequest[] | null>(null);
  const [shared, setShared] = useState<ClassmateShare[] | null>(null);
  const [state, setState] = useState<'ok' | 'unavailable' | 'error'>('ok');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setError('');
    try {
      if (tab === 'shared') setShared(await listSharedWithMe());
      else setRequests(await listRequests(tab));
      setState('ok');
    } catch (e) {
      if (e instanceof ClassmatesUnavailable) setState('unavailable');
      else {
        setState('error');
        setError(e instanceof Error ? e.message : 'Couldn’t load this. Please try again.');
      }
    }
  }, [user, tab]);

  // Show a spinner while switching tabs.
  useEffect(() => {
    setRequests(null);
    setShared(null);
  }, [tab]);

  // Loads on open, on tab change, and when coming back from a request (fresh counts and statuses).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const ask = () => router.push('/classmates/new' as Href);

  return (
    <ScreenShell back eyebrow="CLASSMATES" title="Ask classmates" edges={['top', 'bottom']}>
      <Text variant="callout" color="text-muted">
        Missed a lecture? Ask students in your department and level for their notes, or help someone who missed one.
      </Text>

      {!user ? (
        <StateView kind="empty" icon="people-outline" title="Sign in first" body="Sign in to ask classmates or share with them." />
      ) : !isOnline ? (
        <StateView kind="offline" body="You’re offline. Requests and shared notes load when you’re back online." />
      ) : state === 'unavailable' ? (
        <StateView
          kind="empty"
          icon="time-outline"
          title="Coming soon"
          body="Sharing with classmates isn’t switched on yet. Your notes, lectures and materials still work as usual."
        />
      ) : (
        <>
          <Button icon="hand-left-outline" label="Ask for notes" onPress={ask} block />

          <View style={styles.tabs} accessibilityRole="tablist">
            {TABS.map((t) => (
              <Chip key={t.key} label={t.label} selected={tab === t.key} role="radio" onPress={() => setTab(t.key)} />
            ))}
          </View>

          {state === 'error' ? (
            <StateView kind="error" body={error} actionLabel="Try again" onAction={load} />
          ) : tab === 'shared' ? (
            shared === null ? (
              <ActivityIndicator color={colors.text} style={styles.loading} />
            ) : shared.length === 0 ? (
              <StateView kind="empty" icon="gift-outline" title="Nothing shared yet" body="When a classmate shares notes or a material with you, it appears here." />
            ) : (
              <View style={styles.list}>
                {shared.map((s) => (
                  <Card key={s.id} eyebrow={`FROM ${s.sharer.first_name.toUpperCase()}${s.request ? ` · ${s.request.course_code}` : ''}`}>
                    {!!s.message && (
                      <Text variant="footnote" color="text-muted" style={styles.message}>
                        “{s.message}”
                      </Text>
                    )}
                    <SharedContent share={s} />
                  </Card>
                ))}
              </View>
            )
          ) : requests === null ? (
            <ActivityIndicator color={colors.text} style={styles.loading} />
          ) : requests.length === 0 ? (
            tab === 'cohort' ? (
              <StateView kind="empty" icon="people-outline" title="No requests right now" body="When someone in your department and level asks for notes, it shows up here." />
            ) : (
              <StateView kind="empty" icon="hand-left-outline" title="You haven’t asked yet" body="Missed a lecture? Ask your classmates for their notes." actionLabel="Ask for notes" onAction={ask} />
            )
          ) : (
            <ListGroup>
              {requests.map((r) => (
                <ListRow
                  key={r.id}
                  icon={r.kind === 'material' ? 'document-text-outline' : r.kind === 'past_questions' ? 'help-circle-outline' : 'mic-outline'}
                  title={`${r.course_code} · ${r.topic || KIND_LABEL[r.kind]}`}
                  meta={describe(r)}
                  onPress={() => router.push({ pathname: '/classmates/[id]', params: { id: r.id } } as any)}
                />
              ))}
            </ListGroup>
          )}
        </>
      )}
      {user && state === 'ok' && (
        <Button variant="text" size="sm" icon="refresh-outline" label={refreshing ? 'Refreshing…' : 'Refresh'} onPress={refresh} />
      )}
    </ScreenShell>
  );
}

function describe(r: ClassmateRequest): string {
  const who = r.is_mine ? 'You' : r.requester.first_name;
  const when = r.lecture_date ? `lecture on ${new Date(r.lecture_date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}` : '';
  const status =
    r.status === 'open'
      ? r.share_count
        ? `${r.share_count} shared`
        : r.i_shared
          ? 'You shared'
          : 'Open'
      : r.status === 'fulfilled'
        ? 'Got it'
        : 'Closed';
  return [who, KIND_LABEL[r.kind], when, status].filter(Boolean).join(' · ');
}

const useStyles = makeStyles(({ space }) => ({
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginVertical: space[2] },
  list: { gap: space[3] },
  loading: { marginVertical: space[6] },
  message: { marginBottom: space[2] },
}));

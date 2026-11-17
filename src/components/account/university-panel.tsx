import React, { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Text, useTheme } from '@/theme';
import { Panel } from '@/components/dashboard';
import { useSession } from '@/context/session-context';
import { useAcademic } from '@/context/academic-context';
import { ApiError } from '@/services/api-client';
import {
  joinInstitution,
  listMemberships,
  serverInstitutionFor,
  switchInstitution,
  type Membership,
} from '@/services/membership-api';

/**
 * Settings → Connected university: link the student's Zuri account to their
 * university (POST /users/me/memberships as a student, then make it active with
 * /users/me/switch-institution), so university-wide features use the right school.
 */
export function UniversityAccountPanel() {
  const { user } = useSession();
  const { state, syncFromServer } = useAcademic();
  const { colors, space, size } = useTheme();
  const [memberships, setMemberships] = useState<Membership[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const institutionId = serverInstitutionFor(state.university);
  const mine = memberships?.find((m) => m.institution_id === institutionId);

  const load = useCallback(async () => {
    setError('');
    try {
      setMemberships(await listMemberships());
    } catch (e) {
      setMemberships([]);
      setError(e instanceof Error ? e.message : 'Couldn’t load your university link.');
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (!user) {
    return (
      <Panel title="Your university on Zuri">
        <Text variant="footnote" color="text-subtle">
          Sign in to link your account to your university.
        </Text>
      </Panel>
    );
  }

  const connect = async () => {
    if (!institutionId) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      try {
        await joinInstitution(institutionId, state.matricNumber);
      } catch (e) {
        // Already linked: just make it active.
        if (!(e instanceof ApiError && e.status === 409)) throw e;
      }
      await switchInstitution(institutionId);
      await load();
      setMessage(`Your account is linked to ${state.university}.`);
      syncFromServer().catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t link your university. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Your university on Zuri" subtitle="Links your account to your school for university features">
      {memberships === null ? (
        <ActivityIndicator color={colors.text} />
      ) : !institutionId ? (
        <Text variant="footnote" color="text-muted">
          {state.university} isn’t on Zuri yet, so there’s nothing to link. Your courses and notes still work as usual.
        </Text>
      ) : mine ? (
        <View style={{ gap: space[2] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
            <Ionicons name="checkmark-circle" size={size['icon-md']} color={colors.success} />
            <Text variant="subhead">
              Linked to {state.university} as a student{mine.status !== 'active' ? ` (${mine.status})` : ''}
            </Text>
          </View>
          {!!mine.identifier && (
            <Text variant="caption" color="text-subtle">
              Matric number on file: {mine.identifier}
            </Text>
          )}
          {!mine.is_default && (
            <Button variant="secondary" size="sm" label="Make this my main university" loading={busy} onPress={connect} />
          )}
        </View>
      ) : (
        <View style={{ gap: space[3] }}>
          <Text variant="footnote" color="text-muted">
            {state.university} is on Zuri. Link your account as a student{state.matricNumber ? ` with matric number ${state.matricNumber}` : ''}.
          </Text>
          <Button variant="primary" size="sm" icon="link-outline" label={`Link to ${state.university}`} loading={busy} onPress={connect} />
        </View>
      )}
      {!!message && (
        <Text variant="footnote" color="success" style={{ marginTop: space[2] }}>
          {message}
        </Text>
      )}
      {!!error && (
        <Text variant="footnote" color="danger" style={{ marginTop: space[2] }}>
          {error}
        </Text>
      )}
    </Panel>
  );
}

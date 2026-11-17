import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme, lightColors, type } from '@/theme';
import { Panel, Grid, StatTile } from '@/components/dashboard';
import { useSession } from '@/context/session-context';
import { apiRequest } from '@/services/api-client';

/**
 * AI usage and cost for the institution (GET /ai/analytics/costs?institution_id=…,
 * AI service: object not wrapped in { data }).
 */
interface CostSummary {
  institution_id: string;
  total_requests: number;
  total_tokens: number;
  total_cost_usd: number;
  cache_hits: number;
  cache_hit_rate: number;
  estimated_avoided_tokens: number;
}

export function AICostsPanel() {
  const { user } = useSession();
  const { colors, space } = useTheme();
  const [data, setData] = useState<CostSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // Scope to the admin's institution when the account has one.
        const me = await apiRequest<{ data?: { institution_id?: string | null } }>('/users/me');
        const institution = me.data?.institution_id || undefined;
        const res = await apiRequest<CostSummary>('/ai/analytics/costs', {
          query: institution ? { institution_id: institution } : undefined,
        });
        setData(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Couldn’t load AI usage.');
      }
    })();
  }, [user]);

  if (!user) {
    return (
      <Panel title="AI usage and cost" subtitle="From Zuri’s AI service">
        <Text style={[styles.muted, { color: colors['text-subtle'] }]}>Sign in with your institution’s Zuri account to see AI usage.</Text>
      </Panel>
    );
  }

  const n = (v: number) => v.toLocaleString();
  return (
    <Panel
      title="AI usage and cost"
      subtitle={data ? (data.institution_id === 'ALL' ? 'All of Zuri (no institution on this account)' : 'Your institution, all time') : 'From Zuri’s AI service'}
    >
      {error ? (
        <Text style={[styles.muted, { color: colors['text-subtle'] }]}>{error}</Text>
      ) : !data ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <>
          <Grid min={140}>
            <StatTile label="AI requests" value={n(data.total_requests)} icon="sparkles-outline" />
            <StatTile label="Estimated cost" value={`$${data.total_cost_usd.toFixed(2)}`} icon="cash-outline" />
            <StatTile label="Tokens used" value={n(data.total_tokens)} icon="analytics-outline" />
            <StatTile label="Answered from cache" value={`${Math.round(data.cache_hit_rate * 100)}%`} icon="flash-outline" />
          </Grid>
          <Text style={[styles.muted, { color: colors['text-subtle'], marginTop: space[3] }]}>
            Caching saved about {n(data.estimated_avoided_tokens)} tokens ({n(data.cache_hits)} repeated requests answered without calling the AI model).
          </Text>
        </>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  // colour comes from the theme at render time
  muted: { ...type.footnote, color: lightColors['text-subtle'] },
});

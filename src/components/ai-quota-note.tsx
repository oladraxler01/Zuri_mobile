import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useTheme } from '@/theme';
import { resetTimeLabel, useAIQuota } from '@/services/ai-quota';

/**
 * "37 of 50 AI requests left today": shown wherever an action uses Zuri's AI.
 * Hidden until the first AI answer of the day tells us the numbers.
 * Low (≤ 5) shows as a warning with an icon and words, never colour alone.
 */
export function AIQuotaNote({ align = 'center' }: { align?: 'center' | 'left' }) {
  const quota = useAIQuota();
  const { colors, space, size } = useTheme();
  if (!quota) return null;

  const out = quota.remaining <= 0;
  const low = !out && quota.remaining <= 5;
  const text = out
    ? `No AI requests left today. They reset at ${resetTimeLabel()}.`
    : `${quota.remaining} of ${quota.limit} AI requests left today${low ? `, reset at ${resetTimeLabel()}` : ''}`;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[1],
        alignSelf: align === 'center' ? 'center' : 'flex-start',
        paddingVertical: space[1],
      }}
      accessible
      accessibilityLabel={text}
    >
      {(out || low) && <Ionicons name="alert-circle-outline" size={size['icon-sm']} color={colors.warning} />}
      <Text variant="caption" color={out || low ? 'warning' : 'text-subtle'}>
        {text}
      </Text>
    </View>
  );
}

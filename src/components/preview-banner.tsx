import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useTheme } from '@/theme';

/**
 * Marks a deferred app (lecturer, school admin, research) as a preview that
 * runs on sample or phone-only data (roadmap Phase 0). Remove it from an app
 * once that app runs on a real backend (roadmap Phase 8).
 */
export function PreviewBanner({
  message,
  edge = 'none',
  style,
}: {
  message: string;
  /** 'top' adds a hairline above (when it sits on top of the tab bar). */
  edge?: 'top' | 'none';
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, space, size, radius } = useTheme();
  const inline = edge === 'none';
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Preview. ${message}`}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[2],
          paddingHorizontal: space[4],
          paddingVertical: space[2],
          backgroundColor: colors.tint,
        },
        inline ? { borderRadius: radius.md } : { borderTopWidth: 1, borderTopColor: colors.border },
        style,
      ]}
    >
      <Ionicons name="flask-outline" size={size['icon-sm']} color={colors['on-tint']} />
      <Text variant="footnote" color="on-tint" style={{ flex: 1 }}>
        <Text variant="footnote" color="on-tint" style={{ fontFamily: 'Inter_600SemiBold' }}>
          Preview
        </Text>
        {` · ${message}`}
      </Text>
    </View>
  );
}

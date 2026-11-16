import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import type { IoniconName } from '@/types/lecture';

/** Selectable pill used for filters and pickers. */
export function Chip({
  label,
  on,
  onPress,
  icon,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  icon?: IoniconName;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, on && styles.on]}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
    >
      {icon && <Ionicons name={icon} size={14} color={on ? '#fff' : UI.ink} />}
      <Text style={[styles.text, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

/** Small segmented control (2–4 options). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <View style={styles.segment} accessibilityRole="tablist">
      {options.map((o) => (
        <Pressable
          key={o.key}
          onPress={() => onChange(o.key)}
          style={[styles.segItem, value === o.key && styles.segOn]}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === o.key }}
        >
          <Text style={[styles.segText, value === o.key && { color: UI.ink }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: UI.card,
  },
  on: { backgroundColor: UI.ink, borderColor: UI.ink },
  text: { fontFamily: ZuriFonts.labelSmBold, fontSize: 13, color: UI.ink },
  segment: {
    flexDirection: 'row',
    backgroundColor: UI.cardMuted,
    borderRadius: 12,
    padding: 3,
  },
  segItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  segOn: {
    backgroundColor: UI.card,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 13, color: UI.muted },
});

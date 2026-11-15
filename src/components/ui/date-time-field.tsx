import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';

/**
 * Date + time picker that works everywhere:
 * Android → native dialogs, iOS → inline compact pickers, web → typed fields.
 */
export function DateTimeField({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [iosOpen, setIosOpen] = useState<'date' | 'time' | null>(null);

  const setPart = (part: 'date' | 'time', picked: Date) => {
    const next = new Date(value);
    if (part === 'date') next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    else next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
    onChange(next);
  };

  if (Platform.OS === 'web') {
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
    const timeStr = `${pad(value.getHours())}:${pad(value.getMinutes())}`;
    return (
      <View style={styles.row}>
        <TextInput
          style={[styles.field, styles.input]}
          defaultValue={dateStr}
          placeholder="YYYY-MM-DD"
          onEndEditing={(e) => {
            const m = e.nativeEvent.text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (m) setPart('date', new Date(+m[1], +m[2] - 1, +m[3]));
          }}
          onBlur={(e: any) => {
            const m = String(e?.target?.value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (m) setPart('date', new Date(+m[1], +m[2] - 1, +m[3]));
          }}
        />
        <TextInput
          style={[styles.field, styles.input, { flex: 0.7 }]}
          defaultValue={timeStr}
          placeholder="HH:MM"
          onBlur={(e: any) => {
            const m = String(e?.target?.value ?? '').match(/^(\d{1,2}):(\d{2})$/);
            if (m) {
              const d = new Date(value);
              d.setHours(+m[1], +m[2]);
              setPart('time', d);
            }
          }}
        />
      </View>
    );
  }

  const open = (mode: 'date' | 'time') => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode,
        onValueChange: (_e, d) => d && setPart(mode, d),
      });
    } else {
      setIosOpen(iosOpen === mode ? null : mode);
    }
  };

  return (
    <View>
      <View style={styles.row}>
        <Pressable style={styles.field} onPress={() => open('date')} accessibilityRole="button" accessibilityLabel="Change date">
          <Ionicons name="calendar-outline" size={18} color={UI.inkSoft} />
          <Text style={styles.value}>
            {value.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.field, { flex: 0.7 }]}
          onPress={() => open('time')}
          accessibilityRole="button"
          accessibilityLabel="Change time"
        >
          <Ionicons name="time-outline" size={18} color={UI.inkSoft} />
          <Text style={styles.value}>{value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
        </Pressable>
      </View>
      {Platform.OS === 'ios' && iosOpen && (
        <DateTimePicker
          value={value}
          mode={iosOpen}
          display={iosOpen === 'date' ? 'inline' : 'spinner'}
          onValueChange={(_e, d) => setPart(iosOpen, d)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.card,
    paddingHorizontal: 14,
  },
  input: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 15,
    color: UI.ink,
  },
  value: { fontFamily: LexiFonts.bodyMedium, fontSize: 14, color: UI.ink },
});

import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { catalogueFor, type CatalogueCourse } from '@/constants/course-catalogue';
import { makeStyles, useTheme } from '@/theme';

/** Pick courses from the department catalogue for the student's level. */
export function CatalogueSheet({
  visible,
  department,
  level,
  existingCodes,
  onClose,
  onImport,
}: {
  visible: boolean;
  department: string;
  level: string;
  existingCodes: string[];
  onClose: () => void;
  onImport: (courses: CatalogueCourse[]) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const list = catalogueFor(department, level);
  const fresh = list.filter((c) => !existingCodes.includes(c.code));
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) setPicked(new Set(fresh.map((c) => c.code)));
  }, [visible, department, level]);

  const toggle = (code: string) =>
    setPicked((s) => {
      const n = new Set(s);
      n.has(code) ? n.delete(code) : n.add(code);
      return n;
    });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Course catalogue</Text>
              <Text style={styles.sub}>
                {department || 'Your department'} · {level}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          {list.length === 0 ? (
            <Text style={styles.empty}>
              No catalogue for {department || 'this department'} at {level} yet. Add your courses manually; the official catalogue
              arrives when your university connects its records.
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 420 }}>
              {list.map((c) => {
                const already = existingCodes.includes(c.code);
                const on = already || picked.has(c.code);
                return (
                  <Pressable
                    key={c.code}
                    style={[styles.row, already && { opacity: 0.5 }]}
                    disabled={already}
                    onPress={() => toggle(c.code)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on, disabled: already }}
                  >
                    <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? colors.success : colors['text-subtle']} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.code}>
                        {c.code} · {c.units} units
                      </Text>
                      <Text style={styles.courseTitle}>{c.title}</Text>
                      {already && <Text style={styles.added}>Already added</Text>}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <Pressable
            style={[styles.primary, picked.size === 0 && { opacity: 0.4 }]}
            disabled={picked.size === 0}
            onPress={() => {
              onImport(fresh.filter((c) => picked.has(c.code)));
              onClose();
            }}
          >
            <Text style={styles.primaryText}>
              Add {picked.size} {picked.size === 1 ? 'course' : 'courses'}
            </Text>
          </Pressable>
          <Text style={styles.note}>Sample catalogue until your university’s records are connected.</Text>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t.colors.surface, borderTopLeftRadius: t.radius.lg, borderTopRightRadius: t.radius.lg, padding: 22, paddingBottom: 32 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  title: { ...t.type['title-2'], color: t.colors.text },
  sub: { ...t.type.footnote, color: t.colors['text-subtle'], marginTop: 2 },
  empty: { ...t.type.callout, color: t.colors['text-muted'], marginVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: t.colors.border },
  code: { ...t.type.caption, letterSpacing: 0.8, color: t.colors['accent-text'] },
  courseTitle: { ...t.type.subhead, color: t.colors.text, marginTop: 2 },
  added: { ...t.type.caption, color: t.colors['text-subtle'] },
  primary: { height: 52, borderRadius: t.radius.full, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  primaryText: { ...t.type.subhead, color: t.colors['on-primary'] },
  note: { ...t.type.caption, color: t.colors['text-subtle'], textAlign: 'center', marginTop: 8 },
}));

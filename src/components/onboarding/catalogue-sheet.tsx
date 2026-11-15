import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { catalogueFor, type CatalogueCourse } from '@/constants/course-catalogue';

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
              <Ionicons name="close" size={24} color={UI.ink} />
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
                    <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? UI.success : UI.muted} />
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

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: UI.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 32 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  title: { fontFamily: LexiFonts.headlineMd, fontSize: 21, color: UI.ink },
  sub: { fontFamily: LexiFonts.bodyRegular, fontSize: 13, color: UI.muted, marginTop: 2 },
  empty: { fontFamily: LexiFonts.bodyRegular, fontSize: 14, lineHeight: 21, color: UI.inkSoft, marginVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: UI.borderSoft },
  code: { fontFamily: LexiFonts.labelSmBold, fontSize: 11, letterSpacing: 0.8, color: UI.amber },
  courseTitle: { fontFamily: LexiFonts.bodyMedium, fontSize: 15, color: UI.ink, marginTop: 2 },
  added: { fontFamily: LexiFonts.bodyRegular, fontSize: 12, color: UI.muted },
  primary: { height: 52, borderRadius: 26, backgroundColor: UI.ink, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  primaryText: { fontFamily: LexiFonts.labelSmBold, fontSize: 15, color: '#fff' },
  note: { fontFamily: LexiFonts.bodyRegular, fontSize: 11, color: UI.muted, textAlign: 'center', marginTop: 8 },
});

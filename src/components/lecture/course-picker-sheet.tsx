import React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CourseItem } from '@/context/academic-context';
import { Button, Text, makeStyles, useTheme } from '@/theme';

/** Put a lecture (e.g. a quick recording) into one of the student's courses. */
export function CoursePickerSheet({
  visible,
  courses,
  currentId,
  onPick,
  onAddCourse,
  onClose,
}: {
  visible: boolean;
  courses: CourseItem[];
  currentId?: string;
  onPick: (course: CourseItem) => void;
  onAddCourse: () => void;
  onClose: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Modal statusBarTranslucent navigationBarTranslucent visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={styles.sheet} onPress={() => {}} accessible={false}>
          <View style={styles.header}>
            <Text variant="title-2">Which course is this?</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          {courses.length === 0 ? (
            <Text variant="callout" color="text-muted">
              You haven’t added any courses yet. Add one, then come back to sort this lecture.
            </Text>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {courses.map((c) => {
                const on = c.id === currentId;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => onPick(c)}
                    style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && styles.pressed]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`${c.code}, ${c.title}`}
                  >
                    <View style={styles.flex}>
                      <Text variant="headline">{c.code}</Text>
                      <Text variant="footnote" color="text-muted" numberOfLines={1}>
                        {c.title}
                      </Text>
                    </View>
                    {on ? <Ionicons name="checkmark-circle" size={20} color={colors.text} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          <Button variant="secondary" icon="add" label="Add a course" onPress={onAddCourse} block />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: t.colors.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: t.colors['surface-raised'],
    borderTopLeftRadius: t.radius.xl,
    borderTopRightRadius: t.radius.xl,
    padding: t.space[5],
    paddingBottom: t.space[8],
    gap: t.space[4],
    maxHeight: '80%',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  list: { flexGrow: 0 },
  listContent: { gap: t.space[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3],
    minHeight: t.size['touch-target'],
    paddingVertical: t.space[3],
    paddingHorizontal: t.space[4],
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  rowOn: { backgroundColor: t.colors.tint, borderColor: t.colors.tint },
  pressed: { opacity: 0.7 },
}));

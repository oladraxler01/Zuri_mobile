import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';

interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Bottom-sheet confirmation. Used instead of Alert because Alert buttons don't work on web. */
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.confirm,
              destructive && styles.confirmDestructive,
              pressed && styles.pressed,
            ]}
            onPress={onConfirm}
            accessibilityRole="button"
          >
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
            onPress={onCancel}
            accessibilityRole="button"
          >
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: UI.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    gap: 10,
  },
  title: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 22,
    color: UI.ink,
  },
  message: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
    color: UI.inkSoft,
    marginBottom: 10,
  },
  confirm: {
    height: 52,
    borderRadius: 26,
    backgroundColor: UI.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDestructive: {
    backgroundColor: UI.error,
  },
  confirmText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 15,
    color: '#fff',
  },
  cancel: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 15,
    color: UI.ink,
  },
  pressed: {
    opacity: 0.85,
  },
});

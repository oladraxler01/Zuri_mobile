import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';

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

/** How long the Modal's fade-out takes (Android has no onDismiss to tell us). */
const CLOSE_MS = Platform.OS === 'web' ? 0 : 320;

/**
 * Bottom-sheet confirmation. Used instead of Alert because Alert buttons don't work on web.
 *
 * The confirm action runs only after the sheet has finished closing. Confirm actions often
 * leave the screen or delete what it shows; doing that while the Modal is still fading out
 * leaves its grey backdrop stuck on Android, and can crash the app.
 */
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
  const [closing, setClosing] = useState(false);
  const pending = useRef<(() => void) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ready again the next time the sheet is opened.
  useEffect(() => {
    if (!visible) setClosing(false);
  }, [visible]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const runPending = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const action = pending.current;
    pending.current = null;
    action?.();
  };

  const confirm = () => {
    if (closing) return; // a second tap while closing does nothing
    pending.current = onConfirm;
    setClosing(true);
    // iOS calls onDismiss when the sheet is gone; the timer covers Android and web.
    timer.current = setTimeout(runPending, Platform.OS === 'ios' ? CLOSE_MS * 2 : CLOSE_MS);
  };

  return (
    <Modal
      visible={visible && !closing}
      transparent
      animationType="fade"
      onRequestClose={closing ? () => {} : onCancel}
      onDismiss={Platform.OS === 'ios' ? runPending : undefined}
    >
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
            onPress={confirm}
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
    fontFamily: ZuriFonts.headlineMd,
    fontSize: 22,
    color: UI.ink,
  },
  message: {
    fontFamily: ZuriFonts.bodyRegular,
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
    fontFamily: ZuriFonts.labelSmBold,
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
    fontFamily: ZuriFonts.labelSmBold,
    fontSize: 15,
    color: UI.ink,
  },
  pressed: {
    opacity: 0.85,
  },
});

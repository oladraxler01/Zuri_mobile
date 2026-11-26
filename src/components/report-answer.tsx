import React, { useState } from 'react';
import { Modal, View, Text, Pressable, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { REPORT_REASONS, reportAiAnswer, type ReportReason, type ReportSurface } from '@/services/report-api';

/**
 * A small "Report" link under an AI answer. Opens a sheet to pick a reason and
 * add a note, then sends it to the server. The answer itself stays on screen.
 */
export function ReportAnswer({ text, surface, refId }: { text: string; surface: ReportSurface; refId?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  if (!text.trim()) return null;

  const close = () => {
    setOpen(false);
    setError('');
  };

  const send = async () => {
    if (!reason || busy) return;
    setBusy(true);
    setError('');
    try {
      await reportAiAnswer({ surface, reason, text, ref: refId, note });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That didn’t send. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => (sent ? undefined : setOpen(true))}
        style={styles.link}
        accessibilityRole="button"
        accessibilityLabel={sent ? 'Answer reported' : 'Report this answer'}
        hitSlop={8}
      >
        <Ionicons name={sent ? 'checkmark' : 'flag-outline'} size={13} color={UI.muted} />
        <Text style={styles.linkText}>{sent ? 'Reported' : 'Report'}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {sent ? (
              <>
                <Text style={styles.title}>Thanks for telling us</Text>
                <Text style={styles.message}>
                  We’ll review this answer. AI can make mistakes, so check important facts against your notes.
                </Text>
                <Pressable style={styles.primary} onPress={close} accessibilityRole="button">
                  <Text style={styles.primaryText}>Done</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.title}>Report this answer</Text>
                <Text style={styles.message}>What’s the problem?</Text>
                <View style={styles.reasons}>
                  {REPORT_REASONS.map((r) => (
                    <Pressable
                      key={r.value}
                      onPress={() => setReason(r.value)}
                      style={[styles.reason, reason === r.value && styles.reasonOn]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: reason === r.value }}
                    >
                      <Text style={[styles.reasonText, reason === r.value && styles.reasonTextOn]}>{r.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  style={styles.input}
                  value={note}
                  onChangeText={setNote}
                  placeholder="Tell us more (optional)"
                  placeholderTextColor={UI.muted}
                  multiline
                  maxLength={1000}
                />
                {!!error && <Text style={styles.error}>{error}</Text>}
                <Pressable
                  style={[styles.primary, (!reason || busy) && styles.disabled]}
                  onPress={send}
                  disabled={!reason || busy}
                  accessibilityRole="button"
                >
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Send report</Text>}
                </Pressable>
                <Pressable style={styles.cancel} onPress={close} accessibilityRole="button">
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 8, minHeight: 24 },
  linkText: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: UI.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, gap: 10 },
  title: { fontFamily: ZuriFonts.headlineMd, fontSize: 22, color: UI.ink },
  message: { fontFamily: ZuriFonts.bodyRegular, fontSize: 15, lineHeight: 22, color: UI.inkSoft },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 4 },
  reason: { paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', borderRadius: 20, borderWidth: 1, borderColor: UI.border },
  reasonOn: { backgroundColor: UI.ink, borderColor: UI.ink },
  reasonText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 14, color: UI.ink },
  reasonTextOn: { color: '#fff' },
  input: {
    minHeight: 80,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.cardMuted,
    padding: 12,
    fontFamily: ZuriFonts.bodyRegular,
    fontSize: 15,
    color: UI.ink,
    textAlignVertical: 'top',
  },
  error: { fontFamily: ZuriFonts.bodyRegular, fontSize: 13, color: UI.error },
  primary: { height: 52, borderRadius: 26, backgroundColor: UI.ink, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  disabled: { opacity: 0.5 },
  primaryText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 15, color: '#fff' },
  cancel: { height: 52, borderRadius: 26, borderWidth: 1, borderColor: UI.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 15, color: UI.ink },
});

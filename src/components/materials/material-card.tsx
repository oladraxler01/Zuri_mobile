import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { MATERIAL_CATEGORIES, type Material } from '@/types/material';
import type { IoniconName } from '@/types/lecture';

export function fileIcon(m: Pick<Material, 'name' | 'mimeType'>): IoniconName {
  const n = m.name.toLowerCase();
  const t = m.mimeType ?? '';
  if (t.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic)$/.test(n)) return 'image-outline';
  if (t.includes('pdf') || n.endsWith('.pdf')) return 'document-attach-outline';
  if (/\.(pptx?|key)$/.test(n) || t.includes('presentation')) return 'easel-outline';
  if (/\.(docx?|rtf|odt)$/.test(n) || t.includes('word')) return 'document-text-outline';
  if (/\.(txt|md|markdown)$/.test(n) || t.startsWith('text/')) return 'reader-outline';
  return 'document-outline';
}

export function formatSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function categoryLabel(key: Material['category']) {
  return MATERIAL_CATEGORIES.find((c) => c.key === key)?.label ?? 'Other';
}

function StatusLine({ m }: { m: Material }) {
  if (m.status === 'ready') return null;
  const map: Record<string, { text: string; color: string; icon: IoniconName }> = {
    waiting: { text: 'Waiting for internet', color: UI.inkSoft, icon: 'cloud-offline-outline' },
    uploading: { text: `Uploading ${Math.round(Number(m.progress ?? 0) * 100)}%`, color: UI.amber, icon: 'sync' },
    processing: { text: 'Reading the document…', color: UI.amber, icon: 'sync' },
    failed: { text: 'Couldn’t process · tap to retry', color: UI.error, icon: 'alert-circle' },
  };
  const s = map[m.status];
  return (
    <View style={styles.status}>
      <Ionicons name={s.icon} size={12} color={s.color} />
      <Text style={[styles.statusText, { color: s.color }]}>{s.text}</Text>
    </View>
  );
}

export function MaterialCard({ m, showCourse = true }: { m: Material; showCourse?: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => router.push(`/material/${m.id}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={m.analysis?.title ?? m.name}
    >
      <View style={styles.icon}>
        <Ionicons name={fileIcon(m)} size={20} color={UI.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.eyebrow}>
          {showCourse && m.courseCode ? `${m.courseCode} · ` : ''}
          {categoryLabel(m.category).toUpperCase()}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {m.analysis?.title ?? m.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[m.analysis?.title ? m.name : '', formatSize(m.sizeBytes)].filter(Boolean).join(' · ')}
        </Text>
        <StatusLine m={m} />
      </View>
      {m.pinned && <Ionicons name="bookmark" size={16} color={UI.amber} />}
      {m.visibility === 'course' && <Ionicons name="people-outline" size={16} color={UI.muted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 16,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  icon: {
    width: 42,
    height: 48,
    borderRadius: 10,
    backgroundColor: UI.amberSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  eyebrow: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, letterSpacing: 0.8, color: UI.amber, marginBottom: 2 },
  title: { fontFamily: ZuriFonts.bodyMedium, fontSize: 15, lineHeight: 21, color: UI.ink },
  meta: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 2 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  statusText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11 },
});

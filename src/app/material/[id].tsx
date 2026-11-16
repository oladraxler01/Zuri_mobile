import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, StatusBar, Platform, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useMaterials } from '@/context/materials-context';
import { useAcademic } from '@/context/academic-context';
import { categoryLabel, fileIcon, formatSize } from '@/components/materials/material-card';
import { QuizTab } from '@/components/lecture/quiz-tab';
import { Chip, Segmented } from '@/components/ui/chip';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { StateView } from '@/components/states/state-view';
import { useProgress } from '@/context/progress-context';
import { conceptForQuestion } from '@/utils/mastery';
import { MATERIAL_CATEGORIES, type Material } from '@/types/material';
import { formatLectureDate } from '@/utils/time';

type Tab = 'summary' | 'concepts' | 'questions' | 'passages';

export default function MaterialScreen() {
  const params = useLocalSearchParams<{ id: string; tab?: string }>();
  const { getMaterial, loaded, updateMaterial, retryMaterial, deleteMaterial } = useMaterials();
  const { state } = useAcademic();
  const m = getMaterial(params.id);
  const [tab, setTab] = useState<Tab>(
    ['summary', 'concepts', 'questions', 'passages'].includes(params.tab ?? '') ? (params.tab as Tab) : 'summary'
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [openError, setOpenError] = useState('');
  const progress = useProgress();

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/materials' as Href));

  if (!loaded) return <View style={styles.container} />;
  if (!m) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}>
        <StateView icon="trash-outline" title="Not found" message="This material was deleted." primary={{ label: 'Go back', onPress: goBack }} />
      </SafeAreaView>
    );
  }

  const openDocument = async () => {
    setOpenError('');
    try {
      if (Platform.OS === 'web') {
        await Linking.openURL(m.uri);
        return;
      }
      const file = new File(m.uri);
      if (await file.canPreview({ mimeType: m.mimeType })) {
        await file.preview({ title: m.name, mimeType: m.mimeType });
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(m.uri, { mimeType: m.mimeType, dialogTitle: m.name });
      } else {
        setOpenError('No app on this phone can open this file type.');
      }
    } catch {
      setOpenError('This file couldn’t be opened. It may have been removed from the phone.');
    }
  };

  const share = async () => {
    if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
      Sharing.shareAsync(m.uri, { mimeType: m.mimeType, dialogTitle: m.name }).catch(() => {});
    }
  };

  const a = m.analysis;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <Pressable onPress={goBack} hitSlop={10} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={UI.ink} />
        </Pressable>
        <View style={styles.topActions}>
          <Pressable
            onPress={() => updateMaterial(m.id, { pinned: !m.pinned })}
            hitSlop={10}
            accessibilityLabel={m.pinned ? 'Unpin' : 'Pin to top'}
          >
            <Ionicons name={m.pinned ? 'bookmark' : 'bookmark-outline'} size={21} color={m.pinned ? UI.amber : UI.inkSoft} />
          </Pressable>
          <Pressable onPress={() => setConfirmDelete(true)} hitSlop={10} accessibilityLabel="Delete material">
            <Ionicons name="trash-outline" size={20} color={UI.inkSoft} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.bigIcon}>
            <Ionicons name={fileIcon(m)} size={28} color={UI.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>
              {m.courseCode ? `${m.courseCode} · ` : ''}
              {categoryLabel(m.category).toUpperCase()}
            </Text>
            <Text style={styles.title}>{a?.title ?? m.name}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {[m.name, formatSize(m.sizeBytes), formatLectureDate(m.addedAt)].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable style={({ pressed }) => [styles.action, styles.actionPrimary, pressed && styles.pressed]} onPress={openDocument}>
            <Ionicons name="open-outline" size={18} color="#fff" />
            <Text style={[styles.actionText, { color: '#fff' }]}>Open</Text>
          </Pressable>
          {Platform.OS !== 'web' && (
            <Pressable style={({ pressed }) => [styles.action, pressed && styles.pressed]} onPress={share}>
              <Ionicons name="share-outline" size={18} color={UI.ink} />
              <Text style={styles.actionText}>Share</Text>
            </Pressable>
          )}
          {m.status === 'ready' && (
            <Pressable
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              onPress={() => router.push({ pathname: '/ask', params: { materialId: m.id } } as any)}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={UI.ink} />
              <Text style={styles.actionText}>Ask</Text>
            </Pressable>
          )}
        </View>
        {!!openError && <Text style={styles.error}>{openError}</Text>}

        {/* Status */}
        {m.status !== 'ready' || !a ? (
          <StatusBlock m={m} onRetry={() => retryMaterial(m.id)} />
        ) : (
          <>
            {a.source !== 'server' && (
              <View style={styles.banner}>
                <Ionicons name="information-circle-outline" size={18} color={UI.amber} />
                <Text style={styles.bannerText}>
                  {a.source === 'local'
                    ? 'Basic analysis done on your phone from the file’s own text. Fuller results arrive when the document server is connected.'
                    : 'Sample results. The document server isn’t connected yet, so this shows example content. Tap Open to read your actual file.'}
                </Text>
              </View>
            )}

            <Segmented<Tab>
              options={[
                { key: 'summary', label: 'Summary' },
                { key: 'concepts', label: `Concepts${a.concepts.length ? ` ${a.concepts.length}` : ''}` },
                { key: 'questions', label: 'Quiz' },
                { key: 'passages', label: 'Passages' },
              ]}
              value={tab}
              onChange={setTab}
            />

            <View style={{ marginTop: 16 }}>
              {tab === 'summary' && (
                <>
                  <Text style={styles.body}>{a.summary}</Text>
                  <Settings m={m} courses={state.courses} onChange={(patch) => updateMaterial(m.id, patch)} />
                </>
              )}

              {tab === 'concepts' &&
                (a.concepts.length ? (
                  <View style={{ gap: 10 }}>
                    {a.concepts.map((c, i) => (
                      <View key={c.id} style={styles.card}>
                        <Text style={styles.cardTitle}>
                          {i + 1}. {c.title}
                        </Text>
                        {!!c.summary && <Text style={styles.cardBody}>{c.summary}</Text>}
                      </View>
                    ))}
                  </View>
                ) : (
                  <StateView compact icon="bulb-outline" title="No concepts found" message="Add headings (# Heading) to text files to have them listed here." />
                ))}

              {tab === 'questions' && (
                <View style={{ marginHorizontal: -20 }}>
                  {a.questions.length ? (
                    <QuizTab
                      questions={a.questions}
                      onFinish={() => {}}
                      onAnswer={(q, correct) =>
                        progress.log({
                          type: 'quiz-answer',
                          courseId: m.courseId,
                          courseCode: m.courseCode,
                          concept: conceptForQuestion(q, a.concepts),
                          correct,
                          sourceId: m.id,
                          sourceKind: 'material',
                        })
                      }
                    />
                  ) : (
                    <StateView compact icon="help-circle-outline" title="No quiz yet" message="Practice questions are generated once the document server is connected." />
                  )}
                </View>
              )}

              {tab === 'passages' &&
                (a.passages.length ? (
                  <View style={{ gap: 10 }}>
                    {a.passages.map((p) => (
                      <View key={p.id} style={styles.card}>
                        <Text style={styles.passageLoc}>{p.location}</Text>
                        <Text style={styles.cardBody}>{p.text}</Text>
                        <Text style={styles.cite}>
                          {a.title}, {p.location}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <StateView compact icon="reader-outline" title="No passages" message="No readable passages were found in this file." />
                ))}
            </View>
          </>
        )}
      </ScrollView>

      <ConfirmSheet
        visible={confirmDelete}
        title="Delete this material?"
        message="The file and its study notes will be removed from this phone."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          deleteMaterial(m.id);
          goBack();
        }}
      />
    </SafeAreaView>
  );
}

function StatusBlock({ m, onRetry }: { m: Material; onRetry: () => void }) {
  if (m.status === 'failed') {
    return (
      <StateView
        compact
        tone="error"
        icon="alert-circle-outline"
        title="Couldn’t process this file"
        message={`${m.error ?? 'Something went wrong.'} The file is still saved and can be opened.`}
        primary={{ label: 'Try again', icon: 'refresh', onPress: onRetry }}
      />
    );
  }
  if (m.status === 'waiting') {
    return (
      <StateView
        compact
        icon="cloud-offline-outline"
        title="Waiting for internet"
        message="Saved on your phone. It will be processed automatically when you’re back online."
      />
    );
  }
  const pct = Math.round((m.progress ?? 0) * 100);
  return (
    <View style={styles.progressCard}>
      <ActivityIndicator color={UI.amber} />
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{m.status === 'uploading' ? `Uploading · ${pct}%` : 'Reading the document…'}</Text>
        <Text style={styles.cardBody}>Building a summary, key concepts, questions and passages.</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${m.status === 'uploading' ? pct : 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

function Settings({
  m,
  courses,
  onChange,
}: {
  m: Material;
  courses: { id: string; code: string }[];
  onChange: (patch: Partial<Material>) => void;
}) {
  return (
    <View style={styles.settings}>
      <Text style={styles.label}>TYPE</Text>
      <View style={styles.wrap}>
        {MATERIAL_CATEGORIES.map((c) => (
          <Chip key={c.key} label={c.label} on={m.category === c.key} onPress={() => onChange({ category: c.key })} />
        ))}
      </View>
      <Text style={styles.label}>COURSE</Text>
      <View style={styles.wrap}>
        {courses.map((c) => (
          <Chip key={c.id} label={c.code} on={m.courseId === c.id} onPress={() => onChange({ courseId: c.id, courseCode: c.code })} />
        ))}
      </View>
      <Text style={styles.label}>WHO CAN SEE IT</Text>
      <View style={styles.wrap}>
        <Chip label="Only me" icon="lock-closed-outline" on={m.visibility === 'private'} onPress={() => onChange({ visibility: 'private' })} />
        <Chip label="Course classmates" icon="people-outline" on={m.visibility === 'course'} onPress={() => onChange({ visibility: 'course' })} />
      </View>
      <Text style={styles.hint}>Sharing with classmates takes effect once accounts are connected to your university.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },
  topBar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  topActions: { flexDirection: 'row', gap: 20 },
  scroll: { padding: 20, paddingTop: 4, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  bigIcon: { width: 56, height: 66, borderRadius: 12, backgroundColor: UI.amberSoft, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, letterSpacing: 1, color: UI.amber },
  title: { fontFamily: ZuriFonts.headlineLg, fontSize: 24, lineHeight: 30, color: UI.ink, marginTop: 2 },
  meta: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18, marginBottom: 6 },
  action: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionPrimary: { backgroundColor: UI.ink, borderColor: UI.ink },
  actionText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 14, color: UI.ink },
  pressed: { opacity: 0.88 },
  error: { fontFamily: ZuriFonts.bodyMedium, fontSize: 13, color: UI.error, marginTop: 6 },
  banner: { flexDirection: 'row', gap: 10, backgroundColor: UI.amberSoft, borderRadius: 12, padding: 12, marginVertical: 14 },
  bannerText: { flex: 1, fontFamily: ZuriFonts.bodyRegular, fontSize: 13, lineHeight: 19, color: '#6b4511' },
  body: { fontFamily: ZuriFonts.bodyRegular, fontSize: 15, lineHeight: 23, color: UI.inkSoft },
  card: { backgroundColor: UI.card, borderRadius: 14, borderWidth: 1, borderColor: UI.border, padding: 14, gap: 4 },
  cardTitle: { fontFamily: ZuriFonts.bodyMedium, fontSize: 15, color: UI.ink },
  cardBody: { fontFamily: ZuriFonts.bodyRegular, fontSize: 14, lineHeight: 21, color: UI.inkSoft },
  passageLoc: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, letterSpacing: 1, color: UI.amber },
  cite: { fontFamily: ZuriFonts.bodyRegular, fontSize: 11, color: UI.muted, fontStyle: 'italic', marginTop: 4 },
  progressCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 16,
    marginTop: 14,
  },
  track: { height: 4, borderRadius: 2, backgroundColor: UI.cardMuted, overflow: 'hidden', marginTop: 10 },
  fill: { height: '100%', backgroundColor: UI.amber },
  settings: { marginTop: 24, paddingTop: 8, borderTopWidth: 1, borderTopColor: UI.borderSoft },
  label: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, letterSpacing: 1.2, color: UI.muted, marginTop: 16, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 8 },
});

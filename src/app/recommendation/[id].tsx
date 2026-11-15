import React, { useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { useFeed } from '@/context/feed-context';
import { StateView } from '@/components/states/state-view';

const KIND_LABEL: Record<string, string> = {
  gap: 'CONCEPT TO REVISIT',
  exam: 'EXAM PREPARATION',
  deadline: 'DEADLINE',
  'study-today': 'TODAY’S STUDY',
};

/** One recommendation: why it's suggested, what to do, and quick actions. */
export default function RecommendationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, markRead, dismiss, snooze } = useFeed();
  const item = items.find((i) => i.id === id);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as Href));

  useEffect(() => {
    if (item) markRead(item.id);
  }, [item?.id]);

  if (!item || !item.recommendation) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}>
        <StateView
          icon="checkmark-done-outline"
          tone="success"
          title="Nothing to do here"
          message="This suggestion was completed, dismissed, or no longer applies."
          primary={{ label: 'Go back', onPress: goBack }}
        />
      </SafeAreaView>
    );
  }
  const r = item.recommendation;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <Pressable onPress={goBack} hitSlop={10} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={UI.ink} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.icon}>
          <Ionicons name={item.icon} size={26} color={UI.amber} />
        </View>
        <Text style={styles.eyebrow}>{KIND_LABEL[item.kind] ?? 'RECOMMENDATION'}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>

        <Text style={styles.section}>Why you’re seeing this</Text>
        <Text style={styles.body}>{r.why}</Text>

        <Text style={styles.section}>What to do</Text>
        <View style={styles.card}>
          {r.steps.map((s, i) => (
            <View key={s} style={[styles.step, i > 0 && styles.stepBorder]}>
              <Text style={styles.stepNum}>{i + 1}</Text>
              <Text style={styles.stepText}>{s}</Text>
            </View>
          ))}
        </View>

        <View style={{ gap: 10, marginTop: 20 }}>
          {r.actions.map((a, i) => (
            <Pressable
              key={a.label}
              style={({ pressed }) => [i === 0 ? styles.primary : styles.secondary, pressed && { opacity: 0.88 }]}
              onPress={() => router.push(a.href as Href)}
            >
              <Text style={i === 0 ? styles.primaryText : styles.secondaryText}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.later}>
          <Pressable
            onPress={() => {
              snooze(item.id);
              goBack();
            }}
            hitSlop={8}
          >
            <Text style={styles.laterText}>Remind me tomorrow</Text>
          </Pressable>
          <Text style={styles.sep}>·</Text>
          <Pressable
            onPress={() => {
              dismiss(item.id);
              goBack();
            }}
            hitSlop={8}
          >
            <Text style={styles.laterText}>Dismiss</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },
  topBar: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  scroll: { padding: 20, paddingTop: 4, paddingBottom: 48, maxWidth: 600, width: '100%', alignSelf: 'center' },
  icon: { width: 56, height: 56, borderRadius: 16, backgroundColor: UI.amberSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  eyebrow: { fontFamily: LexiFonts.labelSmBold, fontSize: 11, letterSpacing: 1.4, color: UI.amber },
  title: { fontFamily: LexiFonts.headlineLg, fontSize: 26, lineHeight: 32, color: UI.ink, marginTop: 4, marginBottom: 8 },
  body: { fontFamily: LexiFonts.bodyRegular, fontSize: 15, lineHeight: 22, color: UI.inkSoft },
  section: { fontFamily: LexiFonts.headlineMd, fontSize: 18, color: UI.ink, marginTop: 24, marginBottom: 8 },
  card: { backgroundColor: UI.card, borderRadius: 16, borderWidth: 1, borderColor: UI.border, paddingHorizontal: 14 },
  step: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  stepBorder: { borderTopWidth: 1, borderTopColor: UI.borderSoft },
  stepNum: { fontFamily: LexiFonts.headlineMd, fontSize: 16, color: UI.amber, width: 18 },
  stepText: { flex: 1, fontFamily: LexiFonts.bodyRegular, fontSize: 15, lineHeight: 21, color: UI.ink },
  primary: { height: 52, borderRadius: 26, backgroundColor: UI.ink, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: LexiFonts.labelSmBold, fontSize: 15, color: '#fff' },
  secondary: { height: 52, borderRadius: 26, borderWidth: 1, borderColor: UI.border, alignItems: 'center', justifyContent: 'center', backgroundColor: UI.card },
  secondaryText: { fontFamily: LexiFonts.labelSmBold, fontSize: 15, color: UI.ink },
  later: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 20 },
  laterText: { fontFamily: LexiFonts.labelSmBold, fontSize: 13, color: UI.muted },
  sep: { color: UI.muted },
});

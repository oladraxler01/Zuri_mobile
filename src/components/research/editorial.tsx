import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { ZuriFonts } from '@/constants/zuri-theme';
import type { Paper } from '@/types/research';

/**
 * Editorial look for the research system: paper-coloured page, serif
 * headlines, hairline rules and small-caps kickers, closer to a journal
 * than the card-based study screens.
 */
export const ED = {
  paper: '#f7f3ea',
  ink: '#1d1d1b',
  inkSoft: '#4a4843',
  muted: '#86827a',
  rule: 'rgba(29, 29, 27, 0.14)',
  accent: '#9a5b0b',
  accentSoft: '#efe3cc',
  card: '#fffdf8',
};

export function EdPage({ children, back = true, right, edges = ['top'] }: { children: React.ReactNode; back?: boolean; right?: React.ReactNode; edges?: ('top' | 'bottom')[] }) {
  return (
    <SafeAreaView edges={edges} style={styles.page}>
      <StatusBar barStyle="dark-content" />
      {(back || right) && (
        <View style={styles.bar}>
          {back ? (
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/research' as Href))} hitSlop={10} accessibilityLabel="Go back">
              <Ionicons name="arrow-back" size={22} color={ED.ink} />
            </Pressable>
          ) : (
            <View />
          )}
          <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center' }}>{right}</View>
        </View>
      )}
      <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

export function Masthead({ kicker, title, dek }: { kicker?: string; title: string; dek?: string }) {
  return (
    <View style={{ marginBottom: 6 }}>
      {!!kicker && <Text style={styles.kicker}>{kicker}</Text>}
      <Text style={styles.title}>{title}</Text>
      {!!dek && <Text style={styles.dek}>{dek}</Text>}
    </View>
  );
}

export function Rule({ heavy }: { heavy?: boolean }) {
  return <View style={[styles.rule, heavy && styles.ruleHeavy]} />;
}

export function SectionHead({ title, action }: { title: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.section}>{title.toUpperCase()}</Text>
      {action && (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <Text style={styles.sectionAction}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function byline(p: Paper) {
  const a = p.authors.length > 3 ? `${p.authors.slice(0, 3).join(', ')} et al.` : p.authors.join(', ');
  return [a || 'Unknown author', p.venue, p.year].filter(Boolean).join(' · ');
}

/** A paper in a list: serif title, byline, citations, open-access mark. */
export function PaperRow({
  paper,
  onPress,
  right,
  showAbstract,
}: {
  paper: Paper;
  onPress?: () => void;
  right?: React.ReactNode;
  showAbstract?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress ?? (() => router.push(`/scholar/paper/${paper.id}` as Href))}
      style={({ pressed }) => [styles.paperRow, pressed && { opacity: 0.75 }]}
      accessibilityRole="button"
      accessibilityLabel={`${paper.title}. ${byline(paper)}`}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.paperTitle}>{paper.title}</Text>
        <Text style={styles.paperBy} numberOfLines={2}>
          {byline(paper)}
        </Text>
        {showAbstract && !!paper.abstract && (
          <Text style={styles.paperAbs} numberOfLines={3}>
            {paper.abstract}
          </Text>
        )}
        <View style={styles.paperMeta}>
          <Text style={styles.metaText}>Cited by {paper.citedBy.toLocaleString()}</Text>
          {!!paper.oaUrl && (
            <View style={styles.oa}>
              <Ionicons name="lock-open-outline" size={11} color={ED.accent} />
              <Text style={styles.oaText}>Open access</Text>
            </View>
          )}
        </View>
      </View>
      {right}
    </Pressable>
  );
}

export const edStyles = StyleSheet.create({
  body: { fontFamily: ZuriFonts.bodyRegular, fontSize: 15, lineHeight: 24, color: ED.inkSoft },
  serifBody: { fontFamily: 'SourceSerif4_400Regular', fontSize: 17, lineHeight: 27, color: ED.ink },
  muted: { fontFamily: ZuriFonts.bodyRegular, fontSize: 13, lineHeight: 19, color: ED.muted },
  input: {
    height: 48,
    borderBottomWidth: 1.5,
    borderBottomColor: ED.ink,
    fontFamily: 'SourceSerif4_400Regular',
    fontSize: 18,
    color: ED.ink,
    paddingHorizontal: 2,
  },
  btn: { height: 48, borderRadius: 2, backgroundColor: ED.ink, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 18 },
  btnText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 14, letterSpacing: 0.4, color: ED.paper },
  btnGhost: { height: 48, borderRadius: 2, borderWidth: 1, borderColor: ED.ink, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 18 },
  btnGhostText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 14, letterSpacing: 0.4, color: ED.ink },
  tag: { borderWidth: 1, borderColor: ED.rule, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 2 },
  tagOn: { backgroundColor: ED.ink, borderColor: ED.ink },
  tagText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 12, color: ED.ink },
});

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: ED.paper },
  bar: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  scroll: { paddingHorizontal: 22, paddingBottom: 120, maxWidth: 760, width: '100%', alignSelf: 'center', gap: 14 },
  kicker: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, letterSpacing: 2, color: ED.accent, marginBottom: 6 },
  title: { fontFamily: 'SourceSerif4_600SemiBold', fontSize: 32, lineHeight: 38, color: ED.ink, letterSpacing: -0.5 },
  dek: { fontFamily: 'SourceSerif4_400Regular', fontSize: 17, lineHeight: 25, color: ED.inkSoft, marginTop: 8 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: ED.rule },
  ruleHeavy: { height: 2, backgroundColor: ED.ink },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10 },
  section: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, letterSpacing: 1.8, color: ED.ink },
  sectionAction: { fontFamily: ZuriFonts.labelSmBold, fontSize: 12, color: ED.accent },
  paperRow: { flexDirection: 'row', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ED.rule },
  paperTitle: { fontFamily: 'SourceSerif4_600SemiBold', fontSize: 18, lineHeight: 24, color: ED.ink },
  paperBy: { fontFamily: ZuriFonts.bodyRegular, fontSize: 13, color: ED.inkSoft, marginTop: 4 },
  paperAbs: { fontFamily: 'SourceSerif4_400Regular', fontSize: 14, lineHeight: 21, color: ED.inkSoft, marginTop: 6 },
  paperMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  metaText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, color: ED.muted },
  oa: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  oaText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, color: ED.accent },
});

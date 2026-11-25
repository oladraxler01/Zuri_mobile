import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, StatusBar, useWindowDimensions, type ViewStyle } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import type { IoniconName } from '@/types/lecture';

/**
 * Building blocks for the lecturer and institution dashboards.
 * Charts follow one rule set: a single amber hue (validated against the
 * white card surface), thin rounded marks, recessive axes, the value on
 * tap, and an accessibility label per mark.
 */

const BAR = '#c5832b';
const BAR_DIM = '#e8c58f';

// ─── Layout ───────────────────────────────────────────────────────

export function ScreenShell({
  eyebrow,
  title,
  right,
  back,
  children,
  edges = ['top'],
}: {
  eyebrow?: string;
  title: string;
  right?: React.ReactNode;
  back?: boolean;
  children: React.ReactNode;
  edges?: ('top' | 'bottom')[];
}) {
  return (
    <SafeAreaView edges={edges} style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {back && (
              <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
                <Ionicons name="arrow-back" size={24} color={UI.ink} />
              </Pressable>
            )}
            <View style={{ flex: 1 }}>
              {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
              <Text style={styles.title}>{title}</Text>
            </View>
          </View>
          {right}
        </View>
        {children}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

/** Lays children out in 1–3 columns depending on screen width. */
export function Grid({ children, min = 300, gap = 12 }: { children: React.ReactNode; min?: number; gap?: number }) {
  const { width } = useWindowDimensions();
  const usable = Math.min(width, 1120) - 40;
  const cols = Math.max(1, Math.min(3, Math.floor((usable + gap) / (min + gap))));
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
      {items.map((child, i) => (
        <View key={i} style={{ width: cols === 1 ? '100%' : `${100 / cols - 1.5}%`, flexGrow: 1 }}>
          {child}
        </View>
      ))}
    </View>
  );
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  style,
}: {
  title?: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.panel, style]}>
      {(title || action) && (
        <View style={styles.panelHead}>
          <View style={{ flex: 1 }}>
            {!!title && <Text style={styles.panelTitle}>{title}</Text>}
            {!!subtitle && <Text style={styles.panelSub}>{subtitle}</Text>}
          </View>
          {action && (
            <Pressable onPress={action.onPress} hitSlop={8}>
              <Text style={styles.panelAction}>{action.label}</Text>
            </Pressable>
          )}
        </View>
      )}
      {children}
    </View>
  );
}

export function SampleBanner({ text }: { text?: string }) {
  return (
    <View style={styles.banner}>
      <Ionicons name="information-circle-outline" size={18} color={UI.amber} />
      <Text style={styles.bannerText}>
        {text ?? 'Sample data. Live figures appear once students and staff are connected through the backend.'}
      </Text>
    </View>
  );
}

// ─── Numbers ──────────────────────────────────────────────────────

export function StatTile({
  label,
  value,
  delta,
  icon,
}: {
  label: string;
  value: string;
  /** e.g. { text: '+4 pts vs last week', up: true } */
  delta?: { text: string; up: boolean };
  icon?: IoniconName;
}) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}${delta ? `, ${delta.text}` : ''}`}>
      <View style={styles.tileTop}>
        <Text style={styles.tileLabel}>{label}</Text>
        {icon && <Ionicons name={icon} size={16} color={UI.muted} />}
      </View>
      <Text style={styles.tileValue}>{value}</Text>
      {delta && (
        <View style={styles.delta}>
          <Ionicons name={delta.up ? 'arrow-up' : 'arrow-down'} size={12} color={UI.inkSoft} />
          <Text style={styles.deltaText}>{delta.text}</Text>
        </View>
      )}
    </View>
  );
}

export type Status = 'good' | 'warning' | 'critical';
const STATUS: Record<Status, { color: string; bg: string; icon: IoniconName; label: string }> = {
  good: { color: '#2f6b3a', bg: '#e6f0dc', icon: 'checkmark-circle', label: 'Healthy' },
  warning: { color: '#8a5a00', bg: '#fdf1df', icon: 'alert-circle', label: 'Watch' },
  critical: { color: '#ba1a1a', bg: '#ffdad6', icon: 'close-circle', label: 'Action needed' },
};

/** Status always shows icon + words, never colour alone. */
export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  const s = STATUS[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Ionicons name={s.icon} size={12} color={s.color} />
      <Text style={[styles.badgeText, { color: s.color }]}>{label ?? s.label}</Text>
    </View>
  );
}

// ─── Charts ───────────────────────────────────────────────────────

/**
 * Vertical bar chart for one series (e.g. a weekly measure).
 * Tap a bar to read its value; `highlight` darkens one bar (e.g. this week).
 */
export function BarChart({
  data,
  format = (v) => String(v),
  height = 140,
  highlight,
  max,
  label,
}: {
  data: { label: string; value: number }[];
  format?: (v: number) => string;
  height?: number;
  highlight?: number;
  max?: number;
  /** what the chart shows, for screen readers */
  label: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const top = max ?? Math.max(...data.map((d) => d.value), 1);
  const shown = active ?? highlight ?? data.length - 1;

  return (
    <View accessibilityLabel={label}>
      <View style={styles.readout}>
        <Text style={styles.readoutValue}>{format(data[shown]?.value ?? 0)}</Text>
        <Text style={styles.readoutLabel}>{data[shown]?.label}</Text>
      </View>
      <View style={[styles.plot, { height }]}>
        {[0.5, 1].map((g) => (
          <View key={g} style={[styles.gridline, { bottom: g * (height - 4) }]} />
        ))}
        <View style={styles.bars}>
          {data.map((d, i) => {
            const h = Math.max(4, (d.value / top) * (height - 4));
            const on = i === shown;
            return (
              <Pressable
                key={d.label + i}
                style={styles.barHit}
                onPress={() => setActive(i)}
                accessibilityRole="button"
                accessibilityLabel={`${d.label}: ${format(d.value)}`}
              >
                <View style={[styles.bar, { height: h, backgroundColor: on ? BAR : BAR_DIM }]} />
              </Pressable>
            );
          })}
        </View>
        <View style={styles.baseline} />
      </View>
      <View style={styles.xLabels}>
        {data.map((d, i) => (
          <Text key={d.label + i} style={[styles.xLabel, i === shown && { color: UI.ink }]} numberOfLines={1}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

/**
 * Horizontal bars with the label and value as text (no legend needed).
 * Values under `warnBelow` get a status badge so they're not colour-only.
 */
export function HBarList({
  rows,
  max = 100,
  format = (v) => `${v}%`,
  warnBelow,
  onPressRow,
}: {
  rows: { label: string; value: number; sub?: string }[];
  max?: number;
  format?: (v: number) => string;
  warnBelow?: number;
  onPressRow?: (index: number) => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      {rows.map((r, i) => {
        const low = warnBelow !== undefined && r.value < warnBelow;
        const Wrapper: any = onPressRow ? Pressable : View;
        return (
          <Wrapper
            key={r.label + i}
            onPress={onPressRow ? () => onPressRow(i) : undefined}
            accessible
            accessibilityLabel={`${r.label}: ${format(r.value)}${low ? ', needs attention' : ''}`}
          >
            <View style={styles.hRowTop}>
              <Text style={styles.hLabel} numberOfLines={1}>
                {r.label}
              </Text>
              {low && <StatusBadge status="warning" label="Low" />}
              <Text style={styles.hValue}>{format(r.value)}</Text>
            </View>
            <View style={styles.hTrack}>
              <View style={[styles.hFill, { width: `${Math.min(100, (r.value / max) * 100)}%` }]} />
            </View>
            {!!r.sub && <Text style={styles.hSub}>{r.sub}</Text>}
          </Wrapper>
        );
      })}
    </View>
  );
}

/** One row in a list with chevron. */
export function ListRow({
  icon,
  title,
  subtitle,
  right,
  onPress,
}: {
  icon?: IoniconName;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.row}>
      {icon && (
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={18} color={UI.ink} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.rowSub}>{subtitle}</Text>}
      </View>
      {right}
      {onPress && <Ionicons name="chevron-forward" size={18} color={UI.muted} />}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }} accessibilityRole="button">
      {content}
    </Pressable>
  ) : (
    content
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: UI.borderSoft }} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: UI.bg },
  scroll: { padding: 20, paddingBottom: 120, maxWidth: 1120, width: '100%', alignSelf: 'center', gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  eyebrow: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, letterSpacing: 1.4, color: UI.amber },
  title: { fontFamily: ZuriFonts.headlineLg, fontSize: 28, lineHeight: 34, color: UI.ink },
  panel: { backgroundColor: UI.card, borderRadius: 18, borderWidth: 1, borderColor: UI.border, padding: 16 },
  panelHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  panelTitle: { fontFamily: ZuriFonts.headlineMd, fontSize: 18, color: UI.ink },
  panelSub: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 2 },
  panelAction: { fontFamily: ZuriFonts.labelSmBold, fontSize: 13, color: UI.amber },
  banner: { flexDirection: 'row', gap: 10, backgroundColor: UI.amberSoft, borderRadius: 12, padding: 12 },
  bannerText: { flex: 1, fontFamily: ZuriFonts.bodyRegular, fontSize: 13, lineHeight: 19, color: '#6b4511' },
  tile: { backgroundColor: UI.card, borderRadius: 16, borderWidth: 1, borderColor: UI.border, padding: 14, minHeight: 98 },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tileLabel: { fontFamily: ZuriFonts.labelSmBold, fontSize: 12, color: UI.muted },
  tileValue: { fontFamily: ZuriFonts.headlineLg, fontSize: 28, color: UI.ink, marginTop: 6 },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  deltaText: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.inkSoft },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11 },
  readout: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 8 },
  readoutValue: { fontFamily: ZuriFonts.headlineMd, fontSize: 22, color: UI.ink },
  readoutLabel: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted },
  plot: { justifyContent: 'flex-end' },
  gridline: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: UI.borderSoft },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: '100%', gap: 2 },
  barHit: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '70%', maxWidth: 28, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  baseline: { height: 1, backgroundColor: UI.border },
  xLabels: { flexDirection: 'row', gap: 2, marginTop: 6 },
  xLabel: { flex: 1, textAlign: 'center', fontFamily: ZuriFonts.bodyRegular, fontSize: 10, color: UI.muted },
  hRowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  hLabel: { flex: 1, fontFamily: ZuriFonts.bodyMedium, fontSize: 14, color: UI.ink },
  hValue: { fontFamily: ZuriFonts.labelSmBold, fontSize: 13, color: UI.ink, minWidth: 40, textAlign: 'right' },
  hTrack: { height: 6, borderRadius: 3, backgroundColor: UI.cardMuted, overflow: 'hidden' },
  hFill: { height: '100%', borderRadius: 3, backgroundColor: BAR },
  hSub: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: UI.cardMuted, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: ZuriFonts.bodyMedium, fontSize: 15, color: UI.ink },
  rowSub: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 2 },
});

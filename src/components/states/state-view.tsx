import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Platform, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import type { IoniconName } from '@/types/lecture';

/**
 * One building block for every empty, error, permission and status screen,
 * so they all look and behave the same across the app.
 */

type Tone = 'neutral' | 'amber' | 'error' | 'success';

const TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: UI.cardMuted, fg: UI.inkSoft },
  amber: { bg: UI.amberSoft, fg: UI.amber },
  error: { bg: UI.errorSoft, fg: UI.error },
  success: { bg: UI.successSoft, fg: UI.success },
};

export interface StateAction {
  label: string;
  onPress: () => void;
  icon?: IoniconName;
}

interface StateViewProps {
  icon: IoniconName;
  title: string;
  message?: string;
  tone?: Tone;
  primary?: StateAction;
  secondary?: StateAction;
  /** compact = inline inside a list/section instead of filling the screen */
  compact?: boolean;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export function StateView({
  icon,
  title,
  message,
  tone = 'neutral',
  primary,
  secondary,
  compact,
  style,
  children,
}: StateViewProps) {
  const t = TONES[tone];
  return (
    <View style={[styles.wrap, compact ? styles.compact : styles.full, style]} accessibilityRole="summary">
      <View style={[styles.icon, compact && styles.iconCompact, { backgroundColor: t.bg }]}>
        <Ionicons name={icon} size={compact ? 22 : 30} color={t.fg} />
      </View>
      <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      {!!message && <Text style={styles.message}>{message}</Text>}
      {children}
      {primary && (
        <Pressable
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          onPress={primary.onPress}
          accessibilityRole="button"
        >
          {primary.icon && <Ionicons name={primary.icon} size={18} color="#fff" />}
          <Text style={styles.primaryText}>{primary.label}</Text>
        </Pressable>
      )}
      {secondary && (
        <Pressable
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          onPress={secondary.onPress}
          accessibilityRole="button"
        >
          {secondary.icon && <Ionicons name={secondary.icon} size={18} color={UI.ink} />}
          <Text style={styles.secondaryText}>{secondary.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Presets ──────────────────────────────────────────────────────

export function EmptyState(props: Omit<StateViewProps, 'tone'> & { tone?: Tone }) {
  return <StateView tone="amber" {...props} />;
}

export function ErrorState({
  kind = 'server',
  message,
  onRetry,
  compact,
}: {
  kind?: 'network' | 'server';
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const network = kind === 'network';
  return (
    <StateView
      tone="error"
      compact={compact}
      icon={network ? 'cloud-offline-outline' : 'warning-outline'}
      title={network ? 'You’re offline' : 'Something went wrong'}
      message={
        message ??
        (network
          ? 'Check your Wi-Fi or mobile data. Anything you save is kept on your phone until you’re back online.'
          : 'We couldn’t load this right now. Please try again in a moment.')
      }
      primary={onRetry ? { label: 'Try again', onPress: onRetry, icon: 'refresh' } : undefined}
    />
  );
}

/** Ask for a permission, or explain how to turn it back on in settings. */
export function PermissionState({
  icon,
  title,
  message,
  deniedMessage,
  denied,
  allowLabel,
  onAllow,
  onSkip,
  skipLabel = 'Not now',
  points,
}: {
  icon: IoniconName;
  title: string;
  message: string;
  deniedMessage: string;
  denied: boolean;
  allowLabel: string;
  onAllow: () => void;
  onSkip?: () => void;
  skipLabel?: string;
  points?: { icon: IoniconName; text: string }[];
}) {
  const openSettings = () => Linking.openSettings().catch(() => {});
  return (
    <StateView
      tone={denied ? 'error' : 'amber'}
      icon={icon}
      title={denied ? 'Permission is turned off' : title}
      message={
        denied
          ? Platform.OS === 'web'
            ? `${deniedMessage} Allow it in your browser’s site settings, then reload.`
            : deniedMessage
          : message
      }
      primary={
        denied
          ? Platform.OS === 'web'
            ? undefined
            : { label: 'Open settings', onPress: openSettings, icon: 'settings-outline' }
          : { label: allowLabel, onPress: onAllow }
      }
      secondary={onSkip ? { label: skipLabel, onPress: onSkip } : undefined}
    >
      {points && (
        <View style={styles.points}>
          {points.map((p) => (
            <View key={p.text} style={styles.point}>
              <Ionicons name={p.icon} size={18} color={UI.inkSoft} />
              <Text style={styles.pointText}>{p.text}</Text>
            </View>
          ))}
        </View>
      )}
    </StateView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 440,
  },
  full: {
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  compact: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  iconCompact: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginBottom: 12,
  },
  title: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 24,
    lineHeight: 30,
    color: UI.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  titleCompact: {
    fontSize: 19,
    lineHeight: 25,
  },
  message: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
    color: UI.inkSoft,
    textAlign: 'center',
    marginBottom: 20,
  },
  points: {
    alignSelf: 'stretch',
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 20,
  },
  point: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  pointText: {
    flex: 1,
    fontFamily: LexiFonts.bodyMedium,
    fontSize: 14,
    color: UI.ink,
  },
  primary: {
    alignSelf: 'stretch',
    height: 54,
    borderRadius: 27,
    backgroundColor: UI.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  primaryText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 15,
    color: '#fff',
  },
  secondary: {
    alignSelf: 'stretch',
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: UI.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 15,
    color: UI.ink,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
});

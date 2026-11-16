import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, type DimensionValue, type ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';

/** Centered spinner with an optional label. */
export function LoadingState({ label, style }: { label?: string; style?: ViewStyle }) {
  return (
    <View style={[styles.center, style]} accessibilityRole="progressbar" accessibilityLabel={label ?? 'Loading'}>
      <ActivityIndicator size="large" color={UI.amber} />
      {!!label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

/** Pulsing grey block used as a placeholder while content loads. */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: UI.cardMuted }, anim, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

/** Placeholder shaped like a list card. */
export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton width={42} height={42} radius={12} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="35%" height={10} />
        <Skeleton width="85%" height={14} />
        <Skeleton width="55%" height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 24,
  },
  label: {
    fontFamily: ZuriFonts.bodyMedium,
    fontSize: 14,
    color: UI.muted,
  },
  card: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 16,
  },
});

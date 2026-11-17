import React, { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme-provider';
import { Text } from '../text';
import { Button, type ButtonVariant } from './button';

export interface SheetAction {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
}

export interface BottomSheetProps {
  visible: boolean;
  /** Called on drag-down, scrim tap or system back, when `dismissible`. */
  onDismiss: () => void;
  title: string;
  children?: React.ReactNode;
  primary?: SheetAction;
  secondary?: SheetAction;
  /** false for consent and destructive confirmations: they need an explicit choice. */
  dismissible?: boolean;
}

const OFFSCREEN = 600;
const DISMISS_DISTANCE = 96;

/**
 * Modal choices, confirmations and short forms (recording consent, add
 * course, stop recording, filters). Anything longer than a screen is a
 * pushed screen instead.
 */
export function BottomSheet({
  visible,
  onDismiss,
  title,
  children,
  primary,
  secondary,
  dismissible = true,
}: BottomSheetProps) {
  const { colors, radius, space, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const [reduceMotion, setReduceMotion] = useState(false);
  // Animated values live in state (created once) rather than refs, so render never reads a ref.
  const [progress] = useState(() => new Animated.Value(visible ? 1 : 0)); // 0 hidden → 1 shown
  const [drag] = useState(() => new Animated.Value(0));

  // Stay mounted while the closing animation runs. Track the previous `visible`
  // during render (React's "adjusting state when a prop changes" pattern).
  const [mounted, setMounted] = useState(visible);
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) setMounted(true);
  }

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (visible) {
      drag.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, drag, progress]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => dismissible && g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          if (g.dy > DISMISS_DISTANCE || g.vy > 1.2) {
            onDismiss();
          } else {
            Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
          }
        },
      }),
    [dismissible, onDismiss, drag],
  );

  if (!mounted) return null;

  // Under Reduce Motion the sheet cross-fades instead of sliding.
  const translateY = reduceMotion
    ? drag
    : Animated.add(progress.interpolate({ inputRange: [0, 1], outputRange: [OFFSCREEN, 0] }), drag);

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (dismissible) onDismiss();
      }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, opacity: progress }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => dismissible && onDismiss()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          disabled={!dismissible}
        />
      </Animated.View>
      <View style={styles.anchor} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          style={{
            backgroundColor: colors['surface-raised'],
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            paddingHorizontal: space[5],
            paddingTop: space[3],
            paddingBottom: Math.max(insets.bottom, space[4]),
            gap: space[4],
            boxShadow: shadows.sheet,
            opacity: reduceMotion ? progress : 1,
            transform: [{ translateY }],
          }}
        >
          <View {...pan.panHandlers} style={{ alignItems: 'center', gap: space[4] }}>
            <View
              style={{ width: 36, height: 4, borderRadius: radius.full, backgroundColor: colors['border-strong'] }}
            />
            <Text variant="title-2" accessibilityRole="header" style={{ alignSelf: 'stretch' }}>
              {title}
            </Text>
          </View>
          {children}
          {primary || secondary ? (
            <View style={{ gap: space[2] }}>
              {primary ? <Button block variant={primary.variant ?? 'primary'} {...primary} /> : null}
              {secondary ? <Button block variant={secondary.variant ?? 'secondary'} {...secondary} /> : null}
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  anchor: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});

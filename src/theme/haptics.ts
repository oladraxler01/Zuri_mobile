import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * The three haptics the design system uses (mobile patterns → Feedback).
 * No-ops on web, and never throws.
 */
export const haptics = {
  /** Primary presses. */
  light() {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** A debrief quiz passes. */
  success() {
    if (Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  /** Recording stops unexpectedly. */
  warning() {
    if (Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
};

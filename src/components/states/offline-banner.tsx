import React, { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { ZuriFonts } from '@/constants/zuri-theme';
import { useNetwork } from '@/context/network-context';

/**
 * Slides down from the top when the device goes offline, and briefly
 * confirms when the connection comes back.
 */
export function OfflineBanner() {
  const { isOnline } = useNetwork();
  const insets = useSafeAreaInsets();
  const [showBackOnline, setShowBackOnline] = useState(false);
  const wasOffline = useRef(false);
  const y = useSharedValue(-120);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!isOnline) {
      wasOffline.current = true;
      setShowBackOnline(false);
      y.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
    } else if (wasOffline.current) {
      wasOffline.current = false;
      setShowBackOnline(true);
      timer = setTimeout(() => {
        y.value = withTiming(-120, { duration: 300 });
      }, 2200);
    }
    return () => clearTimeout(timer);
  }, [isOnline]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const online = isOnline && showBackOnline;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.banner, { paddingTop: insets.top + 8 }, online && styles.online, style]}
      accessibilityLiveRegion="polite"
    >
      <Ionicons name={online ? 'cloud-done-outline' : 'cloud-offline-outline'} size={16} color="#fff" />
      <Text style={styles.text}>
        {online ? 'Back online' : 'You’re offline. Recordings are saved and will upload later.'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#3d2a0a',
  },
  online: {
    backgroundColor: '#2f6b3a',
  },
  text: {
    fontFamily: ZuriFonts.bodyMedium,
    fontSize: 13,
    color: '#fff',
    flexShrink: 1,
  },
});

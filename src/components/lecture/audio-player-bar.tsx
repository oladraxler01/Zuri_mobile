import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutChangeEvent, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AudioPlayer, AudioStatus } from 'expo-audio';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { formatClock } from '@/utils/time';

const RATES = [1, 1.25, 1.5, 2, 0.75];

/** Compact player pinned to the bottom of the lecture screen. */
export function AudioPlayerBar({
  player,
  status,
  fallbackDuration,
}: {
  player: AudioPlayer;
  status: AudioStatus;
  fallbackDuration: number;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [rateIdx, setRateIdx] = useState(0);

  const duration = status.duration || fallbackDuration || 0;
  const current = Math.min(status.currentTime || 0, duration);
  const pct = duration > 0 ? current / duration : 0;

  const toggle = () => {
    if (status.playing) {
      player.pause();
    } else {
      if (duration > 0 && current >= duration - 0.25) player.seekTo(0);
      player.play();
    }
  };

  const skip = (delta: number) => {
    player.seekTo(Math.max(0, Math.min(duration, current + delta)));
  };

  const onTrackPress = (e: GestureResponderEvent) => {
    if (!trackWidth || !duration) return;
    const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / trackWidth));
    player.seekTo(ratio * duration);
  };

  const cycleRate = () => {
    const next = (rateIdx + 1) % RATES.length;
    setRateIdx(next);
    player.setPlaybackRate(RATES[next]);
  };

  return (
    <View style={styles.bar}>
      <Pressable
        onPress={onTrackPress}
        onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
        style={styles.trackHit}
        accessibilityRole="adjustable"
        accessibilityLabel="Playback position"
        accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(current) }}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct * 100}%` }]} />
        </View>
        <View style={[styles.knob, { left: Math.max(0, pct * trackWidth - 6) }]} />
      </Pressable>

      <View style={styles.row}>
        <Text style={styles.time}>{formatClock(current)}</Text>

        <View style={styles.controls}>
          <Pressable onPress={() => skip(-15)} hitSlop={10} accessibilityLabel="Back 15 seconds">
            <Ionicons name="play-back" size={20} color={UI.ink} />
          </Pressable>
          <Pressable
            onPress={toggle}
            style={({ pressed }) => [styles.play, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel={status.playing ? 'Pause' : 'Play'}
          >
            {status.isBuffering && !status.playing ? (
              <Ionicons name="hourglass-outline" size={20} color="#fff" />
            ) : (
              <Ionicons name={status.playing ? 'pause' : 'play'} size={22} color="#fff" />
            )}
          </Pressable>
          <Pressable onPress={() => skip(15)} hitSlop={10} accessibilityLabel="Forward 15 seconds">
            <Ionicons name="play-forward" size={20} color={UI.ink} />
          </Pressable>
        </View>

        <View style={styles.right}>
          <Pressable onPress={cycleRate} style={styles.rate} accessibilityLabel="Playback speed">
            <Text style={styles.rateText}>{RATES[rateIdx]}×</Text>
          </Pressable>
          <Text style={styles.time}>{formatClock(duration)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: UI.card,
    borderTopWidth: 1,
    borderTopColor: UI.border,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
  },
  trackHit: {
    height: 22,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: UI.cardMuted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: UI.amber,
  },
  knob: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: UI.ink,
    top: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontFamily: ZuriFonts.bodyMedium,
    fontSize: 12,
    color: UI.muted,
    minWidth: 44,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
  },
  play: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: UI.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 44,
    justifyContent: 'flex-end',
  },
  rate: {
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rateText: {
    fontFamily: ZuriFonts.labelSmBold,
    fontSize: 11,
    color: UI.ink,
  },
});

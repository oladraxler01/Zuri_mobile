import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { onUpdateStatus, restartIntoUpdate, startUpdateWatcher, updateStatus } from '@/services/app-updates';
import { isRecordingBusy, onRecordingBusyChange } from '@/services/recording/busy';
import { Text, makeStyles, useTheme } from '@/theme';

/** "A new version of Zuri is ready · Restart now". Hidden while a lecture is being recorded. */
export function UpdateBanner() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(updateStatus() === 'ready');
  const [recording, setRecording] = useState(isRecordingBusy());
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    startUpdateWatcher();
    const a = onUpdateStatus((s) => setReady(s === 'ready'));
    const b = onRecordingBusyChange(setRecording);
    return () => {
      a();
      b();
    };
  }, []);

  if (!ready || recording || hidden) return null;

  return (
    <View style={[styles.wrap, { top: insets.top + 8 }]} pointerEvents="box-none">
      <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <Ionicons name="sparkles-outline" size={20} color={colors['text-on-inverse']} />
        <Text variant="subhead" style={styles.text}>
          A new version of Zuri is ready.
        </Text>
        <Pressable
          onPress={() => restartIntoUpdate()}
          style={styles.action}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Restart now to update Zuri"
        >
          <Text variant="subhead" style={styles.actionText}>
            Restart now
          </Text>
        </Pressable>
        <Pressable onPress={() => setHidden(true)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Later">
          <Ionicons name="close" size={20} color={colors['text-on-inverse']} />
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { position: 'absolute', left: t.space[4], right: t.space[4] },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3],
    paddingVertical: t.space[3],
    paddingHorizontal: t.space[4],
    borderRadius: t.radius.md,
    backgroundColor: t.colors['surface-inverse'],
    boxShadow: t.shadows.raised,
  },
  text: { flex: 1, color: t.colors['text-on-inverse'] },
  action: {
    minHeight: t.size['control-height-sm'],
    justifyContent: 'center',
    paddingHorizontal: t.space[3],
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.accent,
  },
  actionText: { color: t.colors['on-accent'] },
}));

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  type AudioRecorder,
  type RecordingOptions,
} from 'expo-audio';
import { Button, Card, Chip, ListGroup, ListRow, Text, useTheme } from '@/theme';
import { ChunkedRecorder, type ChunkMeta, type RecordingStats, type SegmentRecorder } from '@/services/recording/chunked-recorder';
import { fileChunkStore } from '@/services/recording/chunk-store';

/** Development and preview builds set EXPO_PUBLIC_DIAGNOSTICS=1 (eas.json). */
const DIAGNOSTICS = __DEV__ || process.env.EXPO_PUBLIC_DIAGNOSTICS === '1';

/** Same voice settings as Lecture Capture: 16 kHz mono AAC. */
const VOICE: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: false,
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 64000,
  web: { mimeType: 'audio/webm', bitsPerSecond: 64000 },
};

/** expo-audio's recorder behind the engine's small interface. */
function adapt(recorder: AudioRecorder): SegmentRecorder {
  return {
    async prepare() {
      try {
        await recorder.prepareToRecordAsync();
      } catch {
        await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY); // iPhones that refuse 16 kHz
      }
    },
    start: () => recorder.record(),
    async stop() {
      await recorder.stop();
      return recorder.uri;
    },
  };
}

const ms = (n: number) => `${(n / 1000).toFixed(1)} s`;
const kb = (n: number | null) => (n == null ? '—' : n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} kB`);

/**
 * Spike: chunked lecture recording (open /dev/spike-recording on a dev build).
 * Records in 30 or 60 s chunks, shows the gap between chunks and the files kept
 * on the phone. Device test protocol: docs/spikes/RECORDING_SPIKE.md.
 */
export default function RecordingSpike() {
  if (!DIAGNOSTICS) return <Redirect href="/" />;
  return <Spike />;
}

function Spike() {
  const { colors, space } = useTheme();
  const insets = useSafeAreaInsets();
  const recorder = useAudioRecorder(VOICE);
  const engine = useRef<ChunkedRecorder | null>(null);
  const [segment, setSegment] = useState(30);
  const [running, setRunning] = useState(false);
  const [chunks, setChunks] = useState<ChunkMeta[]>([]);
  const [stats, setStats] = useState<RecordingStats | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const adapter = useMemo(() => adapt(recorder), [recorder]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  const refresh = () => {
    const e = engine.current;
    if (!e) return;
    setChunks([...e.list]);
    setStats(e.stats());
  };

  const start = async () => {
    setErrors([]);
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setErrors(['Microphone permission was refused. Allow it in Settings and try again.']);
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, allowsBackgroundRecording: true });
    } catch {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }); // Expo Go: no background
    }
    const e = new ChunkedRecorder({
      sessionId: `spike-${Date.now()}`,
      segmentSeconds: segment,
      recorder: adapter,
      store: fileChunkStore,
      onEvent: (ev) => {
        if (ev.type === 'error') setErrors((x) => [...x, ev.error.message]);
        refresh();
      },
    });
    engine.current = e;
    try {
      await e.start();
      setStartedAt(Date.now());
      setRunning(true);
      refresh();
    } catch (err) {
      setErrors([(err as Error).message]);
    }
  };

  const stop = async () => {
    await engine.current?.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    setRunning(false);
    refresh();
  };

  const ackAll = async () => {
    for (const c of engine.current?.list ?? []) await engine.current?.ack(c.seq);
    refresh();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space[6], paddingBottom: insets.bottom + space[12], paddingHorizontal: space[5], gap: space[6] }}>
        <View style={{ gap: space[2] }}>
          <Text variant="eyebrow" color="accent-text">SPIKE · PHASE 4</Text>
          <Text variant="headline">Chunked recording</Text>
          <Text color="text-muted">Records in short chunks so a crash loses at most one. Lock the screen and switch apps while it runs, then check the gaps.</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: space[2] }}>
          {[30, 60].map((s) => (
            <Chip key={s} label={`${s} s chunks`} selected={segment === s} onPress={running ? undefined : () => setSegment(s)} />
          ))}
        </View>

        {Platform.OS === 'web' ? (
          <Card eyebrow="NEEDS A PHONE" body="Chunks are saved with the phone's file system. Open this screen in the development build on Android or iPhone." />
        ) : running ? (
          <Button label="Stop recording" icon="stop" variant="danger" onPress={stop} block />
        ) : (
          <Button label="Start recording" icon="mic" onPress={start} block />
        )}

        <Card eyebrow={running && startedAt ? `RECORDING · ${ms(now - startedAt)}` : 'RESULTS'}>
          <View style={{ gap: space[1] }}>
            <Text>Chunks: {stats?.chunks ?? 0} (on the phone: {stats?.unacked ?? 0})</Text>
            <Text>Recorded: {ms(stats?.recordedMs ?? 0)}</Text>
            <Text>Gap between chunks: avg {stats?.avgGapMs ?? 0} ms · max {stats?.maxGapMs ?? 0} ms</Text>
            <Text>Audio lost to gaps: {ms(stats?.totalGapMs ?? 0)}</Text>
            <Text>Size on the phone: {kb(stats?.bytes ?? 0)}</Text>
          </View>
        </Card>

        {errors.length > 0 && (
          <Card eyebrow="ERRORS">
            {errors.map((e, i) => (
              <Text key={i} color="danger">{e}</Text>
            ))}
          </Card>
        )}

        {chunks.length > 0 && (
          <>
            <ListGroup>
              {chunks.map((c) => (
                <ListRow
                  key={c.seq}
                  icon={c.acked ? 'cloud-done-outline' : 'document-outline'}
                  title={`Chunk ${c.seq} · ${ms(c.durationMs)}`}
                  meta={`gap before ${c.gapBeforeMs} ms · ${kb(c.bytes)}${c.acked ? ' · uploaded, deleted from phone' : ''}`}
                />
              ))}
            </ListGroup>
            {!running && <Button label="Pretend the server received them" variant="secondary" onPress={ackAll} />}
          </>
        )}
      </ScrollView>
    </View>
  );
}

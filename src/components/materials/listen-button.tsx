import React, { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Button, Text, useTheme } from '@/theme';
import { summaryAudio } from '@/services/ai-api';

/**
 * "Listen to summary": Zuri reads the start of the summary aloud.
 * The first tap asks the server for the audio (one AI request) and keeps the
 * MP3 on the phone (savedUri), so later plays are free and work offline.
 */
export function ListenButton({
  materialId,
  serverId,
  savedUri,
  onSaved,
}: {
  materialId: string;
  serverId?: string;
  savedUri?: string;
  onSaved: (uri: string) => void;
}) {
  const { space } = useTheme();
  const player = useRef<AudioPlayer | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [error, setError] = useState('');

  useEffect(
    () => () => {
      player.current?.remove();
      player.current = null;
    },
    []
  );

  /** A playable source: the saved file if it still exists, otherwise null. */
  const savedSource = (): string | null => {
    if (!savedUri) return null;
    if (Platform.OS === 'web') return savedUri;
    try {
      return new File(savedUri).exists ? savedUri : null;
    } catch {
      return null;
    }
  };

  const play = async (uri: string) => {
    await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    player.current?.remove();
    const p = createAudioPlayer(uri);
    player.current = p;
    p.addListener('playbackStatusUpdate', (s) => {
      if (s.didJustFinish) setState('idle');
    });
    p.play();
    setState('playing');
  };

  const onPress = async () => {
    setError('');
    if (state === 'playing') {
      player.current?.pause();
      setState('idle');
      return;
    }
    try {
      let uri = savedSource();
      if (!uri) {
        if (!serverId) return setError('Upload this file again to have Zuri read it aloud.');
        setState('loading');
        const b64 = await summaryAudio(serverId);
        if (Platform.OS === 'web') {
          uri = `data:audio/mpeg;base64,${b64}`;
        } else {
          const file = new File(Paths.cache, `summary-${materialId}.mp3`);
          if (file.exists) file.delete();
          await file.write(b64, { encoding: 'base64' });
          uri = file.uri;
        }
        onSaved(uri);
      }
      await play(uri);
    } catch (e) {
      setState('idle');
      setError(e instanceof Error ? e.message : 'Couldn’t play the summary.');
    }
  };

  return (
    <View style={{ gap: space[2], alignItems: 'flex-start', marginBottom: space[3] }}>
      <Button
        variant="tonal"
        size="sm"
        icon={state === 'playing' ? 'pause' : 'volume-high-outline'}
        label={state === 'playing' ? 'Pause' : state === 'loading' ? 'Getting audio…' : 'Listen to summary'}
        loading={state === 'loading'}
        onPress={onPress}
        accessibilityHint="Zuri reads the start of the summary aloud"
      />
      {!!error && (
        <Text variant="footnote" color="danger">
          {error}
        </Text>
      )}
    </View>
  );
}

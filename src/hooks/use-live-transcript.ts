import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import type { TranscriptSegment } from '@/types/lecture';

/**
 * Live lecture transcription with the phone's own speech recognition
 * (Google on Android, Apple on iPhone): words appear as the lecturer speaks.
 *
 * - Lectures are long, but recognizers stop after a pause (always on Android 12
 *   and below). While the student is still recording we restart straight away,
 *   so the transcript keeps going.
 * - Nigerian English (en-NG) first; if the phone doesn't have it, US English.
 * - Where the phone supports it (Android 13+, iPhone) the audio is saved too;
 *   each restart writes a new audio file, all of which are kept.
 */

export function liveTranscriptionAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
}

const RESTARTABLE = new Set(['no-speech', 'speech-timeout', 'nomatch', 'busy', 'client', 'interrupted', 'network']);

export function useLiveTranscript(opts: { contextualStrings?: string[] } = {}) {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [interim, setInterim] = useState('');
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const [warning, setWarning] = useState('');
  const [fatal, setFatal] = useState('');
  const [audioUris, setAudioUris] = useState<string[]>([]);

  const wanted = useRef(false); // the student is recording (not paused or stopped)
  const lang = useRef('en-NG');
  const startedAt = useRef(0); // when the lecture started (ms), for segment times
  const pausedMs = useRef(0); // total paused time, so times stay on the lecture clock
  const pausedAt = useRef(0);
  const segStart = useRef<number | null>(null);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopResolve = useRef<(() => void) | null>(null);
  const active = useRef(false); // a recognition session is running (between 'start' and 'end')

  const clock = () => (Date.now() - startedAt.current - pausedMs.current) / 1000;

  const begin = useCallback(() => {
    const persist = (() => {
      try {
        return ExpoSpeechRecognitionModule.supportsRecording();
      } catch {
        return false;
      }
    })();
    ExpoSpeechRecognitionModule.start({
      lang: lang.current,
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      maxAlternatives: 1,
      contextualStrings: opts.contextualStrings?.slice(0, 100),
      iosTaskHint: 'dictation',
      volumeChangeEventOptions: { enabled: true, intervalMillis: 250 },
      recordingOptions: persist ? { persist: true, outputFileName: `lecture-${Date.now()}.wav` } : undefined,
      androidIntentOptions: {
        // Don't stop after a short pause: lecturers pause to write on the board.
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 10000,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 10000,
      },
    });
  }, [opts.contextualStrings]);

  const scheduleRestart = useCallback(
    (delay = 150) => {
      if (!wanted.current) return;
      if (restartTimer.current) clearTimeout(restartTimer.current);
      restartTimer.current = setTimeout(() => {
        if (!wanted.current) return;
        try {
          begin();
        } catch {
          scheduleRestart(1000);
        }
      }, delay);
    },
    [begin]
  );

  useSpeechRecognitionEvent('start', () => {
    active.current = true;
    setListening(true);
  });
  useSpeechRecognitionEvent('volumechange', (e) => setLevel(Math.max(0, Math.min(1, (e.value + 2) / 12))));
  useSpeechRecognitionEvent('audioend', (e) => {
    if (e.uri) setAudioUris((prev) => (prev.includes(e.uri!) ? prev : [...prev, e.uri!]));
  });
  useSpeechRecognitionEvent('result', (e) => {
    const text = e.results[0]?.transcript?.trim() ?? '';
    if (segStart.current === null) segStart.current = Math.max(0, clock() - 2);
    if (!e.isFinal) {
      setInterim(text);
      return;
    }
    setInterim('');
    if (text) {
      const start = segStart.current ?? clock();
      setSegments((prev) => [...prev, { start: Math.round(start * 10) / 10, end: Math.round(clock() * 10) / 10, text }]);
    }
    segStart.current = null;
    setWarning('');
  });
  useSpeechRecognitionEvent('error', (e) => {
    if (e.error === 'language-not-supported' && lang.current !== 'en-US') {
      lang.current = 'en-US';
      scheduleRestart(100);
      return;
    }
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      wanted.current = false;
      setFatal('Zuri needs permission to use speech recognition. Allow it in Settings and try again.');
      return;
    }
    if (e.error === 'network') setWarning('No connection: the live transcript will continue when you’re back online.');
    if (e.error === 'aborted') return;
    if (RESTARTABLE.has(e.error) || wanted.current) scheduleRestart(e.error === 'network' ? 3000 : 300);
  });
  useSpeechRecognitionEvent('end', () => {
    active.current = false;
    setListening(false);
    setInterim('');
    if (wanted.current) {
      scheduleRestart();
    } else if (stopResolve.current) {
      stopResolve.current();
      stopResolve.current = null;
    }
  });

  useEffect(
    () => () => {
      const running = wanted.current || active.current;
      wanted.current = false;
      if (restartTimer.current) clearTimeout(restartTimer.current);
      // Only abort a session that's still running: aborting an idle recognizer (after
      // Stop, when the screen closes to open the saved lecture) can crash some Android phones.
      if (!running) return;
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        // already stopped
      }
    },
    []
  );

  /** Ask for microphone + speech permission, then start. Returns false if refused. */
  const start = useCallback(async () => {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setFatal('Zuri needs the microphone and speech recognition to transcribe. Allow them in Settings and try again.');
      return false;
    }
    setSegments([]);
    setInterim('');
    setFatal('');
    setWarning('');
    setAudioUris([]);
    startedAt.current = Date.now();
    pausedMs.current = 0;
    segStart.current = null;
    wanted.current = true;
    begin();
    return true;
  }, [begin]);

  const pause = useCallback(() => {
    wanted.current = false;
    pausedAt.current = Date.now();
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // not running
    }
  }, []);

  const resume = useCallback(() => {
    if (pausedAt.current) pausedMs.current += Date.now() - pausedAt.current;
    pausedAt.current = 0;
    wanted.current = true;
    begin();
  }, [begin]);

  /** Stop and wait (max 4 s) for the last words to arrive. */
  const stop = useCallback(async () => {
    const wasRunning = wanted.current || listening;
    wanted.current = false;
    if (restartTimer.current) clearTimeout(restartTimer.current);
    if (!wasRunning) return;
    await new Promise<void>((resolve) => {
      stopResolve.current = resolve;
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {
        resolve();
      }
      setTimeout(resolve, 4000);
    });
  }, [listening]);

  /** Seconds on the lecture clock (excluding pauses). */
  const elapsed = useCallback(() => (startedAt.current ? clock() : 0), []);

  return { segments, interim, listening, level, warning, fatal, audioUris, start, pause, resume, stop, elapsed };
}

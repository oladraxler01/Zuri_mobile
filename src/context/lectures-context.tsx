import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import type { Lecture } from '@/types/lecture';
import { processLecture, ApiError } from '@/services/lecture-api';
import { STORAGE_KEYS } from '@/utils/storage';
import { useNetwork } from '@/context/network-context';
import { useAcademic } from '@/context/academic-context';
import { onReset } from '@/utils/reset';

const STORAGE_KEY = STORAGE_KEYS.lectures;

interface NewLecture {
  courseId?: string;
  courseCode: string;
  courseTitle: string;
  durationSeconds: number;
  /** temporary recording file from the recorder */
  recordingUri: string;
}

interface LecturesContextType {
  lectures: Lecture[];
  loaded: boolean;
  getLecture: (id: string) => Lecture | undefined;
  /** Save a finished recording and start upload + processing. Returns the new id. */
  saveRecording: (input: NewLecture) => string;
  retryProcessing: (id: string) => void;
  updateLecture: (id: string, patch: Partial<Lecture>) => void;
  deleteLecture: (id: string) => void;
}

const LecturesContext = createContext<LecturesContextType | undefined>(undefined);

/** Move the recorder's temp file somewhere permanent (native only). */
function persistAudio(tempUri: string, id: string): string {
  if (Platform.OS === 'web') return tempUri; // blob URL; lives until reload
  try {
    const dir = new Directory(Paths.document, 'lectures');
    if (!dir.exists) dir.create({ intermediates: true });
    const source = new File(tempUri);
    const dest = new File(dir, `${id}${source.extension || '.m4a'}`);
    source.copy(dest);
    return dest.uri;
  } catch (e) {
    console.warn('Could not move recording to permanent storage', e);
    return tempUri;
  }
}

function deleteAudio(uri?: string) {
  if (!uri || Platform.OS === 'web') return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // already gone
  }
}

export function LecturesProvider({ children }: { children: React.ReactNode }) {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loaded, setLoaded] = useState(false);

  // "Delete all my data" empties this store.
  useEffect(() => onReset(() => setLectures([])), []);
  const lecturesRef = useRef<Lecture[]>([]);
  lecturesRef.current = lectures;
  const { isOnline } = useNetwork();
  const { state: academic } = useAcademic();
  const keepAudioRef = useRef(true);
  keepAudioRef.current = academic.preferences.keepAudio !== false;
  const onlineRef = useRef(isOnline);
  onlineRef.current = isOnline;
  /** ids currently uploading/processing, so a lecture never runs twice at once */
  const running = useRef(new Set<string>());

  // Load saved lectures once.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved: Lecture[] = JSON.parse(raw);
          // Anything mid-upload when the app closed resumes automatically.
          setLectures(
            saved.map((l) =>
              l.status === 'uploading' || l.status === 'processing' ? { ...l, status: 'waiting', progress: 0 } : l
            )
          );
        }
      } catch (e) {
        console.warn('Could not load lectures', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Save whenever lectures change (after the first load).
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lectures)).catch((e) =>
      console.warn('Could not save lectures', e)
    );
  }, [lectures, loaded]);

  const updateLecture = useCallback((id: string, patch: Partial<Lecture>) => {
    setLectures((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }, []);

  const run = useCallback(
    async (lecture: Lecture) => {
      if (!lecture.audioUri) {
        updateLecture(lecture.id, { status: 'failed', error: 'The recording file is missing.' });
        return;
      }
      if (running.current.has(lecture.id)) return;
      if (!onlineRef.current) {
        updateLecture(lecture.id, { status: 'waiting', progress: 0, error: undefined });
        return;
      }
      running.current.add(lecture.id);
      updateLecture(lecture.id, { status: 'uploading', progress: 0, error: undefined });
      try {
        const analysis = await processLecture(
          {
            audioUri: lecture.audioUri,
            courseCode: lecture.courseCode,
            courseTitle: lecture.courseTitle,
            durationSeconds: lecture.durationSeconds,
          },
          (stage, progress) => updateLecture(lecture.id, { status: stage, progress })
        );
        if (keepAudioRef.current) {
          updateLecture(lecture.id, { status: 'ready', progress: 1, analysis });
        } else {
          // Preference: delete the audio once processed; transcript and notes stay.
          deleteAudio(lecture.audioUri);
          updateLecture(lecture.id, { status: 'ready', progress: 1, analysis, audioUri: undefined });
        }
      } catch (e) {
        if (e instanceof ApiError && e.kind === 'network') {
          // Lost connection: wait and resume automatically when back online.
          updateLecture(lecture.id, { status: 'waiting', progress: 0, error: e.message });
        } else {
          updateLecture(lecture.id, {
            status: 'failed',
            error: e instanceof Error ? e.message : 'Something went wrong while processing.',
          });
          if (e instanceof ApiError && e.kind !== 'server') {
            router.push(`/status/${e.kind}` as Href);
          }
        }
      } finally {
        running.current.delete(lecture.id);
      }
    },
    [updateLecture]
  );

  // Resume anything waiting once the device is online (and after loading).
  useEffect(() => {
    if (!loaded || !isOnline) return;
    lecturesRef.current.filter((l) => l.status === 'waiting').forEach((l) => run(l));
  }, [isOnline, loaded, run]);

  const saveRecording = useCallback(
    (input: NewLecture) => {
      const id = `lec_${Date.now().toString(36)}`;
      const lecture: Lecture = {
        id,
        courseId: input.courseId,
        courseCode: input.courseCode,
        courseTitle: input.courseTitle,
        createdAt: new Date().toISOString(),
        durationSeconds: input.durationSeconds,
        audioUri: persistAudio(input.recordingUri, id),
        status: 'uploading',
        progress: 0,
      };
      setLectures((prev) => [lecture, ...prev]);
      run(lecture);
      return id;
    },
    [run]
  );

  const retryProcessing = useCallback(
    (id: string) => {
      const lecture = lecturesRef.current.find((l) => l.id === id);
      if (lecture) run(lecture);
    },
    [run]
  );

  const deleteLecture = useCallback((id: string) => {
    const lecture = lecturesRef.current.find((l) => l.id === id);
    deleteAudio(lecture?.audioUri);
    setLectures((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const getLecture = useCallback((id: string) => lectures.find((l) => l.id === id), [lectures]);

  return (
    <LecturesContext.Provider
      value={{ lectures, loaded, getLecture, saveRecording, retryProcessing, updateLecture, deleteLecture }}
    >
      {children}
    </LecturesContext.Provider>
  );
}

export function useLectures() {
  const context = useContext(LecturesContext);
  if (!context) throw new Error('useLectures must be used within a LecturesProvider');
  return context;
}

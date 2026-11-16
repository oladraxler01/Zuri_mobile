import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import type { Material, MaterialCategory, MaterialVisibility } from '@/types/material';
import { processMaterial } from '@/services/material-api';
import { ApiError } from '@/services/lecture-api';
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/utils/storage';
import { useNetwork } from '@/context/network-context';
import { onReset } from '@/utils/reset';

export interface NewMaterial {
  uri: string;
  name: string;
  mimeType?: string;
  sizeBytes?: number;
  courseId?: string;
  courseCode?: string;
  courseTitle?: string;
  category: MaterialCategory;
  visibility: MaterialVisibility;
}

interface MaterialsContextType {
  materials: Material[];
  loaded: boolean;
  getMaterial: (id: string) => Material | undefined;
  addMaterial: (input: NewMaterial) => string;
  updateMaterial: (id: string, patch: Partial<Material>) => void;
  retryMaterial: (id: string) => void;
  deleteMaterial: (id: string) => void;
}

const MaterialsContext = createContext<MaterialsContextType | undefined>(undefined);

/** Copy the picked file into the app's own storage so it stays available. */
function persistFile(tempUri: string, id: string, name: string): string {
  if (Platform.OS === 'web') return tempUri;
  try {
    const dir = new Directory(Paths.document, 'materials');
    if (!dir.exists) dir.create({ intermediates: true });
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
    const dest = new File(dir, `${id}${ext}`);
    new File(tempUri).copy(dest);
    return dest.uri;
  } catch (e) {
    console.warn('Could not keep a copy of the material', e);
    return tempUri;
  }
}

function deleteFile(uri?: string) {
  if (!uri || Platform.OS === 'web') return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // already gone
  }
}

export function MaterialsProvider({ children }: { children: React.ReactNode }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loaded, setLoaded] = useState(false);

  // "Delete all my data" empties this store.
  useEffect(() => onReset(() => setMaterials([])), []);
  const ref = useRef<Material[]>([]);
  ref.current = materials;
  const { isOnline } = useNetwork();
  const onlineRef = useRef(isOnline);
  onlineRef.current = isOnline;
  const running = useRef(new Set<string>());
  const titles = useRef(new Map<string, string>()); // material id → course title (for processing)

  useEffect(() => {
    loadJSON<Material[]>(STORAGE_KEYS.materials).then((saved) => {
      if (saved) {
        setMaterials(
          saved.map((m) => (m.status === 'uploading' || m.status === 'processing' ? { ...m, status: 'waiting' } : m))
        );
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) saveJSON(STORAGE_KEYS.materials, materials);
  }, [materials, loaded]);

  const updateMaterial = useCallback((id: string, patch: Partial<Material>) => {
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const run = useCallback(
    async (m: Material) => {
      if (running.current.has(m.id)) return;
      if (!onlineRef.current) {
        updateMaterial(m.id, { status: 'waiting', progress: 0 });
        return;
      }
      running.current.add(m.id);
      updateMaterial(m.id, { status: m.uploaded ? 'processing' : 'uploading', progress: 0, error: undefined });
      try {
        const analysis = await processMaterial(
          {
            uri: m.uri,
            name: m.name,
            mimeType: m.mimeType,
            courseCode: m.courseCode,
            courseTitle: titles.current.get(m.id),
            category: m.category,
            serverId: m.serverId,
            uploaded: m.uploaded,
            onServerId: (serverId) => updateMaterial(m.id, { serverId }),
            onUploaded: () => updateMaterial(m.id, { uploaded: true }),
          },
          (stage, progress) => updateMaterial(m.id, { status: stage, progress })
        );
        updateMaterial(m.id, { status: 'ready', progress: 1, analysis });
      } catch (e) {
        if (e instanceof ApiError && e.kind === 'network') {
          updateMaterial(m.id, { status: 'waiting', progress: 0, error: e.message });
        } else if (e instanceof ApiError && e.kind === 'still-processing') {
          // Uploaded, but the server isn't done yet: keep showing "processing"
          // and check again in a minute (also on next launch).
          updateMaterial(m.id, { status: 'processing', progress: 1, error: undefined });
          setTimeout(() => {
            const latest = ref.current.find((x) => x.id === m.id);
            if (latest?.status === 'processing') run(latest);
          }, 60_000);
        } else {
          updateMaterial(m.id, {
            status: 'failed',
            error: e instanceof Error ? e.message : 'This file could not be processed.',
          });
          if (e instanceof ApiError && e.kind !== 'server') router.push(`/status/${e.kind}` as Href);
        }
      } finally {
        running.current.delete(m.id);
      }
    },
    [updateMaterial]
  );

  useEffect(() => {
    if (!loaded || !isOnline) return;
    ref.current.filter((m) => m.status === 'waiting').forEach((m) => run(m));
  }, [isOnline, loaded, run]);

  const addMaterial = useCallback(
    (input: NewMaterial) => {
      const id = `mat_${Date.now().toString(36)}`;
      const m: Material = {
        id,
        courseId: input.courseId,
        courseCode: input.courseCode,
        name: input.name,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        uri: persistFile(input.uri, id, input.name),
        addedAt: new Date().toISOString(),
        category: input.category,
        visibility: input.visibility,
        status: 'uploading',
        progress: 0,
      };
      if (input.courseTitle) titles.current.set(id, input.courseTitle);
      setMaterials((prev) => [m, ...prev]);
      run(m);
      return id;
    },
    [run]
  );

  const retryMaterial = useCallback(
    (id: string) => {
      const m = ref.current.find((x) => x.id === id);
      if (m) run(m);
    },
    [run]
  );

  const deleteMaterial = useCallback((id: string) => {
    deleteFile(ref.current.find((m) => m.id === id)?.uri);
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const getMaterial = useCallback((id: string) => materials.find((m) => m.id === id), [materials]);

  return (
    <MaterialsContext.Provider
      value={{ materials, loaded, getMaterial, addMaterial, updateMaterial, retryMaterial, deleteMaterial }}
    >
      {children}
    </MaterialsContext.Provider>
  );
}

export function useMaterials() {
  const ctx = useContext(MaterialsContext);
  if (!ctx) throw new Error('useMaterials must be used within a MaterialsProvider');
  return ctx;
}

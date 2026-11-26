import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import type { Material, MaterialCategory, MaterialVisibility } from '@/types/material';
import { processMaterial } from '@/services/material-api';
import { ApiError } from '@/services/lecture-api';
import { currentUser, onAuthChange } from '@/services/api-client';
import { announceChange, onRemoteChange } from '@/services/device-sync';
import {
  deleteServerMaterial,
  listServerMaterials,
  renameServerMaterial,
  type ServerMaterial,
} from '@/services/upload-api';
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
  /** Rename here and on the server (PUT /materials/:id). Throws if the server refuses. */
  renameMaterial: (id: string, title: string) => Promise<void>;
  /** Bring in materials uploaded from another phone (GET /materials). */
  syncFromServer: () => Promise<void>;
  syncing: boolean;
}

/** Server material ids whose delete still has to reach the server (offline when deleted). */
const PENDING_DELETES_KEY = 'zuri.materials.pending-deletes.v1';

/** A material that exists on the server but not on this phone (e.g. uploaded from another device). */
function fromServer(s: ServerMaterial): Material {
  const status = String(s.processing_status ?? '').toLowerCase();
  const title = s.title || 'Document';
  return {
    id: `srv_${s.id}`,
    serverId: s.id,
    uploaded: true,
    name: title,
    mimeType: s.mime_type || undefined,
    sizeBytes: typeof s.file_size === 'number' && s.file_size > 0 ? s.file_size : undefined,
    uri: '',
    addedAt: s.created_at || new Date().toISOString(),
    category: 'other',
    visibility: 'private',
    status: status === 'completed' ? 'ready' : status === 'failed' ? 'failed' : status === 'processing' ? 'processing' : 'failed',
    error:
      status === 'failed'
        ? 'Zuri couldn’t read this file.'
        : status === 'pending'
          ? 'This upload didn’t finish on the other device. Upload the file again from there.'
          : undefined,
    analysis:
      status === 'completed'
        ? { source: 'server', title, summary: '', concepts: [], questions: [], passages: [] }
        : undefined,
  };
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
    // copy() is async in this SDK: copy synchronously so the file is complete before it's used.
    if (dest.exists) dest.delete();
    new File(tempUri).copySync(dest);
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
  const pendingDeletes = useRef<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const titles = useRef(new Map<string, string>()); // material id → course title (for processing)

  useEffect(() => {
    loadJSON<string[]>(PENDING_DELETES_KEY).then((ids) => {
      pendingDeletes.current = ids ?? [];
    });
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
            sizeBytes: m.sizeBytes,
            serverId: m.serverId,
            uploaded: m.uploaded,
            onServerId: (serverId) => updateMaterial(m.id, { serverId }),
            onUploaded: () => updateMaterial(m.id, { uploaded: true }),
          },
          (stage, progress) => updateMaterial(m.id, { status: stage, progress })
        );
        updateMaterial(m.id, { status: 'ready', progress: 1, analysis });
        announceChange('materials');
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

  const flushDeletes = useCallback(async () => {
    if (!currentUser() || !pendingDeletes.current.length) return;
    for (const serverId of [...pendingDeletes.current]) {
      try {
        await deleteServerMaterial(serverId);
        pendingDeletes.current = pendingDeletes.current.filter((x) => x !== serverId);
      } catch {
        break; // offline or server trouble: try again later
      }
    }
    saveJSON(PENDING_DELETES_KEY, pendingDeletes.current);
  }, []);

  const deleteMaterial = useCallback(
    (id: string) => {
      const m = ref.current.find((x) => x.id === id);
      deleteFile(m?.uri);
      setMaterials((prev) => prev.filter((x) => x.id !== id));
      if (m?.serverId) {
        pendingDeletes.current = [...pendingDeletes.current.filter((x) => x !== m.serverId), m.serverId];
        saveJSON(PENDING_DELETES_KEY, pendingDeletes.current);
        flushDeletes().then(() => announceChange('materials'));
      }
    },
    [flushDeletes]
  );

  const renameMaterial = useCallback(async (id: string, title: string) => {
    const clean = title.trim();
    const m = ref.current.find((x) => x.id === id);
    if (!m || !clean) return;
    if (m.serverId && currentUser()) {
      await renameServerMaterial(m.serverId, clean);
      announceChange('materials');
    }
    setMaterials((prev) =>
      prev.map((x) => (x.id === id ? { ...x, analysis: x.analysis ? { ...x.analysis, title: clean } : x.analysis, name: x.analysis ? x.name : clean } : x))
    );
  }, []);

  const syncFromServer = useCallback(async () => {
    if (!currentUser()) return;
    setSyncing(true);
    try {
      await flushDeletes();
      const server = await listServerMaterials();
      const known = new Set(ref.current.map((m) => m.serverId).filter(Boolean));
      const deleted = new Set(pendingDeletes.current);
      const missing = server.filter((s) => s.id && !known.has(s.id) && !deleted.has(s.id)).map(fromServer);

      // Deleted or renamed on another device. Only trust "gone" when we have the full list.
      const byId = new Map(server.map((s) => [s.id, s]));
      const complete = server.length < 300;
      setMaterials((prev) => {
        let changed = false;
        const next = prev
          .filter((m) => {
            const gone = complete && m.serverId && m.uploaded && !byId.has(m.serverId) && (m.status === 'ready' || m.status === 'failed');
            if (gone) {
              changed = true;
              deleteFile(m.uri);
            }
            return !gone;
          })
          .map((m) => {
            const s = m.serverId ? byId.get(m.serverId) : undefined;
            if (s?.title && m.analysis && m.analysis.title !== s.title && m.status === 'ready') {
              changed = true;
              return { ...m, analysis: { ...m.analysis, title: s.title } };
            }
            return m;
          });
        return changed ? next : prev;
      });

      if (missing.length) {
        setMaterials((prev) => {
          const have = new Set(prev.map((m) => m.serverId).filter(Boolean));
          const add = missing.filter((m) => !have.has(m.serverId));
          return [...prev, ...add].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
        });
        // Ones still being read on the server: keep checking.
        missing.filter((m) => m.status === 'processing').forEach((m) => setTimeout(() => run(m), 500));
      }
    } catch (e) {
      console.warn('[materials] sync from server failed', e);
    } finally {
      setSyncing(false);
    }
  }, [flushDeletes, run]);

  // Sync when the app opens signed in, and on every sign-in.
  useEffect(() => {
    if (!loaded) return;
    syncFromServer();
    return onAuthChange((user) => {
      if (user) syncFromServer();
    });
  }, [loaded, syncFromServer]);

  useEffect(() => {
    if (loaded && isOnline) flushDeletes();
  }, [loaded, isOnline, flushDeletes]);

  // Another of the student's devices changed their materials: re-sync.
  useEffect(() => {
    if (!loaded) return;
    return onRemoteChange('materials', () => {
      syncFromServer();
    });
  }, [loaded, syncFromServer]);

  const getMaterial = useCallback((id: string) => materials.find((m) => m.id === id), [materials]);

  return (
    <MaterialsContext.Provider
      value={{
        materials,
        loaded,
        getMaterial,
        addMaterial,
        updateMaterial,
        retryMaterial,
        deleteMaterial,
        renameMaterial,
        syncFromServer,
        syncing,
      }}
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

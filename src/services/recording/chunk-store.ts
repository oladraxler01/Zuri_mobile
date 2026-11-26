import { Directory, File, Paths } from 'expo-file-system';
import type { ChunkMeta, ChunkStore } from './chunked-recorder';

/**
 * Chunks live in <documents>/recordings/<sessionId>/chunk-0001.m4a, next to a
 * manifest.json. Documents (not cache) so the OS never deletes a chunk that
 * hasn't been uploaded yet.
 */
function sessionDir(sessionId: string): Directory {
  const dir = new Directory(Paths.document, 'recordings', sessionId);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export const fileChunkStore: ChunkStore = {
  async save(sessionId, seq, tempUri) {
    const source = new File(tempUri);
    const dest = new File(sessionDir(sessionId), `chunk-${String(seq).padStart(4, '0')}${source.extension || '.m4a'}`);
    if (dest.exists) dest.delete();
    await source.copy(dest);
    try {
      source.delete();
    } catch {
      // the recorder may still hold the temp file; the OS cleans the cache later
    }
    return { uri: dest.uri, bytes: dest.size ?? null };
  },
  async writeManifest(sessionId, chunks) {
    const f = new File(sessionDir(sessionId), 'manifest.json');
    f.write(JSON.stringify({ version: 1, chunks }));
  },
  async readManifest(sessionId) {
    const f = new File(sessionDir(sessionId), 'manifest.json');
    if (!f.exists) return [];
    try {
      const parsed = JSON.parse(await f.text()) as { chunks?: ChunkMeta[] };
      return parsed.chunks ?? [];
    } catch {
      return [];
    }
  },
  async remove(uri) {
    const f = new File(uri);
    if (f.exists) f.delete();
  },
};

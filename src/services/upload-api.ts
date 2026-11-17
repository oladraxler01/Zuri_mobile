import { Platform } from 'react-native';
import { File, UploadType } from 'expo-file-system';
import { ApiError, apiRequest } from '@/services/api-client';

/**
 * Sending a file (study material or lecture recording) to Zuri.
 *
 *   1. POST /materials                     { title, mime_type, file_size }     → { id, processing_status: "pending" }
 *   2. POST /materials/{id}/presign        { action: "upload" }                → { url, expires_at } (15 min)
 *   3. PUT  <url>                          raw file bytes (no auth header: the URL is signed)
 *   4. POST /webhooks/material-uploaded    { material_id }                     → starts processing ("processing")
 *   5. GET  /materials/{id}                poll until processing_status is "completed" or "failed"
 *
 * The server id is handed back through onServerId as soon as it exists, so a
 * retry after a crash or lost connection continues the same upload instead of
 * creating a duplicate. A retry that finds the material still "pending" sends
 * step 4 again (or the file again, if the server says it never arrived).
 */

export type UploadStage = 'uploading' | 'processing';

export interface ServerMaterial {
  id: string;
  title?: string;
  processing_status?: string;
  transcription_status?: string;
  [key: string]: any;
}

export interface UploadInput {
  uri: string;
  name: string;
  mimeType: string;
  title: string;
  /** Size in bytes, when known (the server stores it with the material). */
  sizeBytes?: number;
  /** Set when this file was already sent in an earlier attempt. */
  serverId?: string;
  /** Set once the bytes are on storage, so a retry skips straight to waiting. */
  uploaded?: boolean;
  onServerId?: (id: string) => void;
  onUploaded?: () => void;
  onProgress: (stage: UploadStage, progress?: number) => void;
  /** How long to wait for processing before giving up for now. */
  waitMs?: number;
}

const DONE = new Set(['completed', 'complete', 'done', 'processed', 'ready', 'success', 'succeeded']);
const FAILED = new Set(['failed', 'error', 'errored']);

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function putFile(url: string, input: UploadInput): Promise<void> {
  const headers = { 'Content-Type': input.mimeType };
  try {
    if (Platform.OS === 'web') {
      const blob = await (await fetch(input.uri)).blob();
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', url);
        xhr.setRequestHeader('Content-Type', input.mimeType);
        xhr.upload.onprogress = (e) => e.lengthComputable && input.onProgress('uploading', e.loaded / e.total);
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new ApiError('server', `The file upload failed (${xhr.status}). Please try again.`));
        xhr.onerror = () => reject(new ApiError('network', 'No connection. We’ll upload when you’re back online.'));
        xhr.send(blob);
      });
      return;
    }
    const result = await new File(input.uri).upload(url, {
      httpMethod: 'PUT',
      uploadType: UploadType.BINARY_CONTENT,
      headers,
      mimeType: input.mimeType,
      // expo-file-system reports these as BigInt on some platforms; progress must be a plain number.
      onProgress: ({ bytesSent, totalBytes }) => {
        const sent = Number(bytesSent);
        const total = Number(totalBytes);
        if (total > 0) input.onProgress('uploading', Math.min(1, sent / total));
      },
    });
    if (result.status < 200 || result.status >= 300) {
      throw new ApiError('server', `The file upload failed (${result.status}). Please try again.`);
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError('network', 'No connection. We’ll upload when you’re back online.');
  }
}

// ─── The user's materials on the server ──────────────────────────

/** GET /materials?limit&offset → { data: ServerMaterial[] } (all pages, up to `max`). */
export async function listServerMaterials(max = 300): Promise<ServerMaterial[]> {
  const out: ServerMaterial[] = [];
  for (let offset = 0; offset < max; offset += 100) {
    const page = await apiRequest<{ data?: ServerMaterial[] | null }>('/materials', {
      query: { limit: '100', offset: String(offset) },
    });
    const items = page.data ?? [];
    out.push(...items);
    if (items.length < 100) break;
  }
  return out;
}

/** PUT /materials/{id} { title } */
export async function renameServerMaterial(id: string, title: string): Promise<void> {
  await apiRequest(`/materials/${id}`, { method: 'PUT', body: { title: title.slice(0, 255) } });
}

/** DELETE /materials/{id} → 204. A 404 means it's already gone, which is fine. */
export async function deleteServerMaterial(id: string): Promise<void> {
  try {
    await apiRequest(`/materials/${id}`, { method: 'DELETE' });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return;
    throw e;
  }
}

/** Why processing failed, in words a student understands. */
function failureMessage(mimeType: string): string {
  if (mimeType.startsWith('audio/')) {
    return 'Zuri can’t transcribe recordings yet. Your recording is saved on this phone.';
  }
  if (mimeType !== 'application/pdf' && !mimeType.startsWith('text/')) {
    return 'Zuri can only read PDF and text files for now. Try a PDF version of this file.';
  }
  return 'Zuri couldn’t read this file. If it’s a scanned PDF, try one with selectable text.';
}

async function sendFile(id: string, input: UploadInput): Promise<void> {
  input.onProgress('uploading', 0);
  const presigned = await apiRequest<{ data: { url: string } }>(`/materials/${id}/presign`, {
    method: 'POST',
    body: { action: 'upload' },
  });
  await putFile(presigned.data.url, input);
  input.onUploaded?.();
}

/** Tell the server the file is on storage, which starts processing. Returns false if the file isn't there. */
async function confirmUpload(id: string): Promise<boolean> {
  try {
    await apiRequest(`/webhooks/material-uploaded`, { method: 'POST', body: { material_id: id } });
    return true;
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) return false; // "file has not been uploaded yet"
    throw e;
  }
}

/** Upload a file and wait for Zuri to process it. Returns the finished server record. */
export async function uploadToZuri(input: UploadInput): Promise<ServerMaterial> {
  let id = input.serverId;
  if (!id) {
    input.onProgress('uploading', 0);
    const created = await apiRequest<{ data: ServerMaterial }>('/materials', {
      method: 'POST',
      body: {
        title: input.title.slice(0, 255),
        mime_type: input.mimeType,
        ...(input.sizeBytes ? { file_size: input.sizeBytes } : {}),
      },
    });
    id = created.data.id;
    input.onServerId?.(id);
  }

  if (!input.uploaded) await sendFile(id, input);

  // Start processing if it hasn't started yet (also covers retries after a lost connection).
  input.onProgress('processing', 0);
  const current = await apiRequest<{ data: ServerMaterial }>(`/materials/${id}`);
  if (String(current.data.processing_status ?? '').toLowerCase() === 'pending') {
    if (!(await confirmUpload(id))) {
      // The server never got the file: send it again, then confirm.
      await sendFile(id, input);
      input.onProgress('processing', 0);
      if (!(await confirmUpload(id))) {
        throw new ApiError('server', 'The file didn’t reach Zuri. Please try again.');
      }
    }
  }

  // Wait for the server to finish. We check every few seconds.
  const deadline = Date.now() + (input.waitMs ?? 120_000);
  let delay = 2000;
  while (true) {
    const { data } = await apiRequest<{ data: ServerMaterial }>(`/materials/${id}`);
    const status = String(data.processing_status ?? '').toLowerCase();
    if (DONE.has(status)) {
      input.onProgress('processing', 1);
      return data;
    }
    if (FAILED.has(status)) {
      throw new ApiError('server', failureMessage(input.mimeType));
    }
    if (Date.now() > deadline) {
      throw new ApiError(
        'still-processing',
        'Uploaded. Zuri is still working on it, and we’ll check again shortly.'
      );
    }
    await wait(delay);
    delay = Math.min(delay * 1.5, 8000);
  }
}

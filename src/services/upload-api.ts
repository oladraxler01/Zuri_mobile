import { Platform } from 'react-native';
import { File, UploadType } from 'expo-file-system';
import { ApiError, apiRequest } from '@/services/api-client';

/**
 * Sending a file (study material or lecture recording) to Zuri.
 *
 *   1. POST /materials                 { title, ... }               → { id, processing_status }
 *   2. POST /materials/{id}/presign    { content_type, filename }   → { url } on storage.zurilearn.com
 *   3. PUT  <url>                      raw file bytes (no auth header: the URL is signed)
 *   4. GET  /materials/{id}            poll until processing_status is finished
 *
 * The server id is handed back through onServerId as soon as it exists, so a
 * retry after a crash or lost connection checks the same upload instead of
 * creating a duplicate.
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
  courseCode?: string;
  courseTitle?: string;
  category?: string;
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
      onProgress: ({ bytesSent, totalBytes }) => {
        if (totalBytes > 0) input.onProgress('uploading', bytesSent / totalBytes);
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

/** Upload a file and wait for Zuri to process it. Returns the finished server record. */
export async function uploadToZuri(input: UploadInput): Promise<ServerMaterial> {
  if (!input.uploaded) input.onProgress('uploading', 0);

  let id = input.serverId;
  if (!id) {
    const created = await apiRequest<{ data: ServerMaterial }>('/materials', {
      method: 'POST',
      body: {
        title: input.title,
        course_code: input.courseCode,
        course_title: input.courseTitle,
        category: input.category,
        content_type: input.mimeType,
        filename: input.name,
      },
    });
    id = created.data.id;
    input.onServerId?.(id);
  }

  if (!input.uploaded) {
    const presigned = await apiRequest<{ data: { url: string } }>(`/materials/${id}/presign`, {
      method: 'POST',
      body: { content_type: input.mimeType, filename: input.name },
    });
    await putFile(presigned.data.url, input);
    input.onUploaded?.();
  }

  // Wait for the server to finish. Processing runs on Zuri's side; we check every few seconds.
  input.onProgress('processing', 0);
  const deadline = Date.now() + (input.waitMs ?? 90_000);
  let delay = 2000;
  while (true) {
    const { data } = await apiRequest<{ data: ServerMaterial }>(`/materials/${id}`);
    const status = String(data.processing_status ?? '').toLowerCase();
    if (DONE.has(status)) {
      input.onProgress('processing', 1);
      return data;
    }
    if (FAILED.has(status)) {
      throw new ApiError('server', 'Zuri couldn’t process this file. Try uploading it again.');
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

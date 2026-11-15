import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import type { MaterialAnalysis, MaterialCategory, MaterialPassage } from '@/types/material';
import { API_BASE, ApiError, errorForStatus, isBackendConfigured } from '@/services/lecture-api';
import { buildSampleAnalysis } from '@/data/sample-lecture-analysis';

/**
 * Material upload + processing.
 *
 * Backend: POST {base}/materials/process (multipart: file, course_code, category)
 * → { title, summary, concepts[], questions[], passages[{ location, text }] }.
 *
 * Until the backend is connected:
 * - plain text / Markdown files get a basic analysis done on the phone
 *   (summary + passages taken from the real text);
 * - other files (PDF, Word, images) get clearly labelled sample results.
 */

export interface ProcessMaterialInput {
  uri: string;
  name: string;
  mimeType?: string;
  courseCode?: string;
  courseTitle?: string;
  category: MaterialCategory;
}

type Progress = (stage: 'uploading' | 'processing', progress?: number) => void;

export function isTextFile(name: string, mimeType?: string) {
  return /^text\//.test(mimeType ?? '') || /\.(txt|md|markdown|csv)$/i.test(name);
}

export async function processMaterial(input: ProcessMaterialInput, onProgress: Progress): Promise<MaterialAnalysis> {
  if (isBackendConfigured) return uploadToBackend(input, onProgress);
  return processLocally(input, onProgress);
}

// ─── Real backend ─────────────────────────────────────────────────

async function uploadToBackend(input: ProcessMaterialInput, onProgress: Progress): Promise<MaterialAnalysis> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(input.uri)).blob();
    form.append('file', blob, input.name);
  } else {
    form.append('file', { uri: input.uri, name: input.name, type: input.mimeType ?? 'application/octet-stream' } as unknown as Blob);
  }
  if (input.courseCode) form.append('course_code', input.courseCode);
  form.append('category', input.category);

  const json = await new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/materials/process`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress('uploading', e.loaded / e.total);
    xhr.upload.onload = () => onProgress('processing');
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new ApiError('server', 'The server sent a response we could not read.'));
        }
      } else reject(errorForStatus(xhr.status));
    };
    xhr.onerror = () => reject(new ApiError('network', 'No connection. We’ll upload when you’re back online.'));
    onProgress('uploading', 0);
    xhr.send(form);
  });

  const data = json?.data ?? json;
  return {
    source: 'server',
    title: data.title ?? input.name,
    summary: data.summary ?? '',
    concepts: (data.concepts ?? []).map((c: any, i: number) => ({
      id: String(c.id ?? i),
      title: c.title,
      summary: c.summary,
      icon: 'bulb-outline',
    })),
    questions: (data.questions ?? []).map((q: any, i: number) => ({
      id: String(q.id ?? i),
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation ?? '',
    })),
    passages: (data.passages ?? []).map((p: any, i: number) => ({
      id: String(p.id ?? i),
      location: p.location ?? `Part ${i + 1}`,
      text: p.text,
    })),
  };
}

// ─── On the phone ─────────────────────────────────────────────────

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function readText(uri: string): Promise<string> {
  if (Platform.OS === 'web') return (await fetch(uri)).text();
  return new File(uri).text();
}

function titleFromName(name: string) {
  return name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

async function processLocally(input: ProcessMaterialInput, onProgress: Progress): Promise<MaterialAnalysis> {
  for (let i = 0; i <= 5; i++) {
    onProgress('uploading', i / 5);
    await wait(120);
  }
  onProgress('processing', 0.2);

  if (isTextFile(input.name, input.mimeType)) {
    const text = (await readText(input.uri)).replace(/\r/g, '').slice(0, 200_000);
    await wait(500);
    return analyseText(text, input);
  }

  await wait(1600);
  onProgress('processing', 1);
  // Sample results reuse the lecture sample so concepts/questions match.
  const sample = buildSampleAnalysis({
    courseCode: input.courseCode ?? '',
    courseTitle: input.courseTitle ?? '',
    durationSeconds: 60,
  });
  return {
    source: 'sample',
    title: titleFromName(input.name),
    summary: sample.summary,
    concepts: sample.concepts,
    questions: sample.questions.slice(0, 3),
    passages: sample.transcript.slice(1, 9).map((seg, i) => ({
      id: `p${i}`,
      location: `p. ${i + 2}`,
      text: seg.text,
    })),
  };
}

/** Basic, honest analysis of a text file: its own headings, opening and paragraphs. */
export function analyseText(text: string, input: ProcessMaterialInput): MaterialAnalysis {
  const lines = text.split('\n');
  const headings = lines
    .map((l) => l.trim())
    .filter((l) => /^#{1,3}\s+\S/.test(l))
    .map((l) => l.replace(/^#+\s*/, ''));
  const firstLine = lines.find((l) => l.trim())?.replace(/^#+\s*/, '').trim();

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/^#+\s.*$/gm, '').replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 40);

  const sentences = (paragraphs.join(' ').match(/[^.!?]+[.!?]+/g) ?? []).map((s) => s.trim());
  const summary = sentences.slice(0, 3).join(' ') || paragraphs[0]?.slice(0, 300) || 'This document has no readable text.';

  const passages: MaterialPassage[] = paragraphs.slice(0, 20).map((p, i) => ({
    id: `p${i}`,
    location: `Section ${i + 1}`,
    text: p.length > 420 ? `${p.slice(0, 420).trim()}…` : p,
  }));

  const title = firstLine && firstLine.length < 90 ? firstLine : titleFromName(input.name);
  return {
    source: 'local',
    title,
    summary,
    concepts: headings.filter((h) => h !== title).slice(0, 6).map((h, i) => {
      const body = paragraphs.find((p) => p.toLowerCase().includes(h.toLowerCase().split(' ')[0])) ?? '';
      return { id: `c${i}`, title: h, summary: body.slice(0, 140), icon: 'bookmark-outline' };
    }),
    questions: [],
    passages,
  };
}

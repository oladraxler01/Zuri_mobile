import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import type { MaterialAnalysis, MaterialCategory, MaterialPassage } from '@/types/material';
import { isBackendConfigured } from '@/services/api-config';
import { uploadToZuri } from '@/services/upload-api';
import { summariseMaterial } from '@/services/ai-api';
import { ApiError } from '@/services/api-client';

/**
 * Material upload + processing.
 *
 * Backend: the file is sent with uploadToZuri (create → signed upload →
 * confirm → wait for processing), then Zuri's AI (reading.analyse) writes the
 * summary, key points and key terms. Practice questions and quotable passages
 * come in a later step.
 *
 * With the live API off (EXPO_PUBLIC_USE_LIVE_API=false), plain text and
 * Markdown files get a basic analysis on the phone from their real text;
 * other files fail with a clear message. Nothing is made up.
 */

export interface ProcessMaterialInput {
  uri: string;
  name: string;
  mimeType?: string;
  courseCode?: string;
  courseTitle?: string;
  category: MaterialCategory;
  sizeBytes?: number;
  /** From an earlier attempt, so retries don't upload twice. */
  serverId?: string;
  uploaded?: boolean;
  onServerId?: (id: string) => void;
  onUploaded?: () => void;
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
  const record = await uploadToZuri({
    uri: input.uri,
    name: input.name,
    mimeType: input.mimeType || guessMimeType(input.name),
    title: titleFromName(input.name) || input.name,
    sizeBytes: input.sizeBytes,
    serverId: input.serverId,
    uploaded: input.uploaded,
    onServerId: input.onServerId,
    onUploaded: input.onUploaded,
    onProgress,
  });

  // The server has read the file. Ask Zuri's AI for the summary and key terms.
  let summary = '';
  let concepts: MaterialAnalysis['concepts'] = [];
  try {
    const ai = await summariseMaterial(record.id);
    const takeaways = (ai.key_takeaways ?? []).filter(Boolean);
    summary = [ai.summary, ...takeaways.map((k) => `• ${k}`)].filter(Boolean).join('\n\n');
    concepts = (ai.vocab_terms ?? [])
      .filter((v) => v?.term)
      .slice(0, 8)
      .map((v, i) => ({ id: `c${i}`, title: v.term, summary: v.definition ?? '', icon: 'bulb-outline' }));
  } catch (e) {
    summary = `Zuri has read this file, but the summary isn’t available right now (${
      e instanceof Error ? e.message : 'unknown error'
    }). Open it again later.`;
  }

  return {
    source: 'server',
    title: record.title ?? titleFromName(input.name),
    summary,
    concepts,
    questions: [],
    passages: [],
  };
}

function guessMimeType(name: string): string {
  if (/\.pdf$/i.test(name)) return 'application/pdf';
  if (/\.(md|markdown)$/i.test(name)) return 'text/markdown';
  if (/\.csv$/i.test(name)) return 'text/csv';
  if (/\.txt$/i.test(name)) return 'text/plain';
  return 'application/octet-stream';
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

  // No made-up results for PDFs and other files: they need Zuri's server.
  throw new ApiError('server', 'Reading this file needs Zuri’s server, which is switched off in this build.');
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

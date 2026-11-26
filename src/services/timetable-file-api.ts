import { ApiError } from '@/services/api-client';
import { uploadToZuri, deleteServerMaterial } from '@/services/upload-api';
import { askZuri, searchMaterial } from '@/services/ai-api';

/**
 * Read a timetable PDF using Zuri's server. The PDF is sent the same way as
 * study material (the server pulls the text out of it), we fetch that text
 * back, then remove the file again so it doesn't show up in Materials.
 *
 * Returns the timetable as text: either the PDF's own lines, or (when those
 * can't be read line by line) the AI's rewrite of them as one class per line.
 */

const QUERIES = [
  'timetable lecture time venue',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
  '8:00 9:00 10:00 11:00 12:00',
  '1:00 2:00 3:00 4:00 5:00',
];

export async function readTimetablePdf(
  file: { uri: string; name: string; mimeType: string; sizeBytes?: number },
  onStage: (text: string) => void
): Promise<{ text: string; aiText?: string }> {
  onStage('Uploading your timetable…');
  const material = await uploadToZuri({
    uri: file.uri,
    name: file.name,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    title: `Timetable: ${file.name}`.slice(0, 120),
    waitMs: 120_000,
    onProgress: (stage) => onStage(stage === 'uploading' ? 'Uploading your timetable…' : 'Reading your timetable…'),
  });

  try {
    onStage('Finding your classes…');
    const seen = new Set<string>();
    const chunks: string[] = [];
    for (const q of QUERIES) {
      const hits = await searchMaterial(material.id, q, 10).catch(() => []);
      for (const h of hits) {
        const key = h.chunk_index !== undefined ? String(h.chunk_index) : h.text.slice(0, 80);
        if (seen.has(key)) continue;
        seen.add(key);
        chunks.push(h.text);
      }
    }
    if (!chunks.length) throw new ApiError('server', 'Zuri couldn’t find any text in this PDF. If it’s a scan or photo, it can’t be read yet.');
    const text = chunks.join('\n');

    // Tables often come out as runs of words, not one class per line, so
    // also ask the AI to rewrite them. If the AI is unavailable we still try the raw text.
    let aiText: string | undefined;
    try {
      onStage('Sorting out days and times…');
      aiText = await askZuri(
        'Rewrite this university lecture timetable as plain lines, one class per line, in exactly this format:\n' +
          'COURSE CODE, Day, start time, end time, venue\n' +
          'Example: CSC 101, Monday, 08:00 AM, 10:00 AM, LT 1\n' +
          'Include every class you can find. Output only the lines, nothing else.',
        chunks.slice(0, 5),
        []
      );
    } catch {
      aiText = undefined;
    }
    return { text, aiText: aiText?.replace(/[*_`]/g, '') };
  } finally {
    deleteServerMaterial(material.id).catch(() => {});
  }
}

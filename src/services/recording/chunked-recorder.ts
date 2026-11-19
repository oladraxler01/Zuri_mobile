/**
 * Chunked lecture recording (Phase 0 spike for Phase 4).
 *
 * A lecture is recorded as a run of short segments ("chunks", 30–60 s each)
 * instead of one long file, so that:
 *  - a crash, a killed app or a dead battery loses at most one chunk;
 *  - each chunk can be uploaded as soon as it closes, with a sequence number,
 *    and deleted from the phone only after the server acknowledges it.
 *
 * Rotation is stop → prepare → start on the same recorder. The cost is a short
 * gap between chunks, which this module measures (`gapBeforeMs` per chunk) so
 * we can decide on real phones whether it's acceptable or whether we need a
 * native gapless recorder (see docs/spikes/RECORDING_SPIKE.md).
 *
 * The engine talks to the platform through two small interfaces, so its logic
 * runs in unit tests without a phone: `SegmentRecorder` (expo-audio in the app)
 * and `ChunkStore` (expo-file-system in the app).
 */

export interface SegmentRecorder {
  /** Prepare a new file for recording. */
  prepare(): Promise<void>;
  start(): void;
  /** Stop and return the finished file's uri (null if nothing was written). */
  stop(): Promise<string | null>;
}

export interface ChunkMeta {
  seq: number;
  /** where the chunk lives on the phone (after the store has moved it) */
  uri: string;
  startedAt: number;
  durationMs: number;
  /** audio missed between the previous chunk ending and this one starting */
  gapBeforeMs: number;
  bytes: number | null;
  /** true once the server has confirmed it received this chunk */
  acked: boolean;
}

export interface ChunkStore {
  /** Move a finished segment into the session's folder; returns its new uri and size. */
  save(sessionId: string, seq: number, tempUri: string): Promise<{ uri: string; bytes: number | null }>;
  writeManifest(sessionId: string, chunks: ChunkMeta[]): Promise<void>;
  readManifest(sessionId: string): Promise<ChunkMeta[]>;
  remove(uri: string): Promise<void>;
}

export interface Clock {
  now(): number;
  setInterval(fn: () => void, ms: number): unknown;
  clearInterval(handle: unknown): void;
}

export const realClock: Clock = {
  now: () => Date.now(),
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearInterval: (h) => clearInterval(h as ReturnType<typeof setInterval>),
};

export interface RecordingStats {
  chunks: number;
  recordedMs: number;
  totalGapMs: number;
  maxGapMs: number;
  avgGapMs: number;
  bytes: number;
  unacked: number;
}

export type ChunkEvent = { type: 'chunk'; chunk: ChunkMeta } | { type: 'error'; error: Error };

export interface ChunkedRecorderOptions {
  sessionId: string;
  /** length of each chunk in seconds (30–60 recommended) */
  segmentSeconds: number;
  recorder: SegmentRecorder;
  store: ChunkStore;
  clock?: Clock;
  onEvent?: (e: ChunkEvent) => void;
}

export function computeStats(chunks: ChunkMeta[]): RecordingStats {
  const gaps = chunks.slice(1).map((c) => c.gapBeforeMs);
  const totalGapMs = gaps.reduce((a, b) => a + b, 0);
  return {
    chunks: chunks.length,
    recordedMs: chunks.reduce((a, c) => a + c.durationMs, 0),
    totalGapMs,
    maxGapMs: gaps.length ? Math.max(...gaps) : 0,
    avgGapMs: gaps.length ? Math.round(totalGapMs / gaps.length) : 0,
    bytes: chunks.reduce((a, c) => a + (c.bytes ?? 0), 0),
    unacked: chunks.filter((c) => !c.acked).length,
  };
}

export class ChunkedRecorder {
  private chunks: ChunkMeta[] = [];
  private seq = 0;
  private segStart = 0;
  private gapBefore = 0;
  private timer: unknown = null;
  private rotating = false;
  private running = false;
  private readonly clock: Clock;

  constructor(private readonly opts: ChunkedRecorderOptions) {
    this.clock = opts.clock ?? realClock;
  }

  get isRunning() {
    return this.running;
  }

  get list(): readonly ChunkMeta[] {
    return this.chunks;
  }

  stats(): RecordingStats {
    return computeStats(this.chunks);
  }

  /** Resume a session after an app restart: chunks already on the phone are kept, numbering continues. */
  async restore(): Promise<void> {
    this.chunks = await this.opts.store.readManifest(this.opts.sessionId);
    this.seq = this.chunks.reduce((m, c) => Math.max(m, c.seq), 0);
  }

  async start(): Promise<void> {
    if (this.running) return;
    await this.opts.recorder.prepare();
    this.opts.recorder.start();
    this.segStart = this.clock.now();
    this.gapBefore = 0;
    this.running = true;
    this.timer = this.clock.setInterval(() => {
      if (this.clock.now() - this.segStart >= this.opts.segmentSeconds * 1000) void this.rotate();
    }, 500);
  }

  /** Close the current chunk and start the next one straight away. */
  async rotate(): Promise<void> {
    if (!this.running || this.rotating) return;
    this.rotating = true;
    try {
      const t0 = this.clock.now();
      await this.closeSegment(t0);
      await this.opts.recorder.prepare();
      this.opts.recorder.start();
      const t1 = this.clock.now();
      this.segStart = t1;
      this.gapBefore = t1 - t0;
    } catch (e) {
      this.emit({ type: 'error', error: e as Error });
      // Try to keep recording: a lost chunk is better than a lost lecture.
      try {
        await this.opts.recorder.prepare();
        this.opts.recorder.start();
        this.segStart = this.clock.now();
      } catch (e2) {
        this.running = false;
        this.clearTimer();
        this.emit({ type: 'error', error: e2 as Error });
      }
    } finally {
      this.rotating = false;
    }
  }

  async stop(): Promise<ChunkMeta[]> {
    if (!this.running) return this.chunks;
    this.clearTimer();
    this.running = false;
    await this.closeSegment(this.clock.now());
    return this.chunks;
  }

  /** The server confirmed it has chunk `seq`: mark it and free the phone's storage. */
  async ack(seq: number): Promise<void> {
    const c = this.chunks.find((x) => x.seq === seq);
    if (!c || c.acked) return;
    c.acked = true;
    await this.opts.store.remove(c.uri);
    await this.opts.store.writeManifest(this.opts.sessionId, this.chunks);
  }

  private async closeSegment(endedAt: number) {
    const uri = await this.opts.recorder.stop();
    if (!uri) return;
    const seq = ++this.seq;
    const saved = await this.opts.store.save(this.opts.sessionId, seq, uri);
    const chunk: ChunkMeta = {
      seq,
      uri: saved.uri,
      startedAt: this.segStart,
      durationMs: endedAt - this.segStart,
      gapBeforeMs: this.gapBefore,
      bytes: saved.bytes,
      acked: false,
    };
    this.chunks.push(chunk);
    // Manifest first, so a crash right after still knows about the chunk.
    await this.opts.store.writeManifest(this.opts.sessionId, this.chunks);
    this.emit({ type: 'chunk', chunk });
  }

  private clearTimer() {
    if (this.timer !== null) this.clock.clearInterval(this.timer);
    this.timer = null;
  }

  private emit(e: ChunkEvent) {
    this.opts.onEvent?.(e);
  }
}

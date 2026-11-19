import { ChunkedRecorder, computeStats, type ChunkMeta, type ChunkStore, type Clock, type SegmentRecorder } from '../chunked-recorder';

/** A clock we move by hand; the interval callback runs when we tick. */
function fakeClock() {
  let t = 1_000_000;
  let fn: (() => void) | null = null;
  const clock: Clock = {
    now: () => t,
    setInterval: (f) => {
      fn = f;
      return 1;
    },
    clearInterval: () => {
      fn = null;
    },
  };
  return {
    clock,
    advance: async (ms: number) => {
      t += ms;
      fn?.();
      // let the async rotation finish
      for (let i = 0; i < 10; i++) await Promise.resolve();
    },
    get armed() {
      return fn !== null;
    },
    bump: (ms: number) => {
      t += ms;
    },
  };
}

function fakeRecorder(c: ReturnType<typeof fakeClock>, restartMs = 120) {
  let n = 0;
  const r: SegmentRecorder & { failNextPrepare?: boolean } = {
    prepare: jest.fn(async () => {
      if (r.failNextPrepare) {
        r.failNextPrepare = false;
        throw new Error('prepare failed');
      }
      c.bump(restartMs); // preparing a new file takes time: that's the gap
    }),
    start: jest.fn(),
    stop: jest.fn(async () => `file:///tmp/rec-${++n}.m4a`),
  };
  return r;
}

function memoryStore() {
  const manifests: Record<string, ChunkMeta[]> = {};
  const removed: string[] = [];
  const store: ChunkStore = {
    save: jest.fn(async (sid, seq) => ({ uri: `file:///docs/${sid}/chunk-${seq}.m4a`, bytes: 480_000 })),
    writeManifest: jest.fn(async (sid, chunks) => {
      manifests[sid] = chunks.map((x) => ({ ...x }));
    }),
    readManifest: jest.fn(async (sid) => (manifests[sid] ?? []).map((x) => ({ ...x }))),
    remove: jest.fn(async (uri) => {
      removed.push(uri);
    }),
  };
  return { store, manifests, removed };
}

describe('ChunkedRecorder', () => {
  it('rotates into numbered chunks and measures the gap between them', async () => {
    const c = fakeClock();
    const rec = fakeRecorder(c, 150);
    const { store, manifests } = memoryStore();
    const r = new ChunkedRecorder({ sessionId: 's1', segmentSeconds: 30, recorder: rec, store, clock: c.clock });

    await r.start();
    await c.advance(10_000); // not yet
    expect(r.list).toHaveLength(0);
    await c.advance(20_000); // 30 s: rotate
    await c.advance(30_000); // second rotation
    await r.stop();

    expect(r.list.map((x) => x.seq)).toEqual([1, 2, 3]);
    expect(r.list[0].gapBeforeMs).toBe(0);
    expect(r.list[1].gapBeforeMs).toBe(150);
    expect(r.list[2].gapBeforeMs).toBe(150);
    expect(manifests.s1).toHaveLength(3); // manifest kept in step
    const s = r.stats();
    expect(s).toMatchObject({ chunks: 3, maxGapMs: 150, avgGapMs: 150, totalGapMs: 300, unacked: 3, bytes: 3 * 480_000 });
    expect(c.armed).toBe(false); // timer cleared on stop
  });

  it('keeps recording when one rotation fails', async () => {
    const c = fakeClock();
    const rec = fakeRecorder(c);
    const { store } = memoryStore();
    const events: string[] = [];
    const r = new ChunkedRecorder({ sessionId: 's2', segmentSeconds: 30, recorder: rec, store, clock: c.clock, onEvent: (e) => events.push(e.type) });

    await r.start();
    rec.failNextPrepare = true;
    await c.advance(30_000);
    expect(events).toContain('error');
    expect(r.isRunning).toBe(true); // recovered with a second prepare
    await c.advance(30_000);
    await r.stop();
    expect(r.list.map((x) => x.seq)).toEqual([1, 2, 3]);
  });

  it('frees the phone only after the server acknowledges a chunk', async () => {
    const c = fakeClock();
    const rec = fakeRecorder(c);
    const { store, removed, manifests } = memoryStore();
    const r = new ChunkedRecorder({ sessionId: 's3', segmentSeconds: 30, recorder: rec, store, clock: c.clock });
    await r.start();
    await c.advance(30_000);
    await r.stop();
    expect(removed).toHaveLength(0);
    await r.ack(1);
    await r.ack(1); // idempotent
    expect(removed).toEqual(['file:///docs/s3/chunk-1.m4a']);
    expect(manifests.s3.find((x) => x.seq === 1)?.acked).toBe(true);
    expect(r.stats().unacked).toBe(1);
  });

  it('continues numbering after an app restart', async () => {
    const c = fakeClock();
    const { store } = memoryStore();
    const first = new ChunkedRecorder({ sessionId: 's4', segmentSeconds: 30, recorder: fakeRecorder(c), store, clock: c.clock });
    await first.start();
    await c.advance(30_000);
    await first.stop();

    const second = new ChunkedRecorder({ sessionId: 's4', segmentSeconds: 30, recorder: fakeRecorder(c), store, clock: c.clock });
    await second.restore();
    await second.start();
    await c.advance(5_000);
    await second.stop();
    expect(second.list.map((x) => x.seq)).toEqual([1, 2, 3]);
  });

  it('computeStats handles an empty session', () => {
    expect(computeStats([])).toEqual({ chunks: 0, recordedMs: 0, totalGapMs: 0, maxGapMs: 0, avgGapMs: 0, bytes: 0, unacked: 0 });
  });
});

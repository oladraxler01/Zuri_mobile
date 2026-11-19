# Spike: chunked lecture recording (Phase 0 → Phase 4)

**Status:** code ready, device results pending · **Screen:** `/dev/spike-recording` (dev and preview builds) · **Code:** `src/services/recording/`

## Why chunks

Phase 4 records 1–3 hour lectures on phones that get locked, lose signal and run low on battery. One long file means a crash, a killed app or a dead battery loses the whole lecture. Instead the lecture is recorded as numbered 30–60 s chunks:

- each chunk is saved in `<documents>/recordings/<sessionId>/chunk-0001.m4a` (documents, not cache, so the OS never deletes an un-uploaded chunk), with a `manifest.json` written straight after every chunk;
- in Phase 4 each chunk uploads as soon as it closes to `POST /academic/class-sessions/{id}/audio` with its sequence number (idempotent: re-sending a sequence is safe);
- a chunk is deleted from the phone only when the server acknowledges it (`ChunkedRecorder.ack(seq)`);
- after an app restart, `restore()` reloads the manifest and numbering continues.

## Approach A (built): rotate the recorder

`ChunkedRecorder` stops the expo-audio recorder every N seconds, saves the file, and prepares and starts it again. This needs no native code, but there is a **gap** of unrecorded audio between chunks (the time to stop, prepare a new file and start). The engine measures it per chunk (`gapBeforeMs`).

Acceptable if, on the test phones, the average gap is **under ~250 ms** and the max under ~1 s: at 30 s chunks that's under 1% of the lecture, short enough that a transcript rarely loses a word. 60 s chunks halve the loss but double what a crash can lose.

Unit tests (`src/services/recording/__tests__/chunked-recorder.test.ts`) cover rotation and numbering, gap measurement, recovering when one rotation fails, ack-then-delete, and restoring after a restart.

## Approach B (if gaps are too big): a gapless native recorder

Only if Approach A fails on real phones. A small Expo module (Swift + Kotlin, ~1–2 weeks):

- **Android:** `MediaRecorder.setNextOutputFile()` (API 26+) switches files without stopping, so there's no gap. Runs in the foreground service expo-audio already declares (`enableBackgroundRecording` in `app.json`).
- **iOS:** `AVAudioEngine` with a tap on the input node, writing buffers to an `AVAudioFile` and swapping the file at the chunk boundary (no gap). Needs the `audio` background mode, which `enableBackgroundRecording` adds.
- The JS side keeps the same `SegmentRecorder` interface and `ChunkedRecorder` engine, so the rest of Phase 4 doesn't change.

## Things the device test must answer

1. **Gap per rotation** on each phone (avg and max), at 30 s and 60 s chunks.
2. **Background:** does rotation keep happening with the screen locked for 2 hours? Rotation is driven by a JS timer; JS keeps running while iOS records audio in the background, and Android needs the foreground-service notification. If chunks stop while locked, use `record({ forDuration })` and rotate on the recorder's `isFinished` status event instead, or go to Approach B.
3. **Interruptions:** a phone call, another app taking the microphone, and (iOS) `mediaServicesDidReset`. The engine should report an error and keep going with a new chunk.
4. **Battery and storage:** % battery per hour, and MB per hour (expected ~29 MB/h at 16 kHz mono 64 kbps).
5. **Crash safety:** force-close the app mid-recording; reopen; the manifest must list every chunk up to the crash.

## Device test protocol (needs the development build)

Phones: a low-end Android (2–3 GB RAM), a recent Android, and an iPhone on low-power mode / under 20% battery.

For each phone:

1. Open `/dev/spike-recording`, pick **30 s chunks**, tap **Start recording**, and note the battery %.
2. Lock the screen for 10 minutes. Unlock: the chunk count should be about 20 and still rising.
3. Switch to WhatsApp for 2 minutes, then come back.
4. Turn Wi-Fi off and on twice (no effect yet; it matters once uploads are wired in Phase 4).
5. Place a phone call to it (or record a voice note in another app) for 30 s.
6. Leave it locked to reach **2 hours** total. Tap **Stop recording**. Note: chunks, avg and max gap, errors, size, battery %.
7. Repeat a 10-minute run with **60 s chunks**.
8. Start again, then force-close the app after 3 minutes. Reopen the screen and check the files are still on the phone.

Write the results in a table here: phone, OS, chunk length, chunks, avg gap, max gap, errors, MB/h, battery %/h, survived lock (yes/no).

| Phone | OS | Chunk | Chunks | Avg gap | Max gap | Errors | MB/h | Battery %/h | Locked 2 h OK |
|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | |

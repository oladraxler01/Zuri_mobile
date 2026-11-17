# Handoff: Zuri mobile, Phase 0 → 100%

Date: 2026-11-17 · For: the next Claude Code session (and any agents it starts) · Repo: `oladraxler01/Zuri_mobile`, `main` @ `9d5b540`

Read this first, then `docs/MOBILE_ROADMAP.md` (the plan), `docs/PHASE_0_PLAN.md` (Phase 0 breakdown), `docs/SPEC_ALIGNMENT_REPORT.md` (screen audit + open questions), `docs/BUILDS.md` (builds, OTA, Sentry) and the `zuri-design-system` skill in `.claude/skills/`.

---

## 1. The vision

Zuri is a study assistant for university students (first market: Nigerian universities, e.g. Veritas University). It knows the student's timetable, sits in their lectures, and tells them what to revise before the exam. It should feel like **a calm, capable friend**: quiet Paper screens, one Forest block that says what's next, gold only where it matters.

**The student loop (MVP 1)**, end to end on server data, never phone-only stand-ins:

1. **Sign up and onboard**: institution, courses, timetable, learning preferences ("Examples first", never "learning style").
2. **Before class**: a push reminder 15 minutes before; Home's hero shows the next class with a countdown and **Start class**.
3. **In class**: a full-screen class session. Ask grounded questions (streamed answers with source chips: slide, transcript time, notes page), flag moments ("didn't get this", "important", "exam hint"), and **record** the lecture in chunks that survive a locked screen and a dropped connection.
4. **After class**: the lecture is filed under the course with transcript and notes; a **debrief** walks through flagged topics, explains, quizzes; wrong answers become **follow-ups**.
5. **Exam readiness**: a readiness ring per course and overall, "costs you the most marks", hours needed, and a day-by-day **study plan** that re-plans when the student falls behind.

**Deferred apps** (deferred, *not* scrapped; keep them working and labelled "Preview"): the lecturer app, the school admin dashboard and the research platform. They move onto real backends in Phase 8.

**End goal (100%)**, on real iOS and Android builds against `https://api.zurilearn.com`: the whole student loop works on server data (60%); foundations (design system with light/dark, tests, CI, crash reporting, analytics, OTA, dev/preview/prod builds) (10%); hardening and launch (offline outbox, memory export/delete, accessibility audit, performance budgets, store listings live) (10%); deferred apps on real backends (20%).

## 2. Where it is now (~38%)

Phase 0 (foundations) is mostly done and merged:

| PR | What |
|---|---|
| #7 | `src/theme/`: ThemeProvider, `useTheme()`, `<Text variant>`, Button, Card, ListGroup/ListRow, Chip, TextField, StateView/Skeleton, BottomSheet |
| #9 | Reconciled two parallel theme modules after a bad merge (main was crashing). **One** token source: `scripts/generate-theme-tokens.py` → `src/theme/tokens.ts` (`npm run tokens`, `tokens:check`) |
| #8 | `docs/PHASE_0_PLAN.md` |
| #10 | Jest (jest-expo) + RNTL 14 (async `render`/`fireEvent`), 56 tests, ESLint 9 flat config, GitHub Actions CI (tokens check, typecheck, lint, tests, web export) |
| #11 | Admin sign-in removed (School Board → normal sign-in, role routes the account); `PreviewBanner` on lecturer, school admin and Research |
| #12 | All onboarding screens on tokens via `makeStyles()` |
| #13 | Home, LectureCard, AssessmentCard and the tab bar on tokens; heroes use `surface-inverse` |
| #14 | `expo-dev-client`, `expo-updates` (channels per EAS profile), `@sentry/react-native` (dormant until `EXPO_PUBLIC_SENTRY_DSN`), `/dev/design-system` diagnostics with **Send test error** |

CI is green on `main`.

## 3. Conventions you must keep

- **Design system:** use the `zuri-design-system` skill for any UI work. Colours only from tokens (`useTheme().colors` or `makeStyles((t) => …)`), type styles only, 4-pt spacing, five radii. No hex literals: lint enforces it as an **error** in `src/theme`, `src/app/dev`, onboarding and the Home files (`eslint.config.js`). Add each area to that list as it migrates. One hero per screen on `surface-inverse`; gold (`accent`) is a highlight only.
- **Copy voice:** plain, warm, specific; sentence case; buttons are verbs ("Start class"); errors say what happened and what to do; never "learning style", "guaranteed grades", fake numbers; no emoji.
- **Every data screen has four states:** loading (skeletons), empty, error, offline.
- **Offline-first** for anything the student creates.
- **Don't break the deferred apps** when changing shared contexts (`lectures-context`, `materials-context`, `academic-context`).
- **Dark mode** is built but off (`DARK_MODE_ENABLED` in `src/theme/theme-provider.tsx`). Turn it on when every student-loop screen is on tokens.
- **Tests:** `npm run test:ci`; component tests need `await render(...)`. `jest.setup.ts` mocks AsyncStorage, expo-haptics, safe-area.
- **Lint:** React Compiler hook rules are warnings app-wide and errors in clean areas (`PRE_EXISTING` / `CLEAN_AREAS` in `eslint.config.js`). 0 errors, ~500 warnings to burn down as areas migrate.
- **Don't** add `expo-modules-core` as a dependency (expo-doctor flags it).
- **Git:** branch per PR, PR to `main`, CI must pass. Commits end with the `Co-Authored-By` line the harness gives you.
- **Verify in the app**, not just tsc: `npx expo start --web` and open the screen. Note: the browser pane's phone-size emulation drops clicks; test interactions at desktop size.

## 4. What's left, in order

Sizes are for one mobile developer (S 2–4 days · M 1–2 weeks · L 2–4 weeks). Each phase is "done" only when it works against the live API (see the roadmap's "Done when" lines).

### Phase 0, remainder (do next)

1. **Spike: streaming on Hermes** (for Phase 3). Build a stream client in `src/services/` using `fetch` from `expo/fetch` (supports `response.body.getReader()` on native) with an SSE parser, cancellation (`AbortController`), retry, and token refresh mid-stream. Add a mock SSE server script (`scripts/mock-stream-server.mjs`) and a dev screen `/dev/spike-streaming` that shows first-token latency. Unit-test the parser. Fallback if native streaming fails: polling partial answers. Also check what the backend exposes (backend repo `Marvellousik/Backend_zuri_ed`, AI orchestrator) and record it against spec alignment report question 5.
2. **Spike: chunked background recording** (for Phase 4, the riskiest phase). Prototype with `expo-audio` (`useAudioRecorder`): (a) stop/start segments every 30–60 s and measure the gap between segments; (b) note what a native module would take. Write chunks with `expo-file-system`, numbered, kept until "acknowledged". Dev screen `/dev/spike-recording` showing segment count, gaps, file sizes. `app.json` already has `enableBackgroundRecording`. Write a device test protocol (2 h, screen locked, low-end Android + low-battery iPhone, Wi-Fi drops twice).
3. **Maestro E2E:** sign-up → verify → onboarding → Home against live, with a dedicated `+zuritest` student whose credentials are an EAS secret (never in the repo). Needs a dev build.
4. **Analytics** funnel events (onboarded → first class session → first debrief → first readiness view) once the tool is decided.
5. **Migrate the rest of the student loop onto tokens** area by area (Courses, lecture, Plan, You), then turn dark mode on. The codemod approach used for #12/#13 is described in those PR bodies.

### Phase 1: Courses and onboarding on the server (L)

Catalogue from the server; personal courses via `POST /academic/courses`; institution → faculty → department picker (`GET /academic/institutions/{id}/hierarchy`, not yet routed by the gateway); rebuild preferences (explanation style, pace, quiz format, hours, language); new course-materials step; onboarding status/submit endpoints; timetable slot edit/delete (`PUT`/`DELETE /academic/timetable/slots/{id}`, remove the `hiddenServerIds` workaround); a Learning preferences settings section; and a one-time migration of phone-only custom courses to the server (answer spec open question 3 first).

### Phase 2: Before class (M)

Home as the Today feed: `NextClassCard` hero from `GET /academic/timetable/next` (timezone-correct, Africa/Lagos); server cards from `GET /academic/today`; push via `expo-notifications` + `POST /notifications/devices/register`; deep links (`zuri://class/<id>` etc.); timetable exceptions; upcoming-lecture context and "Start class" within 15 minutes.

### Phase 3: In class, live Q&A (L)

Streaming client from the spike; new `class/[sessionId].tsx` full-screen modal (`POST /academic/class-sessions`, `/{id}/ask` streaming, `/{id}/flags`, end class); `AnswerBubble` with source chips; offline question queue; rebuild `ask.tsx` on `partner/chat` + history. Target: first token < 2 s p95 on a mid-range Android phone over 4G.

### Phase 4: Capture, record, transcribe (L, riskiest)

`RecordingBar` in the class session; 30–60 s chunks uploaded with sequence numbers to `POST /academic/class-sessions/{id}/audio` (resumable, idempotent; delete locally only after server ack); background recording with an Android foreground-service notification; consent `BottomSheet` → `recording_consent`; end → transcription and notes job; lecture page from the server record; live transcript lines (< 15 s); remove the old `/materials` audio path and `data/sample-lecture-analysis.ts`.

### Phase 5: Debrief and follow-ups (M)

`debrief/[id].tsx` guided flow (topics pre-selected from flags → explanation → "makes sense / still confused" → 3–6 question quiz → recap); `follow-ups.tsx`; learning signals from every answer; mastery from `knowledge-state` / `weak-topics` (local mastery only offline); "Debrief ready" / "Follow-up due" pushes.

### Phase 6: Readiness, exams and study plan (L)

Exams to `POST /academic/exams`; `readiness.tsx` with `ReadinessRing`; Plan tab on `GET /academic/study-plan` (local planner as offline fallback); diagnostic per course; past questions drive topic weights; analytics (readiness trend, study time, streaks).

### Phase 7: Hardening and launch (M)

Server memory export/delete; one shared offline outbox with client event ids (replacing per-store queues); hold-to-talk voice and read-aloud; accessibility audit (VoiceOver/TalkBack, 1.3× text, contrast in both themes); performance budgets (cold start < 2.5 s mid-range Android, Home interactive < 1 s from cache); store listings and privacy labels; TestFlight / Play beta with 20–50 students; crash-free sessions ≥ 99.5%.

### Phase 8: Deferred apps on real backends (L each)

Lecturer app (accounts, course ownership, aggregate class insights, quizzes/announcements on the server); school admin (admin role, hierarchy/offerings/enrolment routed by the gateway, real timetable/staff/analytics); research (projects and saved papers synced, server synthesis and project chat). Remove the "Preview" banners when done.

**Backend dependency:** most endpoints above come from the Zuri Brain spec (`docs/product/ZURI_BRAIN_SPEC.md` in `Marvellousik/Backend_zuri_ed`, PR #17), build steps 1–7. Build screens against agreed contracts and mock servers, behind feature flags, when the backend lags.

## 5. What the owner needs to do

1. **Sentry:** create a React Native project; add `EXPO_PUBLIC_SENTRY_DSN` to the EAS `preview` and `production` environments; for readable stack traces add `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` and remove `SENTRY_DISABLE_AUTO_UPLOAD` from `eas.json` (steps in `docs/BUILDS.md`).
2. **Make a dev build** (`npx eas build --profile development --platform android`) and install it; spikes, Maestro and background recording all need it. Then a preview build and tap **Send test error** at `/dev/design-system`.
3. **Check #12/#13 on a real phone** (only checked on web so far).
4. **Decide:** analytics tool (PostHog or the backend's events); whether the backend gives a staging gateway; dark mode at launch or after; team size (with two developers Phase 8 can run alongside Phase 3).
5. **Backend answers needed:** streaming format and audio chunk format (alignment report Q5–6); how admin and lecturer roles are issued (Q10); personal ↔ catalogue course merge rules (Q3).
6. **Test account:** a `+zuritest` student on live, credentials stored as an EAS secret.
7. **Devices:** a low-end Android (2–3 GB RAM), a recent Android, an iPhone.
8. Optional housekeeping: `npx expo install --check` (three patch-version mismatches already on `main`), and deleting the merged remote branches.

## 6. Local setup notes

- Owner's own checkout: `Documents/Zuri_mobile_academic_sync` (leave it alone). Scratch worktrees used in this session: `Documents/Zuri_mobile_theme`, `Zuri_mobile_p0`, `Zuri_mobile_fix`; safe to remove with `git worktree remove` once nothing is open there.
- Windows + PowerShell 5.1: `&&` doesn't work there; use separate commands or Git Bash.
- `npm ci` then `npm run typecheck`, `npm run lint`, `npm run test:ci`, `npm run tokens:check`, `npx expo start --web`.

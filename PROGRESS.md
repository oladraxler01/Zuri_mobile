# Lexi — Build Progress

Shared team checklist (full item-by-item list, tick boxes there):
https://claude.ai/artifact/G8ZY5iJc2xdZo1YvXzQEgf

This file is the quick in-repo view. Update both when a phase finishes.
Each finished phase gets its own git commit (`Phase N: ...`), so `git log` is the change history.

## Build order

| Phase | What | Status |
| --- | --- | --- |
| 1 | Role-based app structure (Student / Lecturer / Institution) | Done 2026-11-15 |
| 2 | Close the student lecture loop (record → upload → process → transcript/summary, archive, course detail) | Done 2026-11-15 |
| 3 | System states & permissions (mic, notifications, loading, errors, empty states) | Done 2026-11-15 |
| 4 | Materials & assignments (needed for Ask Lexi with sources) | Done 2026-11-15 |
| 5 | Lecturer app, then institution web dashboard | Next (shells exist) |
| 6 | Full checklist from the top, starting with onboarding | Not started |

## Phase log

### Phase 1 — Role-based app structure (done 2026-11-15)
- `src/context/session-context.tsx` — signed-in role (`student` | `lecturer` | `institution`), `setRole`, `signOut`, `ROLE_HOME`.
- `src/components/role-gate.tsx` — keeps each role inside its own app.
- `src/app/index.tsx` — routes signed-out users to onboarding, signed-in users to their role's app.
- Role select: Student → student onboarding; Lecturer → `/lecturer`; School Board → `/institution`.
- New apps with their own tabs (placeholder screens listing what each will hold):
  - `src/app/lecturer/` — Today, Courses, Insights, Tools, Profile
  - `src/app/institution/` — Overview, Academics, Analytics, Settings
- `src/components/lexi-bottom-tab-bar.tsx` — now takes custom icons and titles per app.
- `src/components/planned-screen.tsx` — shared placeholder screen.
- Sign out (student You tab, lecturer Profile, institution Settings) clears the role.
- Known limit: role is in memory only; it resets when the app restarts (fixed with real auth/persistence).

### Extra — Splash redesign (2026-11-15)
- `src/app/onboarding/index.tsx` rebuilt: dark forest-green kinetic splash (gold rule draw, rotating orbit arcs, "Lexi." letters rising from a mask, word-by-word tagline, endless academic ticker, shimmer CTA). No AI wording. Respects the OS "reduce motion" setting.
- `app.json` native splash background changed from Expo blue to `#17231b` so launch → splash is seamless (needs a new native build to show).

### Phase 2 — Student lecture loop (done 2026-11-15)
- New packages: `expo-audio` (recording + playback), `expo-file-system` (keeps recordings), `@react-native-async-storage/async-storage` (saves lectures).
- `src/app/lecture-recording.tsx` — real recording (16 kHz mono AAC, 64 kbps per the audio spec), microphone permission screen (incl. "turned off in settings"), course picker, live level meter, pause/resume, "recording complete" step with Save & process / Discard, guard against leaving mid-recording.
- `src/context/lectures-context.tsx` — lectures saved on the phone; audio copied to permanent storage; upload/processing runs in the background while the app is open; interrupted jobs become "needs attention" with Try again.
- `src/services/lecture-api.ts` — the one file that talks to the backend. Uses `EXPO_PUBLIC_API_BASE_URL` → `POST {base}/lectures/transcribe` with upload progress; maps the spec's response. Without a configured URL it uses a stand-in that returns sample results (`src/data/sample-lecture-analysis.ts`), clearly labelled in the UI.
- `src/app/lecture/[id].tsx` — one lecture: uploading → processing → "lecture ready" → Overview (summary, what you need to know, knowledge gap, flashcards, ask about this lecture), Transcript (search, highlights and follows the audio, tap a line to jump), Notes, Questions (5-question quiz with feedback, results, best score). Audio player with seek, ±15 s, speed. Delete lecture.
- `src/app/lectures.tsx` — lecture archive with search and course filter.
- `src/app/course/[id].tsx` — course detail: Overview (next class, latest lecture, topics covered), Schedule, Lectures.
- `src/app/upcoming-lecture.tsx` — next class with live countdown, venue, and preparation from the previous lecture.
- Home: upcoming/next class now come from the real timetable; new post-lecture card; "Coming up" list; Lecture Archive quick action.
- Courses tab: tap a course to open it; Lectures / Record buttons pass the course.
- Removed `src/app/lecture-analysis.tsx` (replaced by `lecture/[id]`).
- `app.json`: expo-audio plugin with microphone permission text and background recording.
- Known limits: background recording needs a development/store build (not Expo Go). "Ask about this lecture" searches the transcript; it is not AI yet. On web, saved audio doesn't survive a page reload.

### Upgrade — Expo SDK 54 → 58 (2026-11-15)
- Reason: Expo Go on phones now only runs SDK 58 projects.
- Packages: expo 58, React Native 0.88, React 19.3, expo-router 58, Reanimated 4.7, TypeScript 6; added `expo-asset` (required by expo-audio).
- Removed direct `metro`, `metro-resolver`, `@expo/metro-config`, `@react-native/js-polyfills` deps (Expo manages these; mismatched copies cause crashes). `expo-doctor`: 20/20.
- Code changes for new APIs: custom tab bar uses `emitter` + `navigateToTab`; recording leave-guard uses `usePreventRemove`; `StatusBar backgroundColor` removed (edge-to-edge); `StyleSheet.absoluteFillObject` → `absoluteFill`; ref types `ScrollViewInstance` / `TextInputInstance`.
- `app.json` web output `static` → `single` (server pre-rendering broke on the audio player; web now builds as a single-page app).

### Cleanup & fixes (2026-11-15)
- Splash wordmark renamed to **ZURI** (`src/app/onboarding/index.tsx`).
- Removed Expo starter leftovers (themed components, collapsible, web badge, animated icon, theme constants, colour-scheme hooks, `global.css`, `scripts/reset-project.js`, unused logo/tab images) and unused packages (`expo-device`, `expo-web-browser`, `expo-symbols`, `expo-image`).
- Safe upgrades: `@expo-google-fonts/source-serif-4` 0.4.2; `npm audit fix` cleared the critical `shell-quote` issue (3 moderate build-tool issues need a breaking forced upgrade; left). All Expo packages already at the newest SDK 58 versions.
- Home: greeting follows the time of day and uses your name; "classes left today"; Recommended Review comes from your latest lecture (hidden until there is one); profile icon opens You; removed two hardcoded popups.
- You: name saved from sign-up and editable; initials avatar replaces a remote stock photo; reminder toggle shows your real lead time.

### Phase 3 — System states & permissions (done 2026-11-15)
- New packages: `expo-notifications` (local reminders), `@react-native-community/netinfo` (online/offline).
- Saved on the phone (`src/utils/storage.ts`): signed-in role (`session-context`), profile/courses/timetable/preferences (`academic-context`), lectures. The app reopens where you left off.
- Startup: native launch screen stays up until fonts and saved data are ready (no blank screens) — `src/app/_layout.tsx`.
- Crash screen: root `ErrorBoundary` with Try again. Branded `+not-found`.
- Offline: `network-context` + `OfflineBanner` (slides in when offline, "Back online" when it returns). Lectures saved offline get status `waiting` and upload automatically when online; interrupted uploads resume after restart.
- Backend status screens `src/app/status/[kind].tsx`: session-expired (401), update-required (426), maintenance (503); `lecture-api.ts` throws typed `ApiError`s and the app routes to these.
- Shared components `src/components/states/`: `StateView`, `EmptyState`, `ErrorState`, `PermissionState`, `LoadingState`, `Skeleton`, `SkeletonCard`. Used by recording permission, archive (skeletons + empty/no-match), course detail, notification permission.
- Notifications: `src/services/notifications.ts` schedules a weekly reminder per timetable class (`reminderLeadMinutes` before), on Android in a "Lecture reminders" channel; `ReminderSync` keeps them in step with timetable/preferences and opens the class when a reminder is tapped. Permission screen `src/app/permissions/notifications.tsx` is the last onboarding step when reminders are on; the You → Preferences toggle asks for permission too.
- Known limits: reminders don't run on web. Verification of the Android release build's Hermes step failed locally with a Windows file lock (`spawn EBUSY`); the JS bundle itself builds fine (`--no-bytecode`).

### Phase 4 — Materials, assignments & Ask with sources (done 2026-11-15)
- New packages: `expo-document-picker` (pick files), `@react-native-community/datetimepicker` (due dates), `expo-sharing` (share / open fallback).
- Materials: `materials-context.tsx` (saved, files copied into app storage, offline queue like lectures), `services/material-api.ts` (`POST {base}/materials/process`; without a backend: text/Markdown analysed on the phone from the real text, other files get labelled sample results).
  - `src/app/materials.tsx` library (search, type/course filters, sort, pinned first), `material/new.tsx` upload details (course, type, who can see it), `material/[id].tsx` (Open in the phone's viewer via `File.preview()`, Share, Summary / Concepts / Quiz / Passages, type/course/visibility settings, pin, delete).
- Planning: `planner-context.tsx` (assignments, tests, exams, projects with default prep checklists; sample entries + sample academic calendar on first launch), `utils/planner.ts` (due wording, grouping, study-plan builder that spreads sessions before each deadline within the weekly study goal).
  - New **Plan** tab `src/app/(tabs)/plan.tsx`: This week (classes, deadlines, planned study sessions), Deadlines (overdue / this week / next week / later / completed), Calendar (month grid, day detail, academic calendar).
  - `assessment/edit.tsx` (add/edit with date & time picker), `assessment/[id].tsx` (countdown, checklist, study sessions, topics to revise + weak spots for tests/exams, related materials and lectures, ask).
- Ask with sources: `src/app/ask.tsx` + `utils/source-search.ts` search lecture transcripts and material passages (all, one course, or one document); answers are numbered source cards that open the lecture at that second (`lecture/[id]?t=`) or the material's passages.
- Course detail: new Materials and Assessments tabs; overview shows the next deadline.
- Home: deadline card (overdue or due within 3 days), exam-prep countdown card (tests/exams within 14 days), Materials and Ask shortcuts; "Open Syllabus" (hardcoded popup) now opens the course's materials.
- Reminders: deadline notifications the day before and 2–3 hours before (respecting Assignment alerts / Exam countdown); tapping opens the item. Android channel always created; rescheduling debounced.
- Verified: study-plan, due-date wording, grouping and source search with a scripted test; on-phone text analysis tested on a sample Markdown file.
- Note: the PC's C: drive was full (0 bytes free) during verification; Android and web bundles compiled but the export couldn't be written. Freed ~95 MB of build caches.

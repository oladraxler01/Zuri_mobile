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
| 3 | System states & permissions (mic, notifications, loading, errors, empty states) | Next |
| 4 | Materials & assignments (needed for Ask Lexi with sources) | Not started |
| 5 | Lecturer app, then institution web dashboard | Not started (shells exist) |
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

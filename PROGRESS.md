# Zuri — Build Progress

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
| 4 | Materials & assignments (needed for Ask Zuri with sources) | Done 2026-11-15 |
| 5 | Lecturer app, then institution web dashboard | Done 2026-11-15 |
| 6 | Full checklist from the top, starting with onboarding | Next |

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
- `src/app/onboarding/index.tsx` rebuilt: dark forest-green kinetic splash (gold rule draw, rotating orbit arcs, "Zuri." letters rising from a mask, word-by-word tagline, endless academic ticker, shimmer CTA). No AI wording. Respects the OS "reduce motion" setting.
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

### Phase 5 — Lecturer app & institution dashboard (done 2026-11-15)
Part 1 — lecturer (commit `ea4d05b`):
- `lecturer-context.tsx` (profile, courses taught + weekly slots, announcements, quizzes, revision packs, assessments; saved).
- `onboarding/lecturer-setup.tsx`: profile + staff ID → courses taught → done. Role select "Lecturer" now goes here.
- Tabs `src/app/lecturer/`: Today (next lecture + Record, today's teaching, course alerts, learning signals, top intervention), Courses, Insights (engagement, topic mastery, weak topics, misconceptions, FAQs, grade bands, cohort, trends), Tools, Profile (verification status).
- Detail screens `src/app/teach/` (lecturer-only): course page, quiz generator + review/publish, revision pack builder, create assessment, announcements + history.
- Recording screen lists the lecturer's own courses when signed in as a lecturer.
- `components/dashboard/`: ScreenShell, Grid (1–3 columns by width), Panel, StatTile, StatusBadge (icon + label), BarChart (single amber hue validated against white, tap to read), HBarList, ListRow.
- `data/sample-class-insights.ts`: deterministic sample class data per course (uses real lecture concepts when available).

Part 2 — institution:
- `institution-context.tsx` (settings, staff, roles/permissions, calendar, broadcasts, audit log, privacy, integrations, API key/webhook; every change writes an audit entry).
- Tabs `src/app/institution/`: Overview (KPIs, weekly activity, lectures captured, faculties, system health, interventions), Academics (structure + enrollment, timetable by department, calendar management, library + knowledge-base search), Analytics (learning, engagement, interventions, AI usage & cost, system health), Settings hub.
- Detail screens `src/app/admin/` (institution-only): faculty, course performance, university-wide intelligence (trends, common difficulties, faculty/department intelligence, course comparison, cross-course knowledge map, intervention opportunities, knowledge search), settings sections (institution, roles, staff, notifications, audit, privacy, integrations, API).
- `data/sample-institution.ts`: sample faculties/departments/courses and metrics.
- Removed the Phase 1 placeholder screen.
- Not visually checked in a browser yet; layouts are responsive (1–3 columns).

### Phase 6.1 — Onboarding & identity (done 2026-11-15)
- Verify email: Verify needs all 6 digits (server checks the code once auth is connected).
- University choice is now actually saved (was ignored before; profile always showed the default).
- New `onboarding/profile-setup.tsx`: full name, matric number (format check → verification "pending"), faculty. Academic state gains `matricNumber`, `verification`, `faculty`.
- Courses step: "Import from course catalogue" (`constants/course-catalogue.ts`, sample by department + level; `components/onboarding/catalogue-sheet.tsx`).
- Timetable step: the fake "AI scan" is replaced by a real CSV/text import (`utils/timetable-import.ts`): any column order/separator, times like 9-11 / 2:00 PM / 14:00, unknown course codes added automatically, unreadable lines reported. PDFs/photos explain they need the server.
- New `onboarding/timetable-review.tsx`: classes by day, clash detection, courses without a class time, remove a class.
- New `permissions/microphone.tsx` step and `onboarding/complete.tsx` summary (profile, courses, timetable, reminders, microphone).
- Fix: course and class IDs were based on the millisecond, so bulk adds could collide; now unique. `addCourse` returns the new ID.
- Parser tested on 9 sample lines (7 formats): all parsed correctly, clash found, unreadable line reported.

### Phase 6.2 — Home / proactive intelligence (done 2026-11-15)
- `utils/recommendations.ts`: one feed built from real data (classes within 2 h, overdue/due-soon work, exams within 14 days, lectures ready/waiting/failed, concepts to revisit, materials processed, today's planned study), ranked by priority. Tested on sample data.
- `context/feed-context.tsx`: read / dismissed / snoozed-until-tomorrow state (saved), rebuilt every minute.
- New `notifications.tsx` (notification centre: needs attention / recommended / updates, unread dots, mark all read, dismiss) and `recommendation/[id].tsx` (why, what to do, actions, remind me tomorrow, dismiss).
- Home: bell with unread count; "Recommended for you" now shows the top recommendation of any kind; "Get started" checklist for new students (timetable, first lecture, upload, add a deadline), dismissible.

### Phase 6.3 — Courses (done 2026-11-15)
- `context/progress-context.tsx`: saved log of quiz answers, flashcard ratings, study sessions and concept reviews (last 3000 events).
- Lecture and material quizzes record each checked answer; lecture flashcards get "Still learning" / "Got it" after flipping. Each is linked to its concept (`utils/mastery.ts` `conceptForQuestion`; tested: 8 of 9 sample items matched, the 9th is course-level).
- `utils/mastery.ts`: per-concept mastery (recency-weighted % of last 6 answers) → Strong / Developing / Weak / Not tested, plus concepts flagged by lecture analysis.
- `utils/activity.ts`: course activity (recordings, uploads, deadlines added, quiz rounds and flashcard sessions grouped by day).
- Course page: "Your standing" on the overview (mastery, strong/weak/untested, answers, weakest topic); new Topics tab (strength map with practise-weakest, and all topics with where each was covered) and Activity tab.

### Phase 6.4 — Study / learning (done 2026-11-15)
- `utils/study-session.ts`: builds a personalised session (≈8 items, 2 questions per flashcard) from lectures and materials, weakest concepts first; modes: mixed, weak-topic review, or one focus concept. Tested on sample data.
- `study/session.tsx`: one item at a time with timer; wrong answers offer "Explain it" (right answer, concept summary, the lecture moments where it was taught, ask more); every answer feeds mastery; completion screen with score, flashcards known, time and topics that moved level; logs a study-session event.
- `study/index.tsx` hub (start session, review weak topics, per-course sessions, week minutes, strong topics, planned today), `study/mastery.tsx` (all courses), `study/history.tsx` (minutes per day chart, day streak, accuracy, full activity).
- Topic "practise" buttons and the concept/exam recommendations now start focused study sessions. Home's fake "Focus Session" popup is replaced by a Study session tile.
- Interactive tutoring is guided by your own sources; AI-written tutoring still needs the backend.

### Rename to Zuri (2026-11-15, commit fa21dc1)
- All user-visible text, app display name and microphone permission text say Zuri. Internal names (files, `lexi.*` storage keys, identifiers, EAS slug, scheme, bundle id) unchanged on purpose so saved data and builds keep working.

### Phase 6.5 — Academic assistant & global search (done 2026-11-15)
- `context/conversations-context.tsx`: every Ask conversation is kept (history); star to save. Ask screen ("Ask Zuri") saves as you go, reopens past chats (`?conversationId=`), new-chat and history buttons.
- `ask-history.tsx`: history and saved conversations, search, star, delete.
- `utils/global-search.ts` + `search.tsx`: one search across courses, deadlines, topics, lectures, materials and the words in transcripts/passages; grouped results with type filters, recent searches, "Ask Zuri instead" when nothing matches. Search icon in the Home header. Tested on sample data.

### Phase 6.6 — Research system (done 2026-11-15)
- Real papers from OpenAlex (`services/scholar-api.ts`): free open catalogue, no key; only search words are sent. Search with sort (relevance / most cited / newest), date and open-access filters, paging; paper detail; citing and referenced papers.
- `context/research-context.tsx`: saved papers (cached for offline), projects with sources, evidence (supports / contradicts / background, optional theme), notes, custom themes, citation style, archive.
- `utils/research.ts`: APA 7 / MLA 9 / Harvard / BibTeX citations and in-text markers, key findings from abstracts, themes from shared topics, source links, synthesis by theme with gaps, answers from a project's abstracts/evidence/notes. Tested on 5 live OpenAlex papers.
- Editorial design (`components/research/editorial.tsx`): paper background, serif headlines, hairline rules, small-caps kickers.
- Screens: Research home (tab), `scholar/search`, `scholar/paper/[id]` (metadata, summary, key findings, tap-a-sentence evidence extraction, citations + share, cited by / references, full text), `scholar/project/new`, `scholar/project/[id]` (workspace: tools + sources / evidence / notes), `…/map` (themes + literature map), `…/compare`, `…/synthesis` (share), `…/citations` (citation manager), `…/chat`, `…/settings`, `scholar/library` (saved, all papers, your documents, archived).
- Research chat quotes your sources; AI-written answers need the backend.

### Phase 6.7 — Profile & personalisation (done 2026-11-16)
- You tab rebuilt as a profile hub: identity + verification badge, real stats (lectures, time studied, day streak), and Profile / Preferences / Account sections. Removed the hardcoded "Learning DNA" and GPA.
- New screens: `profile/academic` (name, matric + verification, faculty, department, level, semester), `profile/learning` (strengths, growth areas, accuracy by course, study habits, all from real activity), `profile/goals` (target result, weekly hours, own semester goals), `profile/knowledge` (what Zuri stores, clear learning history / conversations / searches).
- `settings/[section]`: study, notifications (permission status + request/open settings, reminder lead time, deadline/exam alerts), recording (quality, keep audio), Zuri assistant (answer style, personalisation), connected university, privacy & data (export JSON via share sheet, delete all data), account, help (FAQ, report a problem, replay intro, version).
- Preferences now drive behaviour: recording quality sets the recorder; "keep audio" off deletes audio after processing; session length sets study sessions; answer style sets Ask Zuri sources; personalisation off hides activity-based suggestions.
- `utils/reset.ts`: "Delete all my data" resets every store in memory first (so nothing re-saves), then removes saved keys and recording/material files.
- Sign-up now saves the email.

### Phase 6.8 — Remaining buildable items (done 2026-11-16)
- Lecturer: a "Class" tab on lecture pages (lecturers only) with question-by-question results, the most common wrong answer, and per-lecture misconceptions (`components/lecture/class-tab.tsx`, sample responses per lecture).
- Institution login: `onboarding/admin-sign-in.tsx` (institution email + admin access code, format-checked; server check when connected). Linked from Welcome ("Institution admin? Sign in here") and from choosing School Board.
- Student overview `admin/students.tsx` (sample directory: search, risk and department filters) and lecturer overview `admin/lecturers.tsx` (courses, lectures captured, outcomes, on Zuri or not).
- Institution data is now editable and audited (`institution-context`): enrollment and capacity, adding and archiving courses, weekly class times with venue clash checks, material moderation (approve / flag / hide).
- Admin course page: enrollment stepper with over-capacity warning, timetable editor that blocks double-booked rooms, archive/restore.
- Academics: add courses per department, links to student/lecturer directories, editable timetable with clashes flagged, material management with moderation and institutional upload.
- Institutional research search `admin/research.tsx`: finds the university in OpenAlex (Veritas University: 1,324 papers) and lists/searches its publications; verified against the live service.
- Remaining partial items need the backend, AI or university integrations (see checklist).

### Zuri rename & API gateway (2026-11-16)
- Internal names now say Zuri too: `zuri-theme`, `zuri-ui`, `use-zuri-fonts`, `zuri-bottom-tab-bar`, `ZuriFonts`/`ZuriColors`/…, chat role `'zuri'`, package name `zuri-mobile`, support email `support@zurilearn.com`, README.
- Still unchanged on purpose: `lexi.*` storage keys (renaming wipes saved data), EAS `slug`, `scheme` and `bundleIdentifier` (tied to the EAS project and store listing).
- New `src/services/api-config.ts`: reads `EXPO_PUBLIC_API_GATEWAY_URL` (replaces `EXPO_PUBLIC_API_BASE_URL`), REST base `{gateway}/api/v1`, `checkGatewayHealth()`. Live uploads only when `EXPO_PUBLIC_USE_LIVE_API=true`, because every route except sign-in/register needs an `Authorization` header and server sign-in isn't wired up yet.
- Checked against https://api.zurilearn.com: `/health` → healthy (gateway, academic, ai, analytics, content, notification, sync, user); `POST /api/v1/auth/login`, `/auth/register`, `/auth/refresh` exist and validate input.

### Server sign-in & uploads wired to api.zurilearn.com (2026-11-16)
- `services/api-client.ts`: one client for the gateway: bearer token, automatic refresh (single flight, before expiry or on 401, saves the rotated refresh token), tokens in `expo-secure-store`, friendly errors (`ApiError`, now including `still-processing`). "Delete all my data" also signs out.
- `services/auth-api.ts`: register, verify email (`?user_id=`), resend code, login (handles `EMAIL_NOT_VERIFIED`), `/users/me`, logout. Server validation messages turned into plain English.
- Screens: sign-up creates the account (checks name, email, 8+ char password) → verify screen checks the real code and signs in → setup; sign-in uses the server, sends unverified users to the code screen, returning users go home. Google/Apple and password reset say "coming soon" instead of pretending. Session expired keeps the profile and only clears tokens.
- `services/upload-api.ts`: materials and lecture recordings use the server's flow (create → presign → PUT to storage → poll). The server id and "uploaded" flag are saved on the item, so retries never upload twice; if the server is still processing, the item stays "Processing" and is checked again every minute and on next launch.
- Live uploads are now on by default (`EXPO_PUBLIC_USE_LIVE_API=true`).
- Tested the real service code against the live server with a test account: wrong password, duplicate email, bad email, login, token saved, `/users/me`, reopen with an expired token → refreshed and rotated, material upload (create → presign → storage PUT 200), retry skips re-upload, logout, upload after logout → sign-in prompt.
- **Blocked on the backend:** uploaded files stay `processing_status: pending` (no summary/transcript ever comes back), so the app shows "Processing" for them. `POST /lectures/transcribe` and `/materials/process` don't exist on the server. Admin (institution) sign-in is still local.
- New native module `expo-secure-store`: needs a new development build (Expo Go already includes it).

### Fix: email code (OTP) sign-up could be skipped (2026-11-16)
- Cause: when the app had no server address (no `.env`, and EAS builds never get the git-ignored `.env`), sign-up created no account and sent no email, the code screen accepted any 6 digits, and sign-in let anyone in.
- The live gateway `https://api.zurilearn.com` is now built in (`.env` can still override it), and the offline bypasses in sign-up, code check and sign-in are removed. Every code is checked by the server.
- Signing up again with an email that was never verified (and the same password) now emails a fresh code and opens the code screen, instead of stopping at "account already exists".
- Flow: sign up → 6-digit code by email → enter code → in. Later sign-ins use email + password only.

### Courses, timetable & today synced with the academic service (2026-11-16)
- New `services/academic-api.ts`: enrolled courses (`/academic/courses`, enrol), custom courses (`/courses`), timetable (list, next class, add slot), today timeline (act / dismiss), learning signals, knowledge state, weak topics, course study partner, lecture ingest, study stats/sessions, notification preferences.
- `context/academic-context.tsx` now syncs when signed in, and stays fully on-phone when signed out:
  - On launch and on every sign-in: uploads anything added offline, then pulls courses (catalogue + custom), timetable, next class, today's timeline, study stats and weak topics for the first course. Server data replaces the sample courses; existing phone ids are kept (matched by course code) so lectures and materials still point at the right course.
  - Adding a course tries catalogue enrolment first, then saves it as a custom course. New classes are saved once their course is on the server. Offline changes wait and go up on the next sync. Courses saved before this update are uploaded once.
  - The API has no delete yet, so removed courses/classes are remembered (`hiddenServerIds`) and not brought back by the next sync.
  - Reminder switches update the server's notification preferences.
  - New on the context: `sync` (status), `syncFromServer`, `todayTimeline`, `nextClass`, `studyStats`, `weakTopics`, `actOnTimelineCard`, `dismissTimelineCard`, `submitLearningSignal`. Screens don't show the new server data yet.
- `services/api-config.ts`: a `localhost` gateway URL now works from a real phone in development (uses the computer's address from Metro; `10.0.2.2` on the Android emulator).
- Checked: `tsc` and an Android `expo export` bundle. Not yet tested against the live server with a signed-in account.

### Live check of every server call, signed in (2026-11-16)
- Ran each route the app uses against https://api.zurilearn.com as a new, email-verified student: sign-up → code → sign-in → profile, courses, timetable, next class, today, study stats, custom course create + list, study session, notification preferences, token refresh (old refresh token correctly rejected as reused). All answered as the app expects.
- **The live academic catalogue is empty**: enrolling even `CSC 301` returns 400 "not found in academic catalog", so every course a student adds is saved as a custom course (the app's fallback, which works).
- **Custom courses have no server timetable**: `POST /academic/timetable/slots` with a custom course id crashes with a 500 (backend bug), and mastery / study partner routes answer 404 for them.
- App fixes: courses now record whether they're in the catalogue (`catalogue`). Classes for custom courses stay on the phone instead of being retried forever, anything the server refuses stops retrying, phone-only classes are no longer dropped by a sync, and learning signals / weak topics only use catalogue courses.
- **Backend to do:** seed the academic catalogue for each institution, return 404 instead of 500 for unknown course ids on `/academic/timetable/slots`, and add delete routes for courses and classes.

### Uploads start processing; summaries from Zuri's AI (2026-11-16)
- Cause of "Processing" forever: the app never told the server the file had arrived. `upload-api.ts` now runs the backend's real flow: `POST /materials {title, mime_type, file_size}` → `POST /materials/{id}/presign {action:"upload"}` → PUT → **`POST /webhooks/material-uploaded {material_id}`** → poll `GET /materials/{id}` until `completed`/`failed`. Retries re-confirm (or re-send the file if the server answers 409 "not uploaded yet").
- Fields now match the content service (`mime_type`, `file_size`); the ignored `course_code/content_type/filename/category` are gone.
- New `services/ai-api.ts` (`POST /ai/execute`). After processing, `reading.analyse` with the `material_id` gives the summary, key points and key terms shown on the material page. Practice questions and passages come in a later step.
- The server can only read PDF and text for now, so the file picker offers just those. Failures say why (recordings can't be transcribed yet; other types unsupported; scanned PDFs).

### Practice quiz for materials from Zuri's AI (2026-11-16)
- Material page → Quiz tab → "Create practice quiz": `POST /ai/execute` `study.quiz.generate` with the material's server id (`count: 5`, `multiple_choice`). Options `{A..D}` + `correct_answer` are mapped to the app's question format; malformed questions are skipped. Questions are kept with the material, so it costs one AI request per material. Answers still feed mastery.
- Fixed: upload progress from expo-file-system arrives as BigInt and crashed the progress label.

### Practice tab: quiz, flashcards or exam-style questions (2026-11-16)
- Material page "Quiz" tab is now "Practice" with three choices, each generated on request by Zuri's AI and kept with the material (one AI request each):
  - **Quiz**: 5 multiple-choice questions (`study.quiz.generate`, `multiple_choice`).
  - **Flashcards**: 10 cards (`study.flashcards.generate`), tap to flip, "Still learning" / "Got it" feeds mastery.
  - **Exam-style**: theory + applied real-world-scenario questions like a lecturer would set, with marks, model answer and marking guide (`study.quiz.generate` with a descriptive `quiz_type`; the server puts it into its prompt).
- New `components/materials/practice-tab.tsx`.
- Recording: if iOS refuses the 16 kHz voice format ("Failed to prepare recorder"), retry once with `RecordingPresets.HIGH_QUALITY` (b1cb4a8). Not tested on an iPhone yet.

### Ask Zuri answers with AI (2026-11-16)
- `app/ask.tsx` now sends each question to `POST /ai/execute` `chat.generate` with up to 5 context passages and the last 4 turns. Passages come from the phone's own sources (lecture transcripts, material passages), plus, for one document, the server's best-matching passages (`retrieval.search` with that material's id) and, for everything / a course, the summaries of matching processed documents. The passages used are shown under the answer. If the AI fails, the passages are shown with the reason.
- New `components/markdown-text.tsx` renders the AI's headings, bullets and bold.
- Not used yet: the course study partner (`/academic/courses/:id/partner/chat`) only works for catalogue courses, and the live catalogue is empty.
- **Backend security bug reported** (BACKEND_REQUESTS #0): `retrieval.*` isn't limited to the user's own documents. The app only calls it with a material id the user owns.

### Account: passwords, devices, sign out everywhere, profile sync (2026-11-17)
- Forgot password (sign-in → "Forgot Password?" → `onboarding/forgot-password`): email → `POST /auth/forgot-password` → paste the code from the email + new password → `POST /auth/reset-password {token, new_password}`. The emailed code is currently a long token (6-digit code requested, BACKEND_REQUESTS #9).
- Settings → Account: **Change password** (`account/password`, `POST /users/me/change-password`) and **Signed-in devices** (`account/devices`, `GET/DELETE /users/me/sessions`, "Sign out of all devices" → `POST /auth/logout-all`).
- Sign out now calls `POST /auth/logout` with no body (the server revokes the token it was called with).
- Profile → Academic profile also saves name, school, department, level and timezone to the account (`PUT /users/me`). Matric number, faculty and semester stay on the phone (no server fields yet).
- Friendlier messages for 429 (too many tries) and deactivated accounts.

### Materials synced with the server: list, rename, delete (2026-11-17)
- `materials-context` syncs on launch and on every sign-in: `GET /materials` (all pages) brings in materials uploaded from another device (`srv_<id>`, no local file; summary on request with "Create summary" → `reading.analyse`). Ones still processing keep being checked.
- Rename: material page → Summary → NAME → Save → `PUT /materials/:id {title}`.
- Delete also runs `DELETE /materials/:id`; if offline, the id is remembered (`zuri.materials.pending-deletes.v1`) and sent later, and a sync never brings a deleted one back.
- Opening the file of a material from another device explains that the file isn't on this phone.

### Study: AI "Explain it", practice saved to the account, server-graded quizzes (2026-11-17)
- Study session → wrong answer → "Explain it" → **Explain it with Zuri**: `chat.generate` explains why the right answer is right (and the chosen one wrong) with a short example, grounded in the concept summary and the lecture moments.
- Practice tab: a generated quiz is also saved with `POST /quizzes` (options as `{text, is_correct}`), flashcards with `POST /flashcard-decks`. Finishing a quiz sends the picked answers to `POST /quizzes/:id/submit`; the server grades it, it counts towards study stats and topic mastery, and the score shows as "Your best". Quizzes made before this are saved to the server the first time they're finished.
- `QuizTab.onAnswer` now also reports the chosen option index.

### Progress from the account: streak, stats, topic mastery, goals (2026-11-17)
- New `services/progress-api.ts` (analytics service).
- Finishing a study session also sends `POST /analytics/study-sessions {session_date, duration_minutes, quizzes_completed, flashcards_reviewed, materials_reviewed}`.
- Study history: new "In your account" panel (`/analytics/study-streak`, `/analytics/study-stats`).
- Concept mastery: new "Mastery in your account" panel from server-graded quizzes (`/analytics/topic-mastery`) plus topics due for review (`/analytics/topics-for-review`).
- Profile → Goals: semester goals sync with `/analytics/goals` (pulled on open, offline-made ones pushed; ticking one off → `/complete`, removing → `DELETE`). The account can't un-complete a goal, so unticking stays on the phone.

### Notifications: phone registration, account settings, history (2026-11-17)
- New `services/notification-api.ts` (notification service; responses not wrapped in `{data}`).
- This phone registers for server pushes (`POST /notifications/devices/register {device_token, device_type}`, native FCM/APNs token) when signed in with permission, and right after permission is granted; it unregisters (`DELETE /notifications/devices/:token`) before sign-out. Needs a development/production build (no device token in Expo Go).
- Settings → Notifications: new "From Zuri" panel with the account's settings (`GET/PUT /notifications/preferences`: push, email, document ready, study reminders, quiz results, streaks, goals).
- Notification centre: "From Zuri" section with `GET /notifications/history`; its settings link now opens Settings → Notifications.
- Class and deadline reminders stay on the phone (work offline, no duplicates). Server pushes don't arrive yet: the backend's sender is a stub (BACKEND_REQUESTS #3).

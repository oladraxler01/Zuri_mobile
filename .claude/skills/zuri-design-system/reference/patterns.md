# Mobile patterns

How Zuri behaves, following what students already know from mainstream iOS and Android apps (Notion, Duolingo, Google Calendar, WhatsApp, Spotify). Use these instead of inventing new interaction patterns.

## Navigation

- **Tabs** at the bottom for the roots (`TabBar`): Home · Courses · Plan · Research · You for students. Lecturers and school admins get their own tab sets after role select.
- **Push** (slide from the right, back swipe on iOS, system back on Android) for drill-down: course → lecture → transcript.
- **Full-screen modal** for focused tasks that own the whole screen: the class session, the debrief, onboarding.
- **Bottom sheet** (`BottomSheet`) for short choices and confirmations: recording consent, add course, stop recording, filters.
- **Large titles** on tab roots (`title-1`) that collapse into a centred `headline` title on scroll, as in iOS.
- Deep links (`zuri://class/<id>`, `zuri://debrief/<id>`, `zuri://follow-ups`) open the right screen from notifications.

## Home is the "Today" feed

- From top to bottom: greeting (`title-1`), then the one hero (`NextClassCard`), then what's due (follow-ups, debrief pending, deadlines) as `Card`s, then suggestions.
- Pull to refresh. The feed also refreshes when the app comes to the foreground.
- Show at most one hero and 3–5 cards; "See all" leads to the full list.

## Lists and content

- Grouped `ListRow`s, as in Settings.app, for courses, lectures, materials and settings.
- Search lives in the header (pull down to reveal on iOS), with recent searches.
- Segmented control (`surface-sunken` track, `surface-raised` thumb) to switch views inside one screen, e.g. a lecture's Overview / Transcript / Notes.

## Input

- One question per onboarding screen, with a progress bar (not dots) at the top, Back on the left, and the primary button at the bottom above the keyboard.
- Choices are `Chip`s or full-width option rows, not dropdowns. Use the native pickers for dates and times (`@react-native-community/datetimepicker`).
- Autofill and the correct keyboards: email, one-time code, new password.

## Feedback

- **Haptics** (`expo-haptics`, to add): light impact on primary presses, success notification when a debrief quiz passes, warning when recording stops unexpectedly.
- **Toasts** for confirmations that need no action ("Lecture saved"), placed above the tab bar for 3 s. Errors that need a decision go in a sheet or inline, never a toast.
- **Skeletons** while loading. Optimistic updates for small writes, rolled back with an inline error if they fail.

## Offline and sync

- Everything the student created is saved on the phone first, then synced. Show sync state only when it matters: a `warning` banner when offline, a per-item "Waiting to upload" chip, and "All saved" in the recording bar.
- Never block reading on the network: cached Today, courses, lectures and notes always open.

## Notifications

- Ask for permission at the moment of value (after adding the timetable: "Want a reminder before each class?"), not at launch.
- Kinds: class reminder (time-sensitive), debrief ready, follow-up due, exam countdown. Each one deep-links to its screen, and the student controls each kind in Settings.
- Respect quiet hours, and never send more than 3 a day outside class reminders.

## Voice and audio

- Recording keeps running with the screen locked (background audio), with a persistent notification on Android and the system's microphone indicator.
- Voice questions use hold-to-talk on the mic button, with a live waveform and the transcript shown before sending.
- Explanations can be played aloud (TTS) with a play/pause control and 1×/1.5×/2× speed, like a podcast player.

## Platform differences to keep

- iOS: back swipe, large titles, sheet detents, Haptic Touch previews.
- Android: system back closes sheets first, Material ripple on press, edge-to-edge with transparent system bars.
- Both: system font scaling, system dark mode, and the share sheet for exporting notes.

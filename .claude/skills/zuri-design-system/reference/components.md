# Components

Specs for the 12 Zuri Mobile components. Styles for the reference previews are in the design system's components/bundle.css; build the React Native versions from tokens.

## Button

Buttons start an action; one primary per screen.

**Variants**
- `primary` (Forest fill, `on-primary` text): the single main action, e.g. "Start class", "Save and continue".
- `secondary`: `border-strong` outline; the alternative action next to a primary.
- `tonal`: `tint` fill; low-emphasis actions inside cards ("Practise now").
- `text`: `accent-text`; tertiary actions and links in rows.
- `danger`: `danger-container` fill; destructive actions, always behind a confirmation sheet.

**Rules**
- Height `control-height` (52px), radius `radius-md`; the small size is `control-height-sm` with `radius-sm`, only inside cards and rows.
- Labels are verbs in sentence case: "Upload notes", not "Submit" or "UPLOAD".
- Full-width (`--block`) at the bottom of onboarding steps and sheets, inside the safe area.
- Pressed: `primary-pressed` fill plus a light haptic (`Haptics.impactAsync(Light)`). Disabled: 45% opacity, never a different colour.
- Loading: keep the label, add a spinner before it, and disable the button.

**The consumer provides:** the label, an optional leading Ionicons name, `onPress`, and `loading`/`disabled` state.

## TextField

A labelled single-line input; the label always sits above the field, never only as a placeholder.

- Field: `surface-raised`, a 1px `border-strong` edge, `radius-md`, height `control-height`. Text in `body`, placeholder in `text-subtle`.
- Help text under the field in `footnote` / `text-subtle`. On error the edge and help text turn `danger` and the message says how to fix it ("Use your school email, e.g. name@veritas.edu.ng").
- Set the right keyboard and autofill: `keyboardType="email-address"`, `textContentType="emailAddress"`, `autoComplete="password-new"` on sign-up, `one-time-code` on the 6-digit verify field.
- Focus shows the `focus` ring. Keep fields above the keyboard (`KeyboardAvoidingView`); the primary button rides above the keyboard on onboarding steps.

**The consumer provides:** label, value, onChangeText, an optional help or error string, and keyboard/autofill props.

## Chip

Compact labels for filters, choices and status.

- Filter/choice chips: `surface-sunken` with `text-muted`; selected uses `tint` with `on-tint` and a check icon (selection is never shown by colour alone).
- Status chips: `success`, `warning`, `danger` on their `-container` fills, **always with an icon and a word** ("Understood", "Due tomorrow", "Overdue").
- Height 32px with a 48px hit area (`touch-target`), `radius-sm`, `caption`-size text.
- In onboarding, chips answer "How do you like things explained?" (Examples first · Theory first · Step by step · Pictures and diagrams). Never write "learning style".

**The consumer provides:** label, optional Ionicons name, selected state, and `onPress` for interactive chips.

## Card

The default container for one idea on Home, Course and Plan.

- `surface-raised`, `radius-lg`, `space-4` padding, `shadow-card` in light and a hairline `border` in dark.
- Optional eyebrow (`eyebrow`, `accent-text`, capitals), title in `headline`, body in `callout` / `text-muted`, then at most one button row.
- The whole card is tappable when it leads somewhere; then don't put a separate "Open" button in it.
- Don't nest cards; don't stack two hero cards; don't add a coloured left border.

**The consumer provides:** eyebrow (optional), title, body, an optional action, and `onPress` if the card navigates.

## ListRow

Rows inside a grouped list: courses, lectures, materials, follow-ups, settings.

- Group on `surface-raised`, `radius-md`, rows divided by hairline `border`. Minimum row height 60px.
- Leading 40px icon well (`tint` / `on-tint`, `radius-sm`) or a course colour square; title in 16px semibold `text`, metadata in `footnote` / `text-subtle`; trailing chevron, chip or switch.
- Swipe actions follow the platform: trailing swipe for Delete/Archive on iOS; on Android, a long press opens a sheet with the same actions.
- Long lists use `FlatList` with `getItemLayout`; show 3 skeleton rows while loading.

**The consumer provides:** title, meta, a leading icon or colour, and a trailing element.

## NextClassCard

The Home hero: the next class with a live countdown and the one action that matters (spec stage 2 → 3).

- `surface-inverse` block, `radius-lg`, `space-6` padding. Eyebrow in `accent` (gold on Forest), course in `title-2` serif, venue and time in `text-on-inverse-muted`.
- Countdown in `stat` with tabular numerals; it updates every minute (every second in the last minute).
- Within 15 minutes of the start the action becomes **Start class** (`accent` fill, `on-accent` text), which opens the class session. Before that it's "Prepare", which opens the upcoming-lecture screen.
- Only one hero per screen. No class today: replace it with tomorrow's first class or a quiet card, never an empty hero.

**The consumer provides:** course code and title, venue, start/end time, minutes until start, and the action handler.

## ReadinessRing

Exam readiness for one course or overall (spec stage 7).

- Track `surface-sunken`, arc `accent` (gold is reserved for this kind of single highlight), 12px stroke, round caps. Percentage in `stat`, caption in `caption` / `text-subtle`.
- Next to it: coverage, hours needed ("~14 h to be ready") and the exam countdown, as plain rows.
- Animate from the previous value to the new one (600 ms ease-out) only when it changes; respect Reduce Motion.
- Below 40% add a `warning` chip with words ("Needs work"), never colour alone.
- Accessible label: "Readiness 67 percent, up from 41".

**The consumer provides:** percent (0–100), previous percent, caption.

## AnswerBubble

A question and Zuri's answer, with sources (spec stage 3 in class, stage 5 debrief, and Ask).

- Student question: right-aligned, `primary` / `on-primary`. Zuri's answer: left-aligned on `surface-raised` with a hairline `border`, in `callout`.
- Every grounded answer ends with source chips (`tint` / `on-tint`): "Slide 12", "Transcript 10:42", "Notes p.3". Tapping a chip opens that slide, seeks the lecture audio or opens the material.
- Anything from general knowledge carries a `footnote` line: "General knowledge, not from your course".
- Streaming: render tokens as they arrive with a 3-dot typing indicator until the first token. Keep the list pinned to the bottom unless the student scrolled up.
- In class, answers stay short (3–4 lines). "Explain more" expands to the detailed answer.

**The consumer provides:** message role, text (streamed), sources list, and an `isGeneral` flag.

## RecordingBar

The capture control inside the class session (spec stage 4).

- `surface-inverse` block; a `record-button` (72px) white disc with a `recording` red square to stop; elapsed time in `stat` with tabular numerals.
- A pulsing `recording` dot and the word "Recording" are always visible while audio is captured; the dot stops pulsing under Reduce Motion.
- Status line: chunk upload health ("All saved · 34 parts uploaded" / "Offline · 3 parts waiting"). Never hide that audio is being kept on the phone.
- Stopping asks for confirmation in a bottom sheet. Leaving the screen keeps recording (background audio) and shows a persistent notification on Android.

**The consumer provides:** elapsed seconds, upload status (uploaded / waiting counts), and the stop handler.

## StateView

Empty, error and offline states. Every screen that loads data has all of these: loading (skeletons), empty, error, offline.

- Empty: `tint` icon well, title in `headline`, one sentence in `callout` / `text-muted` saying what will appear and how to add the first one, plus one button.
- Error: `danger-container` well. Say what happened and what to do ("Couldn't load your timetable. Check your connection and try again."), then a Retry button. No apologies, no error codes in the title.
- Offline: a `warning` banner at the top of the screen ("You're offline. Changes will sync when you're back."), with cached content below.
- Loading: skeleton blocks in `surface-sunken` shaped like the content. Use a spinner only for actions under 2 s.

**The consumer provides:** kind (empty | error | offline), title, body, and the action label and handler.

## TabBar

The bottom tab bar: Home · Courses · Plan · Research · You.

- Height `tab-bar-height` plus the bottom safe-area inset, on `surface-raised` with a hairline `border` top.
- Icons `icon-lg` in Ionicons outline; the active tab gets the filled glyph, `primary` colour and a `tint` pill behind the icon (Material 3 style), with labels always shown.
- Five tabs at most. Tapping the active tab scrolls its list to the top. Lecturer and school-admin apps use their own tab sets with the same component.
- "Start class" and "Ask" are never tabs: they're actions on Home and on the course page.

**The consumer provides:** the routes, icon names (outline + filled) and labels.

## BottomSheet

Modal choices, confirmations and short forms: recording consent, add-course, stop recording, filters.

- `scrim` behind; sheet on `surface-raised` with `radius-xl` top corners, a grab handle, title in `title-2` serif, content, then full-width buttons inside the bottom safe area.
- Drag down or tap the scrim to dismiss, except for consent and destructive confirmations, which need an explicit choice.
- Use a sheet when the task is under one screen; anything longer is a pushed screen.
- **Recording consent** uses this sheet: who can hear the audio (private by default), how long it's kept, an "I have permission to record this class" switch, then "Start recording" / "Ask questions without recording".

**The consumer provides:** title, content, primary and secondary actions, and whether it can be dismissed by dragging.

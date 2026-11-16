# Brand book

Zuri is a study assistant for university students: it knows their timetable, sits in their lectures, and tells them what to revise before the exam. The app should feel like a calm, capable friend: quiet Paper screens, one Forest block that tells you what's next, and gold only where it matters. It follows the Zuri brand guide (Nov 2026) and the conventions of mainstream iOS and Android apps, so nothing about it needs learning.

## Content fundamentals

**Voice.** A smart final-year student helping a friend: plain, warm, specific, short sentences. Name real moments ("your CSC 301 class in Hall B", "the night before your exam"), never hype.

- Address the student as **you**; Zuri speaks as **I** only inside chat ("I've filed today's lecture under CSC 301").
- **Sentence case** everywhere: titles, buttons, tabs. Capitals only for `eyebrow` labels ("BEFORE CLASS").
- Write the name **Zuri** (no full stop in sentences; the dot belongs to the logo).
- Buttons are verbs that say what happens: "Start class", "Upload notes", "Start debrief". Never "Submit", "OK" or "Click here".
- Errors say what happened and what to do: "Couldn't upload part 12. It'll retry when you're back online." No apologies, no codes.
- Numbers are specific: "~14 h to be ready", "12 min", "3 follow-ups due".
- **Don't write:** "learning style", "re-taught the way you learn", "guaranteed grades", "never fail again", fake user numbers or testimonials, or that Zuri does assignments for you. Say "Explained the way you like it" or "Examples first" instead of "learning style".
- No emoji in UI copy.

## Visual foundations

**Colour.** Forest and Paper do most of the work. Gold is a highlight, about a tenth of a screen at most.

- Screens sit on `surface`; cards and list groups on `surface-raised`; inputs and tracks on `surface-sunken`.
- Text: `text` for primary, `text-muted` for secondary, `text-subtle` for timestamps and helper text. All pass 4.5:1 on `surface` and `surface-raised` in both themes.
- One hero per screen on `surface-inverse` (Forest in light) with `text-on-inverse`; its eyebrow uses `accent` (gold on Forest).
- Primary actions: `primary` with `on-primary`. Links and eyebrows on light grounds: `accent-text` (Text gold), never `gold` (it fails contrast as text).
- `accent` (Gold) fills only the single most important element: the readiness arc, the "Start class" button in the hero, a new-badge. Never a whole card or a background.
- `tint` (Mint) for icon wells and selected chips.
- Status: `success`, `warning`, `danger` with their `-container` fills, always with an icon and a word. `warning` is a burnt orange, deliberately not gold. `recording` red is only for the live recording dot, timer and stop square.
- **Dark theme** follows the system setting (`useColorScheme`), with a manual override in Settings → Appearance. Dark surfaces are green-tinted blacks, never pure #000; `primary` flips to Mint with Forest text.

**Type.** Source Serif 4 SemiBold for display, Inter for everything else (both from Google Fonts, already in the app as `@expo-google-fonts/*`).

- `display` once per screen at most (onboarding, readiness). `title-1` for tab roots, `title-2` for pushed screens, hero cards and sheet titles. Serif titles get -2% tracking.
- `headline` for card and row titles, `body` for reading, `callout` for card text and in-class answers, `subhead` for metadata, `footnote` for sources and helper text, `caption` for chips and tab labels.
- `eyebrow` is 11px Inter SemiBold in capitals with +10% tracking.
- `stat` for big numbers, always with tabular numerals (`fontVariant: ['tabular-nums']`).
- Support Dynamic Type / font scaling up to 1.3×: never fix heights on text containers, and let rows grow.

**Spacing and layout.** 4-point grid, using the `space-*` steps only.

- Screen gutter is `space-5` (20px) plus the safe-area insets. Card padding `space-4`, hero padding `space-6`. Gap `space-4` between cards and `space-6` between sections.
- One column on phones. On tablets, cap content width at 640px and centre it.

**Shape.** `radius-sm` for chips and badges, `radius-md` for buttons, fields and list groups, `radius-lg` for cards, `radius-xl` for sheet tops, `radius-full` for avatars, pills and the record button. Nothing else.

**Depth.** In light, cards get `shadow-card`. In dark, cards use the lighter `surface-raised` plus a hairline `border` and no shadow. `shadow-raised` for floating buttons and toasts, `shadow-sheet` for sheets and the tab bar.

**Motion.** 200–250 ms ease-out for presses and small changes, 300 ms spring for sheets and pushes (React Navigation defaults). Animate the readiness ring and the countdown only when values change. Respect Reduce Motion: no pulsing, cross-fades instead of slides.

**States.** Pressed is a darker fill (`primary-pressed`) or 8% `text` overlay plus a light haptic. Focus is a 2px `focus` ring offset 2px. Disabled is 45% opacity. Every data screen designs loading (skeletons on `surface-sunken`), empty, error and offline states.

## Iconography

- **Ionicons** via `@expo/vector-icons` (already used across the app): outline glyphs by default, filled glyphs for the selected tab.
- Sizes: `icon-sm` (16) in chips and metadata, `icon-md` (20) in rows and buttons, `icon-lg` (24) in tab bars and headers.
- Icons take the colour of the text beside them. An icon alone (no label) needs an `accessibilityLabel`.
- The **Z mark** (assets/Logos) is the app icon and splash. In the app UI the brand appears as the serif wordmark only on the splash, welcome and onboarding complete screens. Inside the app, screens show content, not the logo.

## Accessibility

- Touch targets at least `touch-target` (48px), even when the visual is smaller (use `hitSlop`).
- Contrast is 4.5:1 for text (3:1 at 24px+) and 3:1 for control edges, focus rings and meaningful icons. All token pairs named in the usage notes pass in both themes.
- Status is never colour alone: always an icon and a word.
- Every custom control sets `accessibilityRole`, `accessibilityLabel` and `accessibilityState`. Order VoiceOver/TalkBack reading top-left to bottom-right, and group card content into one element.
- Live regions announce the countdown each minute in the last 5 minutes, and say "Recording started/stopped".

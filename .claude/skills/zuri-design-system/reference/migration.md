# Moving the app onto these tokens

The app's styling has drifted. As of `main` `4a272f8`:

- **Two palettes.** `src/constants/zuri-theme.ts` (`ZuriColors`, the brand's Forest ink) is used by 14 files. `src/constants/zuri-ui.ts` (`UI`, an olive ink `#272e0a` and an orange amber `#c5832b` that aren't in the brand) is used by 75 files.
- **Raw values.** There are 248 raw hex literals (61 distinct colours), 22 font sizes and 32 corner radii in `src/app` and `src/components`.
- **No dark theme.**

## Replace the two palette files with one theme module

Create `src/theme/` with `tokens.ts` (generated from this system's `tokens.json`), `useTheme()` (light/dark from `useColorScheme` plus a Settings override), and `text.tsx` (a `<Text variant="headline">` that applies the type styles and font scaling). Keep `ZuriColors` and `UI` as deprecated aliases until every file has moved, then delete them.

## Colour mapping

| Old | New token | Note |
|---|---|---|
| `UI.bg` `#fbf9f4`, `ZuriColors.surface` | `surface` | `#fbf9f4` was a near-miss of Paper |
| `UI.card` `#ffffff` | `surface-raised` | |
| `UI.cardMuted` `#f5f3ee`, `#F5F3EF` | `surface-sunken` | |
| `UI.ink` `#272e0a` | `text` | olive ink is off-brand; Ink `#1b1c1c` |
| `UI.inkSoft` `#46483d` | `text-muted` | |
| `UI.muted` `#77786c` | `text-subtle` | `#77786c` failed 4.5:1 on white |
| `UI.border` / `borderSoft` (rgba) | `border` | |
| `UI.amber` `#c5832b`, `UI.amberSoft` | `warning` / `warning-container` when it means "due soon"; `accent` when it's a highlight | the old amber was doing both jobs |
| `UI.success` `#2f6b3a`, `successSoft` `#dfe8a9` | `success`, `success-container` | the old success fill was a yellow-green |
| `UI.error`, `errorSoft` | `danger`, `danger-container` | |
| `ZuriColors.primary` `#17231b` | `primary` (buttons) or `surface-inverse` (hero blocks) | |
| `ZuriColors.primaryContainer` `#2c3930` | `pine` / `primary-pressed` | |
| `ZuriColors.tertiaryFixedDim` `#e9c349` | `accent` | |
| `ZuriColors.tertiary` `#735c00` | `accent-text` | |
| `ZuriColors.primaryFixed` `#d7e6d9` | `tint` | |
| `#ba1a1a` in the recording screen | `recording` | its own token so errors and recording read differently |
| `#7a4f12`, `#6b4511` (brown text on amber) | `warning` | |

## Type mapping

| Old sizes | New style |
|---|---|
| 9, 10, 11 | `eyebrow` (capitals) or `caption` |
| 12, 13 | `caption` / `footnote` |
| 14, 15 | `subhead` / `callout` |
| 16, 17 | `body` / `headline` |
| 18–22 | `title-2` (serif) |
| 24–30 | `title-1` (serif) |
| 32 and up | `display` (serif) or `stat` (numbers) |

## Radius mapping

1–6 → `radius-sm` · 8–16 → `radius-md` · 17–24 → `radius-lg` · 25–40 → `radius-xl` · 44 and up → `radius-full`.

## How to roll it out

1. Add `src/theme/` and the `<Text>` component, with no visual change: the aliases point at the new tokens' light values.
2. Move screens over one area at a time (onboarding, Home, Courses, lecture, Plan, You, the deferred apps last). Each PR swaps literals for tokens and removes local `StyleSheet` colour values.
3. Add a lint rule (`no-restricted-syntax` on hex literals in `src/app/**`) once an area is clean.
4. Turn on dark mode once every screen in the student loop is on tokens.

---
name: zuri-design-system
description: The Zuri Mobile design system (colours, type, spacing, radius, components, mobile patterns, voice). Use for ANY UI work in this app — building or restyling a screen or component, choosing a colour, font size, spacing or radius, adding dark mode, writing button labels, error messages or other user-facing copy, or migrating code off the old ZuriColors / UI palettes. Do not invent colours, sizes or components outside it.
---

# Zuri Mobile design system

Zuri is a study assistant for university students. The UI is calm and quiet: Paper screens, one Forest block for what's next, and gold only where it matters. Follow this system for every screen, and don't add a value that isn't in it.

- **Live reference (tokens, previews in light and dark):** https://claude.ai/artifact/ERJZEJr1gTokiPcXsB7Gfj (private: ask the owner for access).
- **Exact values:** `tokens.json` in this folder. It is the single source of truth: read values from it, never from memory.
- **Deeper rules:**
  - `reference/brand-book.md`: voice, colour, type, spacing, depth, motion, icons, accessibility
  - `reference/components.md`: specs for the 12 components
  - `reference/patterns.md`: navigation, lists, input, feedback, offline, notifications, audio
  - `reference/migration.md`: mapping old values to tokens

## Hard rules

1. **Colours come only from tokens.** Never write a hex literal in `src/app/**` or `src/components/**`. Use the semantic tokens (`surface`, `text`, `primary`…), not the brand primitives, in screens.
2. **Both themes.** Every colour must work in light and dark. Take colours from the theme (see "In code" below), never from a light-only constant.
3. **Type styles only:** `display`, `title-1`, `title-2` (Source Serif 4 SemiBold), then `headline`, `body`, `callout`, `subhead`, `footnote`, `caption`, `eyebrow`, `stat` (Inter). No other font sizes.
4. **Spacing on the 4-pt grid only:** `space-1` 4, `space-2` 8, `space-3` 12, `space-4` 16, `space-5` 20, `space-6` 24, `space-8` 32, `space-12` 48.
5. **Five radii only:** `radius-sm` 8 (chips) · `radius-md` 14 (buttons, fields, list groups) · `radius-lg` 20 (cards) · `radius-xl` 28 (sheet tops) · `radius-full` 999.
6. **Gold (`accent`) is a highlight, at most ~10% of a screen:** the readiness arc, the "Start class" button in the hero, a single badge. Gold-coloured text uses `accent-text` (`#735c00` in light), never `gold`.
7. **Status is never colour alone.** `success`, `warning` and `danger` always come with an icon and a word. `warning` is burnt orange, not gold. `recording` red is only for the live recording dot, timer and stop square.
8. **Touch targets are at least 48px** (`touch-target`); use `hitSlop` when the visual is smaller. Every custom control sets `accessibilityRole`, `accessibilityLabel` and `accessibilityState`.
9. **Icons are Ionicons** (`@expo/vector-icons`): outline by default, filled for the selected tab. Sizes 16 / 20 / 24 (`icon-sm` / `icon-md` / `icon-lg`).
10. **Every data screen designs four states:** loading (skeletons on `surface-sunken`), empty, error and offline (use the `StateView` spec).

## Core tokens (light → dark)

| Token | Light | Dark | Use |
|---|---|---|---|
| `surface` | `#fbf9f8` | `#0f1712` | screen background |
| `surface-raised` | `#ffffff` | `#18221b` | cards, list groups, sheets, tab bar |
| `surface-sunken` | `#f0eded` | `#0a100c` | fields, tracks, skeletons |
| `surface-inverse` | `#17231b` | `#24302a` | the one hero card per screen |
| `text` / `text-muted` / `text-subtle` | `#1b1c1c` / `#434844` / `#5f6560` | `#eef1ee` / `#b9c3bc` / `#929d95` | primary / secondary / tertiary text |
| `text-on-inverse` | `#fbf9f8` | `#eef1ee` | text on the hero |
| `primary` / `on-primary` | `#17231b` / `#ffffff` | `#d7e6d9` / `#17231b` | primary buttons, selected tab |
| `accent` / `on-accent` | `#e9c349` / `#17231b` | same | the single gold highlight |
| `accent-text` | `#735c00` | `#e9c349` | links, eyebrows |
| `tint` / `on-tint` | `#d7e6d9` / `#17231b` | `#223328` / `#d7e6d9` | icon wells, selected chips, source chips |
| `border` / `border-strong` | `#e4e2e1` / `#737873` | `#2a362e` / `#76847a` | hairlines / control edges |
| `success` · `warning` · `danger` | `#2f6b3a` · `#8f4a00` · `#ba1a1a` | `#86c995` · `#f2ad6b` · `#ffb4ab` | status, each with a `-container` fill |
| `focus` | `#735c00` | `#e9c349` | 2px focus ring, 2px offset |

The full list, with usage notes and shadows and sizes, is in `tokens.json`.

## In code

**Target structure** (Phase 0 of `docs/MOBILE_ROADMAP.md`):
- `src/theme/tokens.ts`: generated from `tokens.json`, `{ light, dark }` colour maps plus spacing, radius, size and type styles.
- `useTheme()`: reads `useColorScheme()` plus the Settings override and returns `{ colors, space, radius, type }`.
- `<Text variant="headline">`: applies a type style and `allowFontScaling`, with tabular numerals for `stat`.

```tsx
const { colors, space, radius } = useTheme();
const styles = useMemo(() => StyleSheet.create({
  card: { backgroundColor: colors['surface-raised'], borderRadius: radius.lg, padding: space[4],
          borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
}), [colors]);
<Text variant="eyebrow" style={{ color: colors['accent-text'] }}>BEFORE CLASS</Text>
```

**Until `src/theme/` exists:** don't add new values to `src/constants/zuri-ui.ts` (`UI`) or `zuri-theme.ts` (`ZuriColors`). Use the token's light value, add a `// token: <name>` comment so the migration can find it, and follow the old → new map in `reference/migration.md`. For example, `UI.ink` `#272e0a` becomes `text` `#1b1c1c`, and `UI.amber` becomes `warning` or `accent` depending on meaning.

**Fonts:** `SourceSerif4_600SemiBold` for display and titles. `Inter_400Regular`, `Inter_500Medium` and `Inter_600SemiBold` for text (already loaded by `use-zuri-fonts`). Serif titles get −2% letter-spacing; `eyebrow` is +10%, written in capitals.

## Components

Build these to the specs in `reference/components.md` and reuse them; don't fork variants per screen:

| Kind | Components |
|---|---|
| Inputs and actions | `Button` (primary / secondary / tonal / text / danger, 52px), `TextField`, `Chip` |
| Containers | `Card`, `ListRow` (grouped lists) |
| Zuri's own | `NextClassCard` (the Home hero with countdown, "Start class"), `ReadinessRing`, `AnswerBubble` (streamed answers with source chips), `RecordingBar` |
| States and navigation | `StateView` (empty / error / offline), `TabBar`, `BottomSheet` (incl. recording consent) |

## Words (from the brand guide)

- **Voice:** plain, warm and specific, like a smart final-year student helping a friend. Use sentence case, "you" for the student, and "I" only for Zuri inside chat.
- **Buttons** are verbs that say what happens: "Start class", "Upload notes", "Start debrief". Never "Submit" or "OK".
- **Errors** say what happened and what to do, with no apology and no codes.
- **Never write:** "learning style", "re-taught the way you learn", "guaranteed grades", "never fail again", or made-up user numbers. Say "Examples first" or "Explained the way you like it" instead.
- Write the name as **Zuri** in sentences (no full stop). No emoji in UI copy.

## Before you finish UI work

- [ ] No hex literals, raw font sizes or off-scale spacing/radius added
- [ ] Checked in light and dark (`useColorScheme` override or the simulator's appearance setting)
- [ ] Text is 4.5:1 on its background (the token pairs in `tokens.json` usage notes already pass)
- [ ] Loading, empty, error and offline states exist
- [ ] Hit areas ≥ 48px, accessibility labels set, 1.3× font scale doesn't clip
- [ ] Copy follows the voice rules above
- [ ] Lecturer, school admin and research screens (deferred apps, see `docs/SPEC_ALIGNMENT_REPORT.md`) still render if you changed shared components

#!/usr/bin/env node
/**
 * Generates src/theme/tokens.ts from the design system's tokens.json.
 *
 *   node scripts/generate-tokens.mjs          write the file
 *   node scripts/generate-tokens.mjs --check  fail if the file is out of date (for CI)
 *
 * tokens.json (.claude/skills/zuri-design-system/tokens.json) is the single
 * source of truth. Never edit src/theme/tokens.ts by hand.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(root, '.claude/skills/zuri-design-system/tokens.json');
const OUT = resolve(root, 'src/theme/tokens.ts');

const json = JSON.parse(readFileSync(SRC, 'utf8'));

const px = (v) => {
  const n = parseFloat(String(v));
  if (Number.isNaN(n)) throw new Error(`Not a px value: ${v}`);
  return n;
};
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const key = (s) => (/^[a-zA-Z_$][\w$]*$/.test(s) ? s : JSON.stringify(s));

// ─── Colours ────────────────────────────────────────────────────
const brand = {};
const light = {};
const dark = {};
for (const t of json.color.tokens) {
  if (typeof t.value === 'string') {
    brand[t.name] = t.value;
  } else {
    light[t.name] = t.value.light;
    dark[t.name] = t.value.dark;
  }
}

// ─── Type ───────────────────────────────────────────────────────
// Each family maps a CSS weight to a loaded font file (see use-zuri-fonts).
const fontFiles = {
  serif: { 400: 'SourceSerif4_400Regular', 600: 'SourceSerif4_600SemiBold' },
  sans: { 400: 'Inter_400Regular', 500: 'Inter_500Medium', 600: 'Inter_600SemiBold' },
};
const type = {};
for (const group of json.type.groups) {
  for (const s of group.styles) {
    const fontFamily = fontFiles[group.family]?.[s.fontWeight];
    if (!fontFamily) throw new Error(`No font file for ${group.family} ${s.fontWeight} (${s.name})`);
    type[s.name] = {
      fontFamily,
      fontSize: px(s.fontSize),
      lineHeight: px(s.lineHeight),
      ...(s.letterSpacing ? { letterSpacing: px(s.letterSpacing) } : {}),
    };
  }
}

// ─── Spacing, radius, size ──────────────────────────────────────
const stripPrefix = (name, prefix) => name.replace(new RegExp(`^${prefix}-`), '');
const space = Object.fromEntries(json.spacing.tokens.map((t) => [stripPrefix(t.name, 'space'), px(t.value)]));
const radius = Object.fromEntries(json.radius.tokens.map((t) => [stripPrefix(t.name, 'radius'), px(t.value)]));
const size = Object.fromEntries(json.size.tokens.map((t) => [camel(t.name), px(t.value)]));

// ─── Shadows ────────────────────────────────────────────────────
// React Native (new architecture) takes CSS box-shadow strings directly.
const shadowLight = {};
const shadowDark = {};
for (const t of json.shadow.tokens) {
  const name = camel(stripPrefix(t.name, 'shadow'));
  shadowLight[name] = t.value.light === 'none' ? undefined : t.value.light;
  shadowDark[name] = t.value.dark === 'none' ? undefined : t.value.dark;
}

// ─── Emit ───────────────────────────────────────────────────────
const obj = (o, indent = 2) => {
  const pad = ' '.repeat(indent);
  const lines = Object.entries(o).map(([k, v]) => {
    if (v && typeof v === 'object') return `${pad}${key(k)}: ${obj(v, indent + 2)},`;
    return `${pad}${key(k)}: ${v === undefined ? 'undefined' : JSON.stringify(v)},`;
  });
  return `{\n${lines.join('\n')}\n${' '.repeat(indent - 2)}}`;
};

const out = `// GENERATED FILE. Do not edit by hand.
// Source: .claude/skills/zuri-design-system/tokens.json (${json.name} v${json.version}, synced ${json.meta?.synced ?? 'unknown'})
// Regenerate with: node scripts/generate-tokens.mjs

/** Brand primitives. Screens use the semantic colours below, not these. */
export const brand = ${obj(brand)} as const;

/** Semantic colours, light theme. */
export const lightColors = ${obj(light)} as const;

/** Semantic colours, dark theme. */
export const darkColors: { readonly [K in keyof typeof lightColors]: string } = ${obj(dark)};

export type ColorToken = keyof typeof lightColors;
export type ThemeColors = { readonly [K in ColorToken]: string };

/** Type styles. Use them through <Text variant>, not directly. */
export const type = ${obj(type)} as const;

export type TypeVariant = keyof typeof type;

/** 4-point spacing scale: space[4] is 16. */
export const space = ${obj(space)} as const;

/** The five radii. */
export const radius = ${obj(radius)} as const;

/** Fixed sizes (touch target, control heights, icons). */
export const size = ${obj(size)} as const;

/** CSS box-shadow strings; undefined means no shadow in that theme. */
export const lightShadows: { readonly [K in ShadowToken]: string | undefined } = ${obj(shadowLight)};
export const darkShadows: { readonly [K in ShadowToken]: string | undefined } = ${obj(shadowDark)};

export type ShadowToken = ${Object.keys(shadowLight).map((k) => JSON.stringify(k)).join(' | ')};
`;

if (process.argv.includes('--check')) {
  let current = '';
  try {
    current = readFileSync(OUT, 'utf8');
  } catch {}
  if (current.replace(/\r\n/g, '\n') !== out) {
    console.error('src/theme/tokens.ts is out of date. Run: node scripts/generate-tokens.mjs');
    process.exit(1);
  }
  console.log('tokens.ts is up to date.');
} else {
  writeFileSync(OUT, out);
  console.log(`Wrote ${OUT}`);
}

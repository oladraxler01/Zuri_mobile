"""
Generate src/theme/tokens.ts from the design system's tokens.json.

    python scripts/generate-theme-tokens.py          write the file
    python scripts/generate-theme-tokens.py --check  fail if it's out of date (CI)

tokens.json (.claude/skills/zuri-design-system/tokens.json) is the single
source of truth; never edit src/theme/tokens.ts by hand.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, '.claude', 'skills', 'zuri-design-system', 'tokens.json')
OUT = os.path.join(ROOT, 'src', 'theme', 'tokens.ts')

d = json.load(open(SRC, encoding='utf-8'))


def px(v):
    m = re.match(r'^(-?[\d.]+)px$', str(v).strip())
    return float(m.group(1)) if m else None


def num(v):
    n = px(v)
    if n is None:
        return None
    return int(n) if n == int(n) else n


light, dark, brand = {}, {}, {}
for t in d['color']['tokens']:
    v = t['value']
    if isinstance(v, dict):
        light[t['name']] = v['light']
        dark[t['name']] = v['dark']
    else:
        brand[t['name']] = v


def keyed(prefix, tokens):
    out = {}
    for t in tokens:
        name = t['name']
        key = name[len(prefix):] if name.startswith(prefix) else name
        n = num(t['value'])
        if n is not None:
            out[key] = n
    return out


space = keyed('space-', d['spacing']['tokens'])
radius = keyed('radius-', d['radius']['tokens'])
size = {t['name']: num(t['value']) for t in d['size']['tokens'] if num(t['value']) is not None}

def camel(name):
    return re.sub(r'-([a-z])', lambda m: m.group(1).upper(), name)


# React Native (new architecture) takes CSS box-shadow strings; None = no shadow.
shadow_light, shadow_dark = {}, {}
for t in d.get('shadow', {}).get('tokens', []):
    key = camel(t['name'][len('shadow-'):] if t['name'].startswith('shadow-') else t['name'])
    shadow_light[key] = None if t['value']['light'] == 'none' else t['value']['light']
    shadow_dark[key] = None if t['value']['dark'] == 'none' else t['value']['dark']

FONT = {('serif', 600): 'SourceSerif4_600SemiBold', ('sans', 400): 'Inter_400Regular',
        ('sans', 500): 'Inter_500Medium', ('sans', 600): 'Inter_600SemiBold'}
type_styles = {}
for g in d['type']['groups']:
    for s in g['styles']:
        weight = int(s.get('fontWeight', 400))
        style = {
            'fontFamily': FONT.get((g['family'], weight), FONT[(g['family'], 600)] if g['family'] == 'serif' else FONT[('sans', 400)]),
            'fontSize': num(s['fontSize']),
            'lineHeight': num(s['lineHeight']),
        }
        ls = num(s.get('letterSpacing', '0px'))
        if ls:
            style['letterSpacing'] = ls
        if s['name'] == 'eyebrow':
            style['textTransform'] = 'uppercase'
        if s['name'] == 'stat':
            style['fontVariant'] = ['tabular-nums']
        type_styles[s['name']] = style


def ts(obj, indent=2):
    pad = ' ' * indent
    lines = ['{']
    for k, v in obj.items():
        key = k if re.match(r'^[A-Za-z_$][\w$]*$', k) else json.dumps(k)
        if isinstance(v, dict):
            lines.append(f'{pad}{key}: {ts(v, indent + 2)},')
        else:
            lines.append(f'{pad}{key}: {"undefined" if v is None else json.dumps(v)},')
    lines.append(' ' * (indent - 2) + '}')
    return '\n'.join(lines)


out = f'''// GENERATED from .claude/skills/zuri-design-system/tokens.json by
// scripts/generate-theme-tokens.py. Do not edit by hand.

/** Semantic colours, light theme. */
export const lightColors = {ts(light)} as const;

/** Semantic colours, dark theme (same keys as light). */
export const darkColors: Record<keyof typeof lightColors, string> = {ts(dark)};

/** Brand primitives. Screens use the semantic colours above, not these. */
export const brand = {ts(brand)} as const;

/** 4-pt spacing scale: space[4] = 16. */
export const space = {ts(space)} as const;

/** The five corner radii. */
export const radius = {ts(radius)} as const;

/** Fixed sizes (touch-target, control-height, …). */
export const size = {ts(size)} as const;

/** Type styles: spread into a Text style, e.g. {{...type.headline}}. */
export const type = {ts(type_styles)} as const;

/** CSS box-shadow strings per theme; undefined means no shadow (dark cards use a hairline instead). */
export const lightShadows: Record<ShadowName, string | undefined> = {ts(shadow_light)};
export const darkShadows: Record<ShadowName, string | undefined> = {ts(shadow_dark)};

export type ColorName = keyof typeof lightColors;
export type TypeStyle = keyof typeof type;
export type SizeName = keyof typeof size;
export type ShadowName = {' | '.join(json.dumps(k) for k in shadow_light) or 'never'};
'''

if '--check' in sys.argv:
    try:
        # newline='' keeps \r\n so a CRLF checkout can be compared after normalising.
        current = open(OUT, encoding='utf-8', newline='').read().replace('\r\n', '\n')
    except FileNotFoundError:
        current = ''
    if current != out:
        print('src/theme/tokens.ts is out of date. Run: npm run tokens', file=sys.stderr)
        sys.exit(1)
    print('tokens.ts is up to date.')
else:
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w', encoding='utf-8', newline='\n').write(out)
    print('wrote', OUT)

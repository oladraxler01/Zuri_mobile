import type { CitationStyle, Evidence, Paper, ResearchProject } from '@/types/research';
import { queryTerms } from '@/utils/source-search';

// ─── Citations ────────────────────────────────────────────────────

function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  const last = parts.pop() ?? full;
  return { last, initials: parts.map((p) => `${p[0]}.`).join(' '), first: parts.join(' ') };
}

function authorsApa(authors: string[]) {
  const a = authors.slice(0, 20).map((n) => {
    const s = splitName(n);
    return s.initials ? `${s.last}, ${s.initials}` : s.last;
  });
  if (!a.length) return 'Unknown author';
  if (a.length === 1) return a[0];
  return `${a.slice(0, -1).join(', ')}, & ${a[a.length - 1]}`;
}

function doiUrl(p: Paper) {
  return p.doi ? (p.doi.startsWith('http') ? p.doi : `https://doi.org/${p.doi}`) : p.url ?? '';
}

export const STYLE_LABEL: Record<CitationStyle, string> = { apa: 'APA 7', mla: 'MLA 9', harvard: 'Harvard', bibtex: 'BibTeX' };

export function formatCitation(p: Paper, style: CitationStyle): string {
  const year = p.year ?? 'n.d.';
  switch (style) {
    case 'apa':
      return `${authorsApa(p.authors)} (${year}). ${p.title}.${p.venue ? ` ${p.venue}.` : ''}${doiUrl(p) ? ` ${doiUrl(p)}` : ''}`;
    case 'mla': {
      const a = p.authors;
      const first = a[0] ? (() => { const s = splitName(a[0]); return s.first ? `${s.last}, ${s.first}` : s.last; })() : 'Unknown author';
      const who = a.length > 2 ? `${first}, et al` : a.length === 2 ? `${first}, and ${a[1]}` : first;
      return `${who}. “${p.title}.” ${p.venue ? `${p.venue}, ` : ''}${year}${doiUrl(p) ? `, ${doiUrl(p).replace(/^https?:\/\//, '')}` : ''}.`;
    }
    case 'harvard': {
      const a = p.authors.map((n) => { const s = splitName(n); return s.initials ? `${s.last}, ${s.initials}` : s.last; });
      const who = a.length > 3 ? `${a[0]} et al.` : a.length > 1 ? `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}` : a[0] ?? 'Unknown author';
      return `${who} (${year}) ‘${p.title}’${p.venue ? `, ${p.venue}` : ''}.${doiUrl(p) ? ` Available at: ${doiUrl(p)}` : ''}`;
    }
    case 'bibtex': {
      const key = `${(splitName(p.authors[0] ?? 'anon').last).toLowerCase().replace(/[^a-z]/g, '')}${p.year ?? ''}${(p.title.split(/\s+/)[0] ?? '').toLowerCase().replace(/[^a-z]/g, '')}`;
      return [
        `@article{${key},`,
        `  title = {${p.title}},`,
        `  author = {${p.authors.join(' and ') || 'Unknown'}},`,
        p.year ? `  year = {${p.year}},` : '',
        p.venue ? `  journal = {${p.venue}},` : '',
        p.doi ? `  doi = {${p.doi.replace(/^https?:\/\/doi.org\//, '')}},` : '',
        '}',
      ]
        .filter(Boolean)
        .join('\n');
    }
  }
}

/** Short in-text marker, e.g. (Bellman, 1954) or (Smith et al., 2021). */
export function inText(p: Paper) {
  const last = splitName(p.authors[0] ?? 'Unknown').last;
  return `(${last}${p.authors.length > 2 ? ' et al.' : p.authors.length === 2 ? ` & ${splitName(p.authors[1]).last}` : ''}, ${p.year ?? 'n.d.'})`;
}

// ─── Reading ──────────────────────────────────────────────────────

export function sentences(text?: string): string[] {
  if (!text) return [];
  return (text.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [text]).map((s) => s.trim()).filter((s) => s.length > 25);
}

const FINDING_CUES = /\b(we (find|found|show|showed|demonstrate|report|observe)|results? (show|suggest|indicate|reveal)|found that|shows? that|suggests? that|significant(ly)?|outperform|improv(e|ed|es|ement)|reduc(e|ed|es|tion)|increas(e|ed|es)|conclude|evidence)\b|\d+(\.\d+)?\s?%/i;

/** Sentences of the abstract that state results; falls back to the last two sentences. */
export function keyFindings(p: Paper): string[] {
  const s = sentences(p.abstract);
  const hits = s.filter((x) => FINDING_CUES.test(x));
  return (hits.length ? hits : s.slice(-2)).slice(0, 4);
}

// ─── Themes and literature map ────────────────────────────────────

export interface Theme {
  name: string;
  paperIds: string[];
  custom: boolean;
}

/** Topics shared by 2+ sources (or the top topics if few overlap), plus the student's own themes. */
export function deriveThemes(papers: Paper[], custom: string[] = []): Theme[] {
  const count = new Map<string, Set<string>>();
  for (const p of papers) for (const t of p.topics) count.set(t, (count.get(t) ?? new Set()).add(p.id));
  let derived = [...count.entries()]
    .map(([name, ids]) => ({ name, paperIds: [...ids], custom: false }))
    .sort((a, b) => b.paperIds.length - a.paperIds.length);
  const shared = derived.filter((t) => t.paperIds.length >= 2);
  derived = (shared.length >= 3 ? shared : derived).slice(0, 8);
  const own = custom.map((name) => ({
    name,
    paperIds: papers.filter((p) => p.topics.some((t) => t.toLowerCase().includes(name.toLowerCase()))).map((p) => p.id),
    custom: true,
  }));
  const seen = new Set(own.map((o) => o.name.toLowerCase()));
  return [...own, ...derived.filter((d) => !seen.has(d.name.toLowerCase()))];
}

/** How strongly each pair of sources is linked (number of shared topics). */
export function connections(papers: Paper[]) {
  const links: { a: Paper; b: Paper; shared: string[] }[] = [];
  for (let i = 0; i < papers.length; i++)
    for (let j = i + 1; j < papers.length; j++) {
      const shared = papers[i].topics.filter((t) => papers[j].topics.includes(t));
      if (shared.length) links.push({ a: papers[i], b: papers[j], shared });
    }
  return links.sort((x, y) => y.shared.length - x.shared.length);
}

// ─── Synthesis and chat ───────────────────────────────────────────

export interface SynthesisSection {
  theme: string;
  supports: { e: Evidence; p?: Paper }[];
  contradicts: { e: Evidence; p?: Paper }[];
  background: { e: Evidence; p?: Paper }[];
  sourceCount: number;
}

export function buildSynthesis(project: ResearchProject, papers: Paper[]) {
  const byId = new Map(papers.map((p) => [p.id, p]));
  const themes = deriveThemes(papers, project.themes);
  const sections: SynthesisSection[] = [];
  const used = new Set<string>();
  const add = (theme: string, list: Evidence[], sourceCount: number) => {
    const pick = (s: Evidence['stance']) => list.filter((e) => e.stance === s).map((e) => ({ e, p: byId.get(e.paperId) }));
    list.forEach((e) => used.add(e.id));
    sections.push({ theme, supports: pick('supports'), contradicts: pick('contradicts'), background: pick('background'), sourceCount });
  };
  for (const t of themes) {
    const list = project.evidence.filter((e) => !used.has(e.id) && (e.theme === t.name || (!e.theme && t.paperIds.includes(e.paperId))));
    if (list.length) add(t.name, list, t.paperIds.length);
  }
  const rest = project.evidence.filter((e) => !used.has(e.id));
  if (rest.length) add('Other evidence', rest, new Set(rest.map((e) => e.paperId)).size);
  const gaps = themes.filter((t) => !sections.some((s) => s.theme === t.name)).map((t) => t.name);
  return { sections, gaps };
}

export interface ResearchHit {
  paper: Paper;
  text: string;
  kind: 'abstract' | 'evidence' | 'note';
  score: number;
}

/** Answer a question from a project's sources: abstracts, extracted evidence and notes. */
export function askProject(question: string, project: ResearchProject, papers: Paper[], limit = 4): ResearchHit[] {
  const terms = queryTerms(question);
  if (!terms.length) return [];
  const score = (text: string) => {
    const words = queryTerms(text);
    return terms.reduce((n, t) => n + (words.some((w) => w.startsWith(t) || t.startsWith(w)) ? 1 : 0), 0);
  };
  const byId = new Map(papers.map((p) => [p.id, p]));
  const hits: ResearchHit[] = [];
  for (const p of papers) for (const s of sentences(p.abstract)) {
    const sc = score(s);
    if (sc) hits.push({ paper: p, text: s, kind: 'abstract', score: sc });
  }
  for (const e of project.evidence) {
    const p = byId.get(e.paperId);
    const sc = score(`${e.quote} ${e.note ?? ''}`);
    if (p && sc) hits.push({ paper: p, text: e.quote, kind: 'evidence', score: sc + 0.5 });
  }
  for (const n of project.notes) {
    const p = n.paperId ? byId.get(n.paperId) : undefined;
    const sc = score(n.text);
    if (p && sc) hits.push({ paper: p, text: n.text, kind: 'note', score: sc });
  }
  const seen = new Set<string>();
  return hits
    .sort((a, b) => b.score - a.score)
    .filter((h) => (seen.has(h.text) ? false : (seen.add(h.text), true)))
    .slice(0, limit);
}

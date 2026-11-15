import type { Paper } from '@/types/research';
import { ApiError } from '@/services/lecture-api';

/**
 * Academic paper search via OpenAlex (https://openalex.org), a free, open
 * catalogue of scholarly works. No key or account is needed; only the search
 * words are sent. Nothing about the student is included in requests.
 */

const BASE = 'https://api.openalex.org';
const FIELDS =
  'id,display_name,authorships,publication_year,primary_location,doi,open_access,abstract_inverted_index,cited_by_count,topics,keywords,referenced_works_count,type';

export type PaperSort = 'relevance' | 'cited' | 'newest';

export interface SearchOptions {
  fromYear?: number;
  openAccessOnly?: boolean;
  sort?: PaperSort;
  page?: number;
}

/** OpenAlex stores abstracts as word → positions; rebuild the text. */
function rebuildAbstract(inv?: Record<string, number[]> | null): string | undefined {
  if (!inv) return undefined;
  const words: string[] = [];
  for (const [w, positions] of Object.entries(inv)) for (const p of positions) words[p] = w;
  const text = words.filter(Boolean).join(' ').replace(/\s+([,.;:!?)])/g, '$1').replace(/^Abstract\s*:?\s*/i, '');
  return text.length > 40 ? text : undefined;
}

export function toPaper(w: any): Paper {
  const topics = [
    ...(w.topics ?? []).map((t: any) => t.display_name),
    ...(w.keywords ?? []).map((k: any) => k.display_name),
  ].filter(Boolean);
  return {
    id: String(w.id ?? '').replace('https://openalex.org/', ''),
    title: w.display_name ?? 'Untitled',
    authors: (w.authorships ?? []).map((a: any) => a.author?.display_name).filter(Boolean),
    year: w.publication_year ?? undefined,
    venue: w.primary_location?.source?.display_name ?? undefined,
    doi: w.doi ?? undefined,
    url: w.primary_location?.landing_page_url ?? w.doi ?? undefined,
    oaUrl: w.open_access?.oa_url ?? undefined,
    abstract: rebuildAbstract(w.abstract_inverted_index),
    citedBy: w.cited_by_count ?? 0,
    referencesCount: w.referenced_works_count ?? 0,
    topics: Array.from(new Set(topics.map((t: string) => t.charAt(0).toUpperCase() + t.slice(1)))).slice(0, 8) as string[],
    type: w.type ?? undefined,
  };
}

async function get(path: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${BASE}${path}`, { signal: controller.signal });
    if (!res.ok) throw new ApiError('server', `The paper catalogue had a problem (${res.status}). Try again shortly.`);
    return await res.json();
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError('network', 'Couldn’t reach the paper catalogue. Check your connection.');
  } finally {
    clearTimeout(timer);
  }
}

export async function searchPapers(query: string, opts: SearchOptions = {}): Promise<{ papers: Paper[]; total: number }> {
  const filters: string[] = [];
  if (opts.fromYear) filters.push(`from_publication_date:${opts.fromYear}-01-01`);
  if (opts.openAccessOnly) filters.push('is_oa:true');
  const sort = opts.sort === 'cited' ? '&sort=cited_by_count:desc' : opts.sort === 'newest' ? '&sort=publication_date:desc' : '';
  const params =
    `search=${encodeURIComponent(query)}&per-page=20&page=${opts.page ?? 1}&select=${FIELDS}` +
    (filters.length ? `&filter=${filters.join(',')}` : '') +
    sort;
  const json = await get(`/works?${params}`);
  return { papers: (json.results ?? []).map(toPaper), total: json.meta?.count ?? 0 };
}

export async function getPaper(id: string): Promise<Paper> {
  return toPaper(await get(`/works/${encodeURIComponent(id)}?select=${FIELDS}`));
}

/** Most-cited papers that cite this one. */
export async function citingPapers(id: string, limit = 5): Promise<Paper[]> {
  const json = await get(`/works?filter=cites:${encodeURIComponent(id)}&sort=cited_by_count:desc&per-page=${limit}&select=${FIELDS}`);
  return (json.results ?? []).map(toPaper);
}

/** Most-cited papers this one references. */
export async function referencedPapers(id: string, limit = 5): Promise<Paper[]> {
  const json = await get(`/works?filter=cited_by:${encodeURIComponent(id)}&sort=cited_by_count:desc&per-page=${limit}&select=${FIELDS}`);
  return (json.results ?? []).map(toPaper);
}

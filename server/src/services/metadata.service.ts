import { config } from '../config.js';

async function fetchJson(url: URL | string, timeoutMs = 5000): Promise<unknown> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface MetadataResult {
  id: string;
  title: string;
  year: string | null;
  mediaType: 'movie' | 'tv';
  posterUrl: string | null;
  releaseDate: string | null;
  providerRatings: Record<string, number> | null;
  provider: 'TMDB' | 'OMDB';
}

const cache = new Map<string, MetadataResult[]>();
const TTL_MS = 5 * 60 * 1000;

async function searchTmdb(query: string): Promise<MetadataResult[]> {
  if (!config.tmdbApiKey) return [];
  const url = new URL('https://api.themoviedb.org/3/search/multi');
  url.searchParams.set('api_key', config.tmdbApiKey);
  url.searchParams.set('query', query);
  url.searchParams.set('language', 'en-US');
  url.searchParams.set('include_adult', 'false');
  const data = (await fetchJson(url)) as {
    results?: Array<{
      id: number;
      name?: string;
      title?: string;
      release_date?: string;
      first_air_date?: string;
      media_type?: string;
      poster_path?: string | null;
      vote_average?: number;
    }>;
  } | null;
  if (!data) return [];
  return (data.results ?? [])
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((r) => ({
      id: `tmdb-${r.media_type}-${r.id}`,
      title: r.title ?? r.name ?? '',
      year: (r.release_date ?? r.first_air_date ?? '').slice(0, 4) || null,
      mediaType: r.media_type === 'movie' ? ('movie' as const) : ('tv' as const),
      posterUrl: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
      releaseDate: r.release_date ?? r.first_air_date ?? null,
      providerRatings: r.vote_average ? { tmdb: Number(r.vote_average.toFixed(1)) } : null,
      provider: 'TMDB' as const,
    }));
}

async function searchOmdb(query: string): Promise<MetadataResult[]> {
  if (!config.omdbApiKey) return [];
  const searchUrl = new URL('https://www.omdbapi.com/');
  searchUrl.searchParams.set('apikey', config.omdbApiKey);
  searchUrl.searchParams.set('s', query);
  searchUrl.searchParams.set('type', 'movie');
  const data = (await fetchJson(searchUrl)) as {
    Response?: string;
    Search?: Array<{ imdbID: string; Title: string; Year: string; Poster: string; Type: string }>;
  } | null;
  if (!data || data.Response !== 'True') return [];
  const results = await Promise.all(
    (data.Search ?? []).slice(0, 5).map(async (r) => {
      const detailUrl = new URL('https://www.omdbapi.com/');
      detailUrl.searchParams.set('apikey', config.omdbApiKey);
      detailUrl.searchParams.set('i', r.imdbID);
      const detail = ((await fetchJson(detailUrl)) ?? {}) as { imdbRating?: string; Poster?: string; Released?: string };
      return {
        id: `omdb-${r.imdbID}`,
        title: r.Title,
        year: r.Year?.slice(0, 4) || null,
        mediaType: r.Type === 'series' ? ('tv' as const) : ('movie' as const),
        posterUrl:
          detail.Poster && detail.Poster !== 'N/A'
            ? detail.Poster
            : r.Poster && r.Poster !== 'N/A'
              ? r.Poster
              : null,
        releaseDate: detail.Released && detail.Released !== 'N/A' ? detail.Released : null,
        providerRatings: detail.imdbRating && detail.imdbRating !== 'N/A' ? { imdb: Number(detail.imdbRating) } : null,
        provider: 'OMDB' as const,
      };
    }),
  );
  return results;
}

function dedupe(results: MetadataResult[]): MetadataResult[] {
  const seen = new Set<string>();
  const out: MetadataResult[] = [];
  for (const r of results) {
    const key = `${r.title.toLowerCase()}|${r.year ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export async function searchMetadata(query: string): Promise<MetadataResult[]> {
  const key = query.trim().toLowerCase();
  if (!key) return [];
  const cached = cache.get(key);
  if (cached) return cached;
  const [tmdb, omdb] = await Promise.all([searchTmdb(query.trim()), searchOmdb(query.trim())]);
  const merged = dedupe([...tmdb, ...omdb]);
  cache.set(key, merged);
  setTimeout(() => cache.delete(key), TTL_MS).unref();
  return merged;
}

export function clearMetadataCache() {
  cache.clear();
}

export async function fetchMetadataForTitle(title: string): Promise<MetadataResult | null> {
  const results = await searchMetadata(title);
  const exact = results.find((r) => r.title.toLowerCase() === title.toLowerCase());
  return exact ?? results[0] ?? null;
}

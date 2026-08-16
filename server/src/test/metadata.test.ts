import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app, auth, signupUser } from './helpers.js';
import { clearMetadataCache } from '../services/metadata.service.js';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function mockProviders() {
  fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('themoviedb.org')) {
      const q = new URL(url).searchParams.get('query') ?? 'Inception';
      return {
        ok: true,
        json: async () => ({
          results: [
            { id: 1, title: q, media_type: 'movie', release_date: '2010-07-16', poster_path: '/x.jpg', vote_average: 8.4 },
          ],
        }),
      };
    }
    if (url.includes('omdbapi.com') && url.includes('i=')) {
      return {
        ok: true,
        json: async () => ({ imdbRating: '8.8', Poster: 'https://i/img.jpg', Released: '16 Jul 2010' }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        Response: 'True',
        Search: [{ imdbID: 'tt1375666', Title: 'Inception', Year: '2010', Poster: 'https://i/img.jpg', Type: 'movie' }],
      }),
    };
  });
}

describe('metadata search', () => {
  beforeEach(() => fetchMock.mockReset());
  afterEach(() => {
    fetchMock.mockReset();
    clearMetadataCache();
  });

  it('returns merged results from TMDB and OMDb', async () => {
    mockProviders();
    const { token } = await signupUser();
    const res = await request(app).get('/api/metadata/search?query=Inception').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThan(0);
    const inception = res.body.results.find((r: { title: string }) => r.title === 'Inception');
    expect(inception).toBeTruthy();
    expect(inception.posterUrl).toBeTruthy();
  });

  it('returns empty results for a blank query', async () => {
    const { token } = await signupUser();
    const res = await request(app).get('/api/metadata/search?query=').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
  });

  it('requires auth', async () => {
    const res = await request(app).get('/api/metadata/search?query=Inception');
    expect(res.status).toBe(401);
  });

  it('returns empty results when a provider is unavailable', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    const { token } = await signupUser();
    const res = await request(app).get('/api/metadata/search?query=Inception').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
  });

  it('returns empty results when a provider call throws', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const { token } = await signupUser();
    const res = await request(app).get('/api/metadata/search?query=Inception').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
  });

  it('dedupes TMDB and OMDb results by title and year', async () => {
    mockProviders();
    const { token } = await signupUser();
    const res = await request(app).get('/api/metadata/search?query=Inception').set(auth(token));
    const inception = res.body.results.filter((r: { title: string }) => r.title === 'Inception');
    expect(inception.length).toBe(1);
  });
});

describe('metadata fetch for stored movies', () => {
  beforeEach(() => fetchMock.mockReset());
  afterEach(() => {
    fetchMock.mockReset();
    clearMetadataCache();
  });

  it('fetches metadata for a title-only movie', async () => {
    mockProviders();
    const { token } = await signupUser();
    const add = await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'Inception' });
    const id = add.body.movie.id;
    const res = await request(app).post(`/api/movies/${id}/metadata`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.movie.posterUrl).toBeTruthy();
    expect(res.body.movie.metadataProvider).toBe('TMDB');
  });

  it('bulk-fetches metadata for several movies', async () => {
    mockProviders();
    const { token } = await signupUser();
    const a = await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'Inception' });
    const b = await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'Interstellar' });
    const res = await request(app).post('/api/import/metadata').set(auth(token)).send({ ids: [a.body.movie.id, b.body.movie.id] });
    expect(res.status).toBe(200);
    expect(res.body.movies.length).toBe(2);
  });

  it('returns 404 when no metadata exists for a title', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });
    const { token } = await signupUser();
    const add = await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'Zzz No Such Film' });
    const res = await request(app).post(`/api/movies/${add.body.movie.id}/metadata`).set(auth(token));
    expect(res.status).toBe(404);
  });
});

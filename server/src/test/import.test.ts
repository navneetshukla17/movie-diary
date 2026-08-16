import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app, auth, signupUser } from './helpers.js';

vi.mock('../services/import.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/import.service.js')>();
  return {
    ...actual,
    parsePdfFile: vi.fn(async () => ({ titles: ['From PDF'], skippedLines: [] })),
    parseImageFile: vi.fn(async () => ({ titles: ['From Image'], skippedLines: [] })),
  };
});

describe('import', () => {
  it('imports titles from a text file into the current list', async () => {
    const { token } = await signupUser();
    const res = await request(app)
      .post('/api/lists/ALONE/import')
      .set(auth(token))
      .attach('file', Buffer.from('1. Inception\n2. Interstellar\n3. The Dark Knight'), 'movies.txt');
    expect(res.status).toBe(201);
    expect(res.body.movies.map((m: { title: string }) => m.title)).toEqual([
      'Inception',
      'Interstellar',
      'The Dark Knight',
    ]);
    expect(res.body.movies.every((m: { imported: boolean }) => m.imported)).toBe(true);
  });

  it('skips duplicates already in the list', async () => {
    const { token } = await signupUser();
    await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'Inception' });
    const res = await request(app)
      .post('/api/lists/ALONE/import')
      .set(auth(token))
      .attach('file', Buffer.from('Inception\nTenet'), 'movies.txt');
    expect(res.body.movies.map((m: { title: string }) => m.title)).toEqual(['Tenet']);
  });

  it('imports PDF titles via the pdf parser', async () => {
    const { token } = await signupUser();
    const res = await request(app)
      .post('/api/lists/US/import')
      .set(auth(token))
      .attach('file', Buffer.from('%PDF-1.4 fake'), 'movies.pdf');
    expect(res.status).toBe(201);
    expect(res.body.movies[0].title).toBe('From PDF');
  });

  it('imports image titles via OCR', async () => {
    const { token } = await signupUser();
    const res = await request(app)
      .post('/api/lists/ALONE/import')
      .set(auth(token))
      .attach('file', Buffer.from('fake-image-bytes'), 'movies.png');
    expect(res.status).toBe(201);
    expect(res.body.movies[0].title).toBe('From Image');
  });

  it('returns 422 when no titles are found', async () => {
    const { token } = await signupUser();
    const res = await request(app)
      .post('/api/lists/ALONE/import')
      .set(auth(token))
      .attach('file', Buffer.from('1234'), 'movies.txt');
    expect(res.status).toBe(422);
  });

  it('rejects an unsupported file type', async () => {
    const { token } = await signupUser();
    const res = await request(app)
      .post('/api/lists/ALONE/import')
      .set(auth(token))
      .attach('file', Buffer.from('x'), 'movies.exe');
    expect(res.status).toBe(400);
  });
});

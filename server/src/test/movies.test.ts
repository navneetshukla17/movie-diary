import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, auth, signupUser } from './helpers.js';

describe('lists & movies', () => {
  it('adds a movie with metadata and lists it', async () => {
    const { token } = await signupUser();
    const add = await request(app)
      .post('/api/lists/ALONE/movies')
      .set(auth(token))
      .send({
        title: 'Inception',
        watchedDate: '2026-01-01',
        personalRating: 9,
        watchStatus: 'FINISHED',
        metadata: {
          posterUrl: 'http://x/p.jpg',
          releaseDate: '2010-07-16',
          providerRatings: { tmdb: 8.4 },
          provider: 'TMDB',
        },
      });
    expect(add.status).toBe(201);
    expect(add.body.movie.title).toBe('Inception');
    expect(add.body.movie.posterUrl).toBe('http://x/p.jpg');

    const list = await request(app).get('/api/lists/ALONE/movies').set(auth(token));
    expect(list.status).toBe(200);
    expect(list.body.movies).toHaveLength(1);
  });

  it('blocks duplicate titles in the same list', async () => {
    const { token } = await signupUser();
    await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'Inception' });
    const dup = await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'Inception' });
    expect(dup.status).toBe(409);
  });

  it('allows the same movie in both lists', async () => {
    const { token } = await signupUser();
    await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'Inception' });
    const us = await request(app).post('/api/lists/US/movies').set(auth(token)).send({ title: 'Inception' });
    expect(us.status).toBe(201);
  });

  it('rejects an out-of-range rating', async () => {
    const { token } = await signupUser();
    const res = await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'X', personalRating: 11 });
    expect(res.status).toBe(400);
  });

  it('rejects a missing title', async () => {
    const { token } = await signupUser();
    const res = await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: '   ' });
    expect(res.status).toBe(400);
  });

  it('edits and deletes a movie', async () => {
    const { token } = await signupUser();
    const add = await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'Inception' });
    const id = add.body.movie.id;
    const patch = await request(app)
      .patch(`/api/lists/ALONE/movies/${id}`)
      .set(auth(token))
      .send({ personalRating: 8, watchStatus: 'WATCHING', title: 'Inception 2' });
    expect(patch.status).toBe(200);
    expect(patch.body.movie.personalRating).toBe(8);
    expect(patch.body.movie.title).toBe('Inception 2');
    const del = await request(app).delete(`/api/lists/ALONE/movies/${id}`).set(auth(token));
    expect(del.status).toBe(200);
  });

  it('returns 404 for a movie in the wrong list', async () => {
    const { token } = await signupUser();
    const add = await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'Inception' });
    const res = await request(app).patch(`/api/lists/US/movies/${add.body.movie.id}`).set(auth(token)).send({ personalRating: 5 });
    expect(res.status).toBe(404);
  });
});

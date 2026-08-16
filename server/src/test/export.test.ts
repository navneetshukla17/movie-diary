import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, auth, signupUser } from './helpers.js';

describe('pdf export', () => {
  it('returns a themed PDF for the current list', async () => {
    const { token } = await signupUser();
    await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'Inception', personalRating: 9 });
    const res = await request(app).get('/api/lists/ALONE/export/pdf').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.body.length).toBeGreaterThan(500);
  });

  it('requires auth', async () => {
    const res = await request(app).get('/api/lists/ALONE/export/pdf');
    expect(res.status).toBe(401);
  });
});

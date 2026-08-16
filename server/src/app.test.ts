import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from './test/helpers.js';

describe('app', () => {
  it('returns ok from /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns a JSON 404 for unknown api routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: 'Not found' } });
  });
});

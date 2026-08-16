import { describe, expect, it } from 'vitest';
import request from 'supertest';
import zlib from 'node:zlib';
import { app, auth, signupUser } from './helpers.js';

const isPdf = (buf: Buffer) => buf.subarray(0, 4).toString() === '%PDF';

const pdfPageCount = (buf: Buffer) => (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;

function pdfText(buf: Buffer): string {
  const raw = buf.toString('latin1');
  let text = '';
  const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    try {
      const content = zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('utf8');
      text += content.replace(/<([0-9A-Fa-f\s]+)>/g, (_, hex: string) =>
        Buffer.from(hex.replace(/\s+/g, ''), 'hex').toString('utf8'),
      );
    } catch {
      /* not a flate stream */
    }
  }
  return text;
}

describe('pdf export', () => {
  it('returns a themed PDF for the current list', async () => {
    const { token } = await signupUser();
    await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: 'Inception', personalRating: 9 });
    const res = await request(app).get('/api/lists/ALONE/export/pdf').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(isPdf(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(500);
  });

  it('returns a valid PDF for an empty list', async () => {
    const { token } = await signupUser();
    const res = await request(app).get('/api/lists/US/export/pdf').set(auth(token));
    expect(res.status).toBe(200);
    expect(isPdf(res.body)).toBe(true);
  });

  it('paginates when there are many movies', async () => {
    const { token } = await signupUser();
    for (let i = 0; i < 15; i++) {
      await request(app).post('/api/lists/ALONE/movies').set(auth(token)).send({ title: `Movie ${i}` });
    }
    const res = await request(app).get('/api/lists/ALONE/export/pdf').set(auth(token));
    expect(res.status).toBe(200);
    expect(isPdf(res.body)).toBe(true);
    expect(pdfPageCount(res.body)).toBeGreaterThanOrEqual(2);
  });

  it('ignores unsafe poster urls', async () => {
    const { token } = await signupUser();
    await request(app)
      .post('/api/lists/ALONE/movies')
      .set(auth(token))
      .send({ title: 'Inception', metadata: { posterUrl: 'http://localhost:5432/secret' } });
    const res = await request(app).get('/api/lists/ALONE/export/pdf').set(auth(token));
    expect(res.status).toBe(200);
    expect(isPdf(res.body)).toBe(true);
  });

  it('renders the year from an OMDb-style release date', async () => {
    const { token } = await signupUser();
    await request(app)
      .post('/api/lists/ALONE/movies')
      .set(auth(token))
      .send({ title: 'Inception', metadata: { releaseDate: '16 Jul 2010' } });
    const res = await request(app).get('/api/lists/ALONE/export/pdf').set(auth(token));
    expect(res.status).toBe(200);
    const text = pdfText(res.body);
    expect(text).toContain('2010');
    expect(text).not.toContain('16 J');
  });

  it('requires auth', async () => {
    const res = await request(app).get('/api/lists/ALONE/export/pdf');
    expect(res.status).toBe(401);
  });
});

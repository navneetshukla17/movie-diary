import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, auth, signupUser } from './helpers.js';

describe('auth', () => {
  it('signs up a new user and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'newuser@test.com', password: 'password123', defaultMode: 'US' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('newuser@test.com');
    expect(res.body.user.defaultMode).toBe('US');
  });

  it('rejects a duplicate email', async () => {
    const { email } = await signupUser();
    const res = await request(app).post('/api/auth/signup').send({ email, password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('logs in with valid credentials', async () => {
    const { email } = await signupUser();
    const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('rejects a wrong password', async () => {
    const { email } = await signupUser();
    const res = await request(app).post('/api/auth/login').send({ email, password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('returns the current user via /me', async () => {
    const { token } = await signupUser();
    const res = await request(app).get('/api/auth/me').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBeTruthy();
  });

  it('rejects /me without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a forged token on /me', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('rejects login for an unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@test.com', password: 'password123' });
    expect(res.status).toBe(401);
  });

  it('rejects signup without a password', async () => {
    const res = await request(app).post('/api/auth/signup').send({ email: 'nopw@test.com' });
    expect(res.status).toBe(400);
  });

  it('rejects signup with an invalid defaultMode', async () => {
    const res = await request(app).post('/api/auth/signup').send({ email: 'badmode@test.com', password: 'password123', defaultMode: 'EU' });
    expect(res.status).toBe(400);
  });

  it('rejects a password longer than 72 bytes', async () => {
    const res = await request(app).post('/api/auth/signup').send({ email: 'longpw@test.com', password: 'x'.repeat(73) });
    expect(res.status).toBe(400);
  });

  it('updates the default mode', async () => {
    const { token } = await signupUser();
    const res = await request(app).patch('/api/auth/me').set(auth(token)).send({ defaultMode: 'US' });
    expect(res.status).toBe(200);
    expect(res.body.user.defaultMode).toBe('US');
  });
});

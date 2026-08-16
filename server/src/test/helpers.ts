import request from 'supertest';
import { createApp } from '../app.js';

export const app = createApp();

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function signupUser(email = `user${Date.now()}@test.com`) {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ email, password: 'password123', defaultMode: 'ALONE' });
  return { token: res.body.token as string, user: res.body.user, email };
}

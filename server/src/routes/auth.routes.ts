import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const MODES = ['ALONE', 'US'] as const;

function toUserJson(user: { id: string; email: string; defaultMode: string }) {
  return { id: user.id, email: user.email, defaultMode: user.defaultMode };
}

router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const { email, password, defaultMode } = req.body ?? {};
    if (typeof email !== 'string' || !email.includes('@')) throw new HttpError(400, 'A valid email is required');
    if (typeof password !== 'string' || password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
    if (Buffer.byteLength(password, 'utf8') > 72) throw new HttpError(400, 'Password must be at most 72 characters');
    if (defaultMode !== undefined && !MODES.includes(defaultMode)) throw new HttpError(400, 'defaultMode must be ALONE or US');
    const mode = defaultMode ?? 'ALONE';
    const cleanEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) throw new HttpError(409, 'An account with this email already exists');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { email: cleanEmail, passwordHash, defaultMode: mode } });
      await tx.list.create({ data: { userId: created.id, mode: 'ALONE' } });
      await tx.list.create({ data: { userId: created.id, mode: 'US' } });
      return created;
    });
    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '30d' });
    res.status(201).json({ token, user: toUserJson(user) });
  }),
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') throw new HttpError(400, 'Email and password are required');
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, 'Invalid email or password');
    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '30d' });
    res.status(200).json({ token, user: toUserJson(user) });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: toUserJson(req.user!) });
  }),
);

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { defaultMode } = req.body ?? {};
    if (!MODES.includes(defaultMode)) throw new HttpError(400, 'defaultMode must be ALONE or US');
    const user = await prisma.user.update({ where: { id: req.user!.id }, data: { defaultMode } });
    res.json({ user: toUserJson(user) });
  }),
);

export default router;

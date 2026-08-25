import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const MODES = ['ALONE', 'PARTNER', 'US'] as const;

function toUserJson(user: { id: string; email: string; defaultMode: string; person1Name?: string; person2Name?: string }) {
  return {
    id: user.id,
    email: user.email,
    defaultMode: user.defaultMode,
    person1Name: user.person1Name ?? 'Me',
    person2Name: user.person2Name ?? 'Partner',
  };
}

router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const { email, password, defaultMode, person1Name, person2Name } = req.body ?? {};
    if (typeof email !== 'string' || !email.includes('@')) throw new HttpError(400, 'A valid email is required');
    if (typeof password !== 'string' || password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
    if (Buffer.byteLength(password, 'utf8') > 72) throw new HttpError(400, 'Password must be at most 72 characters');
    if (defaultMode !== undefined && !MODES.includes(defaultMode)) throw new HttpError(400, 'defaultMode must be ALONE, PARTNER, or US');
    const mode = defaultMode ?? 'ALONE';
    const cleanEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) throw new HttpError(409, 'An account with this email already exists');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        defaultMode: mode,
        person1Name: typeof person1Name === 'string' && person1Name.trim() ? person1Name.trim() : 'Me',
        person2Name: typeof person2Name === 'string' && person2Name.trim() ? person2Name.trim() : 'Partner',
        lists: {
          create: [
            { mode: 'ALONE' },
            { mode: 'PARTNER' },
            { mode: 'US' },
          ],
        },
      },
    });
    const token = jwt.sign(
      { userId: user.id, email: user.email, defaultMode: user.defaultMode, person1Name: user.person1Name, person2Name: user.person2Name },
      config.jwtSecret,
      { expiresIn: '30d' }
    );
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
    const token = jwt.sign(
      { userId: user.id, email: user.email, defaultMode: user.defaultMode, person1Name: user.person1Name, person2Name: user.person2Name },
      config.jwtSecret,
      { expiresIn: '30d' }
    );
    res.status(200).json({ token, user: toUserJson(user) });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new HttpError(404, 'User not found');
    res.json({ user: toUserJson(user) });
  }),
);

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { defaultMode, person1Name, person2Name } = req.body ?? {};
    const data: { defaultMode?: 'ALONE' | 'PARTNER' | 'US'; person1Name?: string; person2Name?: string } = {};
    if (defaultMode !== undefined) {
      if (!MODES.includes(defaultMode)) throw new HttpError(400, 'defaultMode must be ALONE, PARTNER, or US');
      data.defaultMode = defaultMode;
    }
    if (person1Name !== undefined) {
      if (typeof person1Name !== 'string' || !person1Name.trim()) throw new HttpError(400, 'Person 1 name cannot be empty');
      data.person1Name = person1Name.trim();
    }
    if (person2Name !== undefined) {
      if (typeof person2Name !== 'string' || !person2Name.trim()) throw new HttpError(400, 'Person 2 name cannot be empty');
      data.person2Name = person2Name.trim();
    }
    const user = await prisma.user.update({ where: { id: req.user!.id }, data });
    const token = jwt.sign(
      { userId: user.id, email: user.email, defaultMode: user.defaultMode, person1Name: user.person1Name, person2Name: user.person2Name },
      config.jwtSecret,
      { expiresIn: '30d' }
    );
    res.json({ token, user: toUserJson(user) });
  }),
);

router.patch(
  '/password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body ?? {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      throw new HttpError(400, 'Current and new password are required');
    }
    if (newPassword.length < 8) {
      throw new HttpError(400, 'New password must be at least 8 characters');
    }
    if (Buffer.byteLength(newPassword, 'utf8') > 72) {
      throw new HttpError(400, 'New password must be at most 72 characters');
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new HttpError(401, 'Invalid current password');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    res.json({ success: true });
  }),
);

router.delete(
  '/account',
  requireAuth,
  asyncHandler(async (req, res) => {
    // Delete the user. Cascading deletes will handle lists and movies.
    await prisma.user.delete({ where: { id: req.user!.id } });
    res.json({ success: true });
  }),
);

export default router;

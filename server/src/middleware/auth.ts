import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from '../utils/http.js';
import { prisma } from '../db.js';

export interface AuthUser {
  id: string;
  email: string;
  defaultMode: 'ALONE' | 'US';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'Not authenticated');
    const token = header.slice(7);
    const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) throw new HttpError(401, 'Not authenticated');
    req.user = { id: user.id, email: user.email, defaultMode: user.defaultMode };
    next();
  } catch (err) {
    if (err instanceof HttpError) next(err);
    else next(new HttpError(401, 'Invalid or expired token'));
  }
};

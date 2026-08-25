import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from '../utils/http.js';
import { prisma } from '../db.js';

export interface AuthUser {
  id: string;
  email: string;
  defaultMode: 'ALONE' | 'PARTNER' | 'US';
  person1Name: string;
  person2Name: string;
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
    const payload = jwt.verify(token, config.jwtSecret) as {
      userId: string;
      email?: string;
      defaultMode?: string;
      person1Name?: string;
      person2Name?: string;
    };

    if (payload.email && payload.defaultMode && payload.person1Name && payload.person2Name) {
      req.user = {
        id: payload.userId,
        email: payload.email,
        defaultMode: payload.defaultMode as 'ALONE' | 'PARTNER' | 'US',
        person1Name: payload.person1Name,
        person2Name: payload.person2Name,
      };
      return next();
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) throw new HttpError(401, 'Not authenticated');
    req.user = {
      id: user.id,
      email: user.email,
      defaultMode: user.defaultMode,
      person1Name: user.person1Name,
      person2Name: user.person2Name,
    };
    next();
  } catch (err) {
    if (err instanceof HttpError) next(err);
    else next(new HttpError(401, 'Invalid or expired token'));
  }
};

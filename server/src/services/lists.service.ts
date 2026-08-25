import { prisma } from '../db.js';
import { HttpError } from '../utils/http.js';

export const MODES = ['ALONE', 'PARTNER', 'US'] as const;
export type Mode = (typeof MODES)[number];

export function parseMode(mode: string): Mode {
  if (!MODES.includes(mode as Mode)) throw new HttpError(400, 'mode must be ALONE, PARTNER, or US');
  return mode as Mode;
}

export async function getUserList(userId: string, mode: Mode) {
  return await prisma.list.upsert({
    where: { userId_mode: { userId, mode } },
    update: {},
    create: { userId, mode },
  });
}

export function parseDate(value: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, 'Invalid date');
  return d;
}

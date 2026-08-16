import { prisma } from '../db.js';
import { HttpError } from '../utils/http.js';

export const MODES = ['ALONE', 'US'] as const;
export type Mode = (typeof MODES)[number];

export function parseMode(mode: string): Mode {
  if (!MODES.includes(mode as Mode)) throw new HttpError(400, 'mode must be ALONE or US');
  return mode as Mode;
}

export async function getUserList(userId: string, mode: Mode) {
  const list = await prisma.list.findUnique({ where: { userId_mode: { userId, mode } } });
  if (!list) throw new HttpError(404, 'List not found');
  return list;
}

import { beforeEach } from 'vitest';
import { prisma } from '../db.js';

beforeEach(async () => {
  await prisma.movie.deleteMany();
  await prisma.list.deleteMany();
  await prisma.user.deleteMany();
});

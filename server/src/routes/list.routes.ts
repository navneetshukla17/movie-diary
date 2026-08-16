import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { toMovieJson } from '../utils/serializers.js';
import { getUserList, parseMode } from '../services/lists.service.js';

const router = Router();
const STATUSES = ['PLANNED', 'WATCHING', 'FINISHED'] as const;

router.get(
  '/lists/:mode/movies',
  requireAuth,
  asyncHandler(async (req, res) => {
    const mode = parseMode(req.params.mode!);
    const list = await getUserList(req.user!.id, mode);
    const movies = await prisma.movie.findMany({ where: { listId: list.id }, orderBy: { createdAt: 'desc' } });
    res.json({ movies: movies.map(toMovieJson) });
  }),
);

router.post(
  '/lists/:mode/movies',
  requireAuth,
  asyncHandler(async (req, res) => {
    const mode = parseMode(req.params.mode!);
    const list = await getUserList(req.user!.id, mode);
    const { title, watchedDate, personalRating, watchStatus, metadata } = req.body ?? {};
    if (typeof title !== 'string' || !title.trim()) throw new HttpError(400, 'Title is required');
    const cleanTitle = title.trim();
    const existing = await prisma.movie.findUnique({
      where: { listId_title: { listId: list.id, title: cleanTitle } },
    });
    if (existing) throw new HttpError(409, `"${cleanTitle}" is already in your ${mode === 'ALONE' ? 'Alone' : 'US'} list`);
    if (personalRating != null && (typeof personalRating !== 'number' || personalRating < 1 || personalRating > 10)) {
      throw new HttpError(400, 'personalRating must be between 1 and 10');
    }
    if (watchedDate != null && typeof watchedDate !== 'string') throw new HttpError(400, 'watchedDate must be a date string');
    const status = STATUSES.includes(watchStatus) ? watchStatus : 'PLANNED';
    const movie = await prisma.movie.create({
      data: {
        listId: list.id,
        title: cleanTitle,
        watchedDate: watchedDate ? new Date(watchedDate) : null,
        personalRating: personalRating ?? null,
        watchStatus: status,
        posterUrl: metadata?.posterUrl ?? null,
        releaseDate: metadata?.releaseDate ?? null,
        providerRatings: metadata?.providerRatings ?? undefined,
        metadataProvider: metadata?.provider ?? null,
        imported: false,
      },
    });
    res.status(201).json({ movie: toMovieJson(movie) });
  }),
);

router.patch(
  '/lists/:mode/movies/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const mode = parseMode(req.params.mode!);
    const list = await getUserList(req.user!.id, mode);
    const movie = await prisma.movie.findFirst({ where: { id: req.params.id, listId: list.id } });
    if (!movie) throw new HttpError(404, 'Movie not found');
    const { title, watchedDate, personalRating, watchStatus } = req.body ?? {};
    const data: Record<string, unknown> = {};
    if (typeof title === 'string' && title.trim()) {
      const cleanTitle = title.trim();
      if (cleanTitle !== movie.title) {
        const dup = await prisma.movie.findUnique({
          where: { listId_title: { listId: list.id, title: cleanTitle } },
        });
        if (dup) throw new HttpError(409, `"${cleanTitle}" is already in this list`);
      }
      data.title = cleanTitle;
    }
    if (watchedDate !== undefined) data.watchedDate = watchedDate === null ? null : new Date(watchedDate);
    if (personalRating !== undefined) {
      if (personalRating !== null && (typeof personalRating !== 'number' || personalRating < 1 || personalRating > 10)) {
        throw new HttpError(400, 'personalRating must be between 1 and 10 or null');
      }
      data.personalRating = personalRating;
    }
    if (watchStatus !== undefined) {
      if (!STATUSES.includes(watchStatus)) throw new HttpError(400, 'Invalid watch status');
      data.watchStatus = watchStatus;
    }
    const updated = await prisma.movie.update({ where: { id: movie.id }, data });
    res.json({ movie: toMovieJson(updated) });
  }),
);

router.delete(
  '/lists/:mode/movies/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const mode = parseMode(req.params.mode!);
    const list = await getUserList(req.user!.id, mode);
    const movie = await prisma.movie.findFirst({ where: { id: req.params.id, listId: list.id } });
    if (!movie) throw new HttpError(404, 'Movie not found');
    await prisma.movie.delete({ where: { id: movie.id } });
    res.json({ success: true });
  }),
);

export default router;

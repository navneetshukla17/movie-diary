import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { toMovieJson } from '../utils/serializers.js';
import { getUserList, parseDate, parseMode } from '../services/lists.service.js';

const router = Router();
const STATUSES = ['PLANNED', 'WATCHING', 'FINISHED'] as const;
const PROVIDERS = ['TMDB', 'OMDB', 'IMPORT', 'MANUAL'] as const;

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
    const { title, watchedDate, personalRating, watchStatus, metadata, review, plannedDate,
            mediaType, seasonNumber, episodeProgress, showTitle, showPosterUrl, tmdbId } = req.body ?? {};
    if (typeof title !== 'string' || !title.trim()) throw new HttpError(400, 'Title is required');
    const cleanTitle = title.trim();
    const existing = await prisma.movie.findUnique({
      where: { listId_title: { listId: list.id, title: cleanTitle } },
    });
    if (existing) throw new HttpError(409, `"${cleanTitle}" is already in this list`);
    if (personalRating != null && (typeof personalRating !== 'number' || personalRating < 1 || personalRating > 10)) {
      throw new HttpError(400, 'personalRating must be between 1 and 10');
    }
    if (watchedDate != null && typeof watchedDate !== 'string') throw new HttpError(400, 'watchedDate must be a date string');
    if (watchStatus !== undefined && !STATUSES.includes(watchStatus)) throw new HttpError(400, 'Invalid watch status');
    const status = watchStatus ?? 'PLANNED';
    if (metadata?.provider != null && !PROVIDERS.includes(metadata.provider)) throw new HttpError(400, 'Invalid metadata provider');
    if (metadata?.providerRatings != null && (typeof metadata.providerRatings !== 'object' || metadata.providerRatings === null || Array.isArray(metadata.providerRatings))) {
      throw new HttpError(400, 'providerRatings must be an object');
    }
    if (review !== undefined && review !== null && typeof review !== 'string') throw new HttpError(400, 'review must be a string');
    if (plannedDate != null && typeof plannedDate !== 'string') throw new HttpError(400, 'plannedDate must be a date string');
    const movie = await prisma.movie.create({
      data: {
        listId: list.id,
        title: cleanTitle,
        watchedDate: watchedDate ? parseDate(watchedDate) : null,
        personalRating: personalRating ?? null,
        watchStatus: status,
        posterUrl: metadata?.posterUrl ?? null,
        releaseDate: metadata?.releaseDate ?? null,
        providerRatings: metadata?.providerRatings ?? undefined,
        metadataProvider: metadata?.provider ?? null,
        review: review ?? null,
        plannedDate: plannedDate ? parseDate(plannedDate) : null,
        imported: false,
        mediaType: typeof mediaType === 'string' ? mediaType : null,
        seasonNumber: typeof seasonNumber === 'number' ? seasonNumber : null,
        episodeProgress: typeof episodeProgress === 'string' ? episodeProgress : null,
        showTitle: typeof showTitle === 'string' ? showTitle : null,
        showPosterUrl: typeof showPosterUrl === 'string' ? showPosterUrl : null,
        tmdbId: typeof tmdbId === 'string' ? tmdbId : null,
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
    const { title, watchedDate, personalRating, watchStatus, review, plannedDate, metadata,
            episodeProgress } = req.body ?? {};
    const data: Prisma.MovieUncheckedUpdateInput = {};
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) throw new HttpError(400, 'Title cannot be empty');
      const cleanTitle = title.trim();
      if (cleanTitle !== movie.title) {
        const dup = await prisma.movie.findUnique({
          where: { listId_title: { listId: list.id, title: cleanTitle } },
        });
        if (dup) throw new HttpError(409, `"${cleanTitle}" is already in this list`);
      }
      data.title = cleanTitle;
    }
    if (watchedDate !== undefined) data.watchedDate = watchedDate === null ? null : parseDate(watchedDate);
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
    if (review !== undefined) {
      if (review !== null && typeof review !== 'string') throw new HttpError(400, 'review must be a string');
      data.review = review;
    }
    if (plannedDate !== undefined) data.plannedDate = plannedDate === null ? null : parseDate(plannedDate);
    if (episodeProgress !== undefined) {
      data.episodeProgress = episodeProgress === null ? null : String(episodeProgress);
    }
    if (metadata) {
      if (metadata.provider != null && !PROVIDERS.includes(metadata.provider)) throw new HttpError(400, 'Invalid metadata provider');
      if (metadata.providerRatings != null && (typeof metadata.providerRatings !== 'object' || metadata.providerRatings === null || Array.isArray(metadata.providerRatings))) {
        throw new HttpError(400, 'providerRatings must be an object');
      }
      data.posterUrl = metadata.posterUrl ?? null;
      data.releaseDate = metadata.releaseDate ?? null;
      data.providerRatings = metadata.providerRatings ?? undefined;
      data.metadataProvider = metadata.provider ?? null;
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

router.post(
  '/lists/:mode/movies/delete-many',
  requireAuth,
  asyncHandler(async (req, res) => {
    const mode = parseMode(req.params.mode!);
    const list = await getUserList(req.user!.id, mode);
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new HttpError(400, 'ids array is required');
    }
    await prisma.movie.deleteMany({
      where: {
        id: { in: ids },
        listId: list.id,
      },
    });
    res.json({ success: true, count: ids.length });
  }),
);

export default router;

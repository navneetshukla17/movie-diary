import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { toMovieJson } from '../utils/serializers.js';
import { fetchMetadataForTitle, searchMetadata } from '../services/metadata.service.js';

const router = Router();

router.get(
  '/metadata/search',
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = typeof req.query.query === 'string' ? req.query.query : '';
    const results = await searchMetadata(query);
    res.json({ results });
  }),
);

router.post(
  '/movies/:id/metadata',
  requireAuth,
  asyncHandler(async (req, res) => {
    const movie = await prisma.movie.findUnique({ where: { id: req.params.id } });
    if (!movie) throw new HttpError(404, 'Movie not found');
    const owned = await prisma.list.findFirst({ where: { id: movie.listId, userId: req.user!.id } });
    if (!owned) throw new HttpError(404, 'Movie not found');
    const meta = await fetchMetadataForTitle(movie.title);
    if (!meta) throw new HttpError(404, `No metadata found for "${movie.title}"`);
    const updated = await prisma.movie.update({
      where: { id: movie.id },
      data: {
        posterUrl: meta.posterUrl,
        releaseDate: meta.releaseDate,
        providerRatings: meta.providerRatings as Prisma.InputJsonValue,
        metadataProvider: meta.provider,
      },
    });
    res.json({ movie: toMovieJson(updated) });
  }),
);

router.post(
  '/import/metadata',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { ids } = req.body ?? {};
    if (!Array.isArray(ids) || ids.length === 0) throw new HttpError(400, 'ids must be a non-empty array');
    if (ids.length > 100) throw new HttpError(400, 'ids must be at most 100');
    const owned = await prisma.list.findMany({ where: { userId: req.user!.id }, select: { id: true } });
    const ownedIds = new Set(owned.map((l) => l.id));
    const movies = await prisma.movie.findMany({ where: { id: { in: ids } } });
    const updated = [];
    for (const movie of movies.filter((m) => ownedIds.has(m.listId))) {
      const meta = await fetchMetadataForTitle(movie.title);
      if (!meta) continue;
      updated.push(
        await prisma.movie.update({
          where: { id: movie.id },
          data: {
            posterUrl: meta.posterUrl,
            releaseDate: meta.releaseDate,
            providerRatings: meta.providerRatings as Prisma.InputJsonValue,
            metadataProvider: meta.provider,
          },
        }),
      );
    }
    res.json({ movies: updated.map(toMovieJson) });
  }),
);

export default router;

import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { toMovieJson } from '../utils/serializers.js';
import { fetchMetadataForTitle, searchMetadata } from '../services/metadata.service.js';
import { config } from '../config.js';

const router = Router();

// GET /api/metadata/tv-seasons?tmdbId=1234
// Fetches season list for a TV show from TMDB
router.get(
  '/metadata/tv-seasons',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tmdbId = typeof req.query.tmdbId === 'string' ? req.query.tmdbId.trim() : '';
    if (!tmdbId) throw new HttpError(400, 'tmdbId query param is required');

    if (!config.tmdbApiKey) {
      // Fallback: return generic season list up to 20 seasons
      const seasons = Array.from({ length: 10 }, (_, i) => ({
        seasonNumber: i + 1,
        name: `Season ${i + 1}`,
        episodeCount: null,
        airDate: null,
        posterUrl: null,
      }));
      return res.json({ seasons });
    }

    const url = new URL(`https://api.themoviedb.org/3/tv/${tmdbId}`);
    url.searchParams.set('api_key', config.tmdbApiKey);
    url.searchParams.set('language', 'en-US');

    const response = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      // Graceful fallback on TMDB error
      const seasons = Array.from({ length: 5 }, (_, i) => ({
        seasonNumber: i + 1,
        name: `Season ${i + 1}`,
        episodeCount: null,
        airDate: null,
        posterUrl: null,
      }));
      return res.json({ seasons });
    }

    const data = (await response.json()) as {
      seasons?: Array<{
        season_number: number;
        name: string;
        episode_count: number;
        air_date: string | null;
        poster_path: string | null;
      }>;
    };

    const seasons = (data.seasons ?? [])
      .filter((s) => s.season_number > 0) // exclude "Specials" (season 0)
      .map((s) => ({
        seasonNumber: s.season_number,
        name: s.name || `Season ${s.season_number}`,
        episodeCount: s.episode_count ?? null,
        airDate: s.air_date ?? null,
        posterUrl: s.poster_path ? `https://image.tmdb.org/t/p/w300${s.poster_path}` : null,
      }));

    res.json({ seasons });
  }),
);


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

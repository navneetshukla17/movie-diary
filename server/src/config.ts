import 'dotenv/config';

const port = Number(process.env.PORT ?? 4000);
if (!Number.isFinite(port)) throw new Error('PORT must be a number');

export const config = {
  port: Number.isFinite(port) ? port : 4000,
  jwtSecret: process.env.JWT_SECRET || 'movie-diary-production-secret-2026',
  tmdbApiKey: process.env.TMDB_API_KEY ?? '',
  omdbApiKey: process.env.OMDB_API_KEY ?? '',
};

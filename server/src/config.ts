import 'dotenv/config';

const port = Number(process.env.PORT ?? 4000);
if (!Number.isFinite(port)) throw new Error('PORT must be a number');

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production');
}

export const config = {
  port,
  jwtSecret: jwtSecret ?? 'dev-secret-change-me',
  tmdbApiKey: process.env.TMDB_API_KEY ?? '',
  omdbApiKey: process.env.OMDB_API_KEY ?? '',
};

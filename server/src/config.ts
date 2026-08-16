import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  tmdbApiKey: process.env.TMDB_API_KEY ?? '',
  omdbApiKey: process.env.OMDB_API_KEY ?? '',
};

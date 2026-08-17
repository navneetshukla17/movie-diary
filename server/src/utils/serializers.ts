import type { Movie } from '@prisma/client';

export function toMovieJson(m: Movie) {
  return {
    id: m.id,
    title: m.title,
    watchedDate: m.watchedDate,
    plannedDate: m.plannedDate,
    personalRating: m.personalRating,
    review: m.review,
    watchStatus: m.watchStatus,
    posterUrl: m.posterUrl,
    releaseDate: m.releaseDate,
    providerRatings: m.providerRatings,
    metadataProvider: m.metadataProvider,
    imported: m.imported,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

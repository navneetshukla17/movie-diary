import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { api, type Movie } from '../api/client';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      updateMovie: vi.fn(),
      deleteMovie: vi.fn(),
      fetchMetadata: vi.fn(),
    },
  };
});

import { MovieCard } from './MovieCard';

const movie: Movie = {
  id: 'm1',
  title: 'Inception',
  watchedDate: '2024-01-15T00:00:00.000Z',
  plannedDate: null,
  personalRating: 8,
  review: null,
  watchStatus: 'WATCHING',
  posterUrl: 'https://example.com/inception.jpg',
  releaseDate: '2010-07-16T00:00:00.000Z',
  providerRatings: { tmdb: 8.4 },
  metadataProvider: 'TMDB',
  imported: false,
  mediaType: 'movie',
  seasonNumber: null,
  episodeProgress: null,
  showTitle: null,
  showPosterUrl: null,
  tmdbId: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
};

const updateMovie = vi.mocked(api.updateMovie);
const deleteMovie = vi.mocked(api.deleteMovie);

function renderCard(props: Partial<ComponentProps<typeof MovieCard>> = {}) {
  const onChanged = vi.fn();
  const onError = vi.fn();
  render(
    <MovieCard
      movie={movie}
      mode="ALONE"
      highlighted={false}
      onChanged={onChanged}
      onError={onError}
      {...props}
    />,
  );
  return { onChanged, onError };
}

describe('MovieCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the edit modal and saves changes', async () => {
    const { onChanged } = renderCard();

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByText('Edit Movie')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(updateMovie).toHaveBeenCalledWith('ALONE', movie.id, expect.objectContaining({
        title: 'Inception',
        watchStatus: 'WATCHING',
      }));
      expect(onChanged).toHaveBeenCalled();
    });
  });

  it('deletes the movie after confirming', async () => {
    const { onChanged } = renderCard();

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const confirm = screen.getByRole('button', { name: 'Sure?' });
    await userEvent.click(confirm);

    await waitFor(() => {
      expect(deleteMovie).toHaveBeenCalledWith('ALONE', movie.id);
      expect(onChanged).toHaveBeenCalledWith('Movie deleted!');
    });
  });

  it('reports save failures', async () => {
    updateMovie.mockRejectedValueOnce(new Error('Save failed'));
    const { onError } = renderCard();

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Save failed'));
  });
});

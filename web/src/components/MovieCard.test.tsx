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
  personalRating: 8,
  watchStatus: 'WATCHING',
  posterUrl: 'https://example.com/inception.jpg',
  releaseDate: '2010-07-16T00:00:00.000Z',
  providerRatings: { tmdb: 8.4 },
  metadataProvider: 'TMDB',
  imported: false,
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

  it('shows the edit form and saves changes with the movie mode', async () => {
    const { onChanged } = renderCard();

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const titleInput = screen.getByLabelText('Title');
    expect(titleInput).toBeInTheDocument();

    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Edited');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateMovie).toHaveBeenCalledWith('ALONE', movie.id, {
        title: 'Edited',
        watchedDate: '2024-01-15T00:00:00.000Z',
        personalRating: 8,
        watchStatus: 'WATCHING',
      });
      expect(onChanged).toHaveBeenCalled();
    });
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
  });

  it('deletes the movie after confirming and clears the busy state', async () => {
    const { onChanged } = renderCard();

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const confirm = screen.getByRole('button', { name: 'Confirm' });
    await userEvent.click(confirm);

    await waitFor(() => {
      expect(deleteMovie).toHaveBeenCalledWith('ALONE', movie.id);
      expect(onChanged).toHaveBeenCalled();
    });
    await waitFor(() => expect(confirm).not.toBeDisabled());
  });

  it('reports save failures and stays in edit mode', async () => {
    updateMovie.mockRejectedValueOnce(new Error('Save failed'));
    const { onError } = renderCard();

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Save failed'));
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
  });
});

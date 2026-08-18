import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const searchMetadataMock = vi.fn();
const addMovieMock = vi.fn();
vi.mock('../api/client', () => ({
  api: {
    searchMetadata: (...args: unknown[]) => searchMetadataMock(...args),
    addMovie: (...args: unknown[]) => addMovieMock(...args),
    getTvSeasons: vi.fn(),
  },
}));

import { AddMovieModal } from './AddMovieModal';

const suggestion = {
  id: 'tmdb-movie-1',
  title: 'Inception',
  year: '2010',
  mediaType: 'movie' as const,
  posterUrl: null,
  releaseDate: '2010-07-16',
  providerRatings: { tmdb: 8.4 },
  provider: 'TMDB' as const,
};

describe('AddMovieModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchMetadataMock.mockResolvedValue({ results: [suggestion] });
  });

  it('opens search overlay, selects a movie, and adds to list', async () => {
    addMovieMock.mockResolvedValue({ movie: {} });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AddMovieModal mode="ALONE" onClose={() => {}} onAdded={() => {}} onError={() => {}} />
      </QueryClientProvider>,
    );

    // Click to open search overlay
    await userEvent.click(screen.getByText(/tap to search movie/i));

    // Type query in search overlay
    const searchInput = screen.getByPlaceholderText(/search movies/i);
    await userEvent.type(searchInput, 'Inception');

    // Find and select the search card heading
    const cardTitle = await screen.findByRole('heading', { name: 'Inception', level: 3 });
    await userEvent.click(cardTitle);

    // After selection, search overlay closes and Add Movie button is enabled
    const addBtn = await screen.findByRole('button', { name: /add movie/i });
    await userEvent.click(addBtn);

    await waitFor(() => expect(addMovieMock).toHaveBeenCalled());
    expect(addMovieMock.mock.calls[0][0]).toBe('ALONE');
    expect(addMovieMock.mock.calls[0][1].title).toBe('Inception');
    expect(addMovieMock.mock.calls[0][1].metadata?.id).toBe('tmdb-movie-1');
  });

  it('disables the add button until a title is selected', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AddMovieModal mode="ALONE" onClose={() => {}} onAdded={() => {}} onError={() => {}} />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('button', { name: /add movie/i })).toBeDisabled();
  });
});

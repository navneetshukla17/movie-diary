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
  },
}));

import { AddMovieModal } from './AddMovieModal';

const suggestion = {
  id: 'tmdb-movie-1',
  title: 'Inception',
  year: '2010',
  mediaType: 'movie',
  posterUrl: null,
  releaseDate: '2010-07-16',
  providerRatings: { tmdb: 8.4 },
  provider: 'TMDB',
};

describe('AddMovieModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchMetadataMock.mockResolvedValue({ results: [suggestion] });
  });

  it('shows suggestions while typing and adds the selected movie', async () => {
    addMovieMock.mockResolvedValue({ movie: {} });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AddMovieModal mode="ALONE" onClose={() => {}} onAdded={() => {}} onError={() => {}} />
      </QueryClientProvider>,
    );
    await userEvent.type(screen.getByLabelText(/title/i), 'Inception');
    const item = await screen.findByText('Inception');
    await userEvent.click(item);
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));
    await waitFor(() => expect(addMovieMock).toHaveBeenCalled());
    expect(addMovieMock.mock.calls[0][0]).toBe('ALONE');
    expect(addMovieMock.mock.calls[0][1].title).toBe('Inception');
    expect(addMovieMock.mock.calls[0][1].metadata.id).toBe('tmdb-movie-1');
  });

  it('disables the add button until a title is typed', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AddMovieModal mode="ALONE" onClose={() => {}} onAdded={() => {}} onError={() => {}} />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled();
  });
});

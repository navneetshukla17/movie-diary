import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const importFileMock = vi.fn();
const fetchBulkMetadataMock = vi.fn();
vi.mock('../api/client', () => ({
  api: {
    importFile: (...args: unknown[]) => importFileMock(...args),
    fetchBulkMetadata: (...args: unknown[]) => fetchBulkMetadataMock(...args),
  },
}));

import { ImportModal } from './ImportModal';

const importedMovie = { id: 'm1', title: 'Inception' };

describe('ImportModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uploads a file and enriches metadata automatically', async () => {
    importFileMock.mockResolvedValue({ movies: [importedMovie], skippedLines: [] });
    fetchBulkMetadataMock.mockResolvedValue({ movies: [importedMovie] });
    const onImported = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ImportModal mode="ALONE" onClose={() => {}} onImported={onImported} onError={() => {}} />
      </QueryClientProvider>,
    );
    const file = new File(['Inception'], 'movies.txt', { type: 'text/plain' });
    await userEvent.upload(screen.getByLabelText(/choose a file/i), file);
    await userEvent.click(screen.getByRole('button', { name: /^import$/i }));
    await waitFor(() => expect(onImported).toHaveBeenCalledWith([importedMovie]));
    expect(fetchBulkMetadataMock).toHaveBeenCalledWith(['m1']);
  });

  it('shows an error message when file upload fails', async () => {
    importFileMock.mockRejectedValue(new Error('No movie titles could be read from this file'));
    const onError = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ImportModal mode="ALONE" onClose={() => {}} onImported={() => {}} onError={onError} />
      </QueryClientProvider>,
    );
    const file = new File(['1234'], 'movies.txt', { type: 'text/plain' });
    await userEvent.upload(screen.getByLabelText(/choose a file/i), file);
    await userEvent.click(screen.getByRole('button', { name: /^import$/i }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith('No movie titles could be read from this file'));
  });
});

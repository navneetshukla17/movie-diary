import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Movie } from '../api/client';

interface Props {
  mode: string;
  onClose: () => void;
  onImported: (movies: Movie[]) => void;
  onError: (message: string) => void;
}

export function ImportModal({ mode, onClose, onImported, onError }: Props) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState(false);
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Choose a file');
      return api.importFile(mode, file);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      if (data.movies.length > 0) {
        setPendingIds(data.movies.map((m) => m.id));
        onImported(data.movies);
        setPrompt(true);
      }
    },
    onError: (err) => onError(err instanceof Error ? err.message : 'Import failed'),
  });

  const enrich = useMutation({
    mutationFn: () => api.fetchBulkMetadata(pendingIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      onClose();
    },
    onError: (err) => {
      onError(err instanceof Error ? err.message : 'Could not import real data');
      onClose();
    },
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {prompt ? (
          <>
            <h2>Import movies' real data?</h2>
            <p>{pendingIds.length} movie(s) were added. Fetch posters, release dates, and ratings for them now?</p>
            <div className="modal-actions">
              <button onClick={onClose}>Ignore</button>
              <button className="primary" disabled={enrich.isPending} onClick={() => enrich.mutate()}>
                Yes, import real data
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>Import movie list</h2>
            <p>
              Upload a text (.txt, .md, .csv), PDF, or image file. Movie titles will be extracted and added to your{' '}
              {mode === 'ALONE' ? 'Alone' : 'US'} list.
            </p>
            <label htmlFor="import-file">Choose a file</label>
            <input
              id="import-file"
              type="file"
              accept=".txt,.md,.csv,.pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <div className="modal-actions">
              <button onClick={onClose}>Cancel</button>
              <button className="primary" disabled={!file || upload.isPending} onClick={() => upload.mutate()}>
                Import
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

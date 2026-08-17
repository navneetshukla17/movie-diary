import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Movie } from '../api/client';
import { Loader2 } from 'lucide-react';

interface Props {
  mode: string;
  onClose: () => void;
  onImported: (movies: Movie[]) => void;
  onError: (message: string) => void;
}

export function ImportModal({ mode, onClose, onImported, onError }: Props) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [watchStatus, setWatchStatus] = useState<'PLANNED' | 'FINISHED'>('FINISHED');

  const enrich = useMutation({
    mutationFn: (ids: string[]) => api.fetchBulkMetadata(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      onClose();
    },
    onError: (err) => {
      onError(err instanceof Error ? err.message : 'Could not import real data');
      onClose();
    },
  });

  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Choose a file');
      return api.importFile(mode, file, watchStatus);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      if (data.movies.length > 0) {
        onImported(data.movies);
        enrich.mutate(data.movies.map((m) => m.id));
      } else {
        onClose();
      }
    },
    onError: (err) => {
      onError(err instanceof Error ? err.message : 'Import failed');
      onClose();
    },
  });

  const pending = upload.isPending || enrich.isPending;

  if (pending) {
    return (
      <div style={{ 
        position: 'fixed', 
        bottom: '80px', 
        left: '50%', 
        transform: 'translateX(-50%)', 
        zIndex: 1000,
        background: 'var(--card)',
        border: '1px solid var(--pink)',
        padding: '8px 16px',
        borderRadius: '30px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        pointerEvents: 'auto'
      }}>
        <Loader2 className="spinner" size={18} color="var(--cyan)" />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong style={{ color: 'var(--yellow)', fontSize: '13px' }}>
            {upload.isPending ? 'Processing File...' : 'Fetching Metadata...'}
          </strong>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
             {upload.isPending ? 'Extracting titles...' : 'Downloading posters...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0, marginBottom: '8px' }}>Import movie list</h2>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: 0, marginBottom: '24px' }}>
          Upload a text, PDF, or image file with movie titles.
        </p>

        {/* Status picker */}
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label style={{ marginBottom: '10px', display: 'block', fontSize: '14px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Add to list:</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setWatchStatus('FINISHED')}
              style={{
                flex: 1,
                padding: '14px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '10px',
                border: `3px solid ${watchStatus === 'FINISHED' ? 'var(--green)' : 'var(--muted)'}`,
                background: watchStatus === 'FINISHED' ? 'var(--green)' : 'var(--card)',
                color: watchStatus === 'FINISHED' ? '#1a1033' : 'var(--muted)',
                cursor: 'pointer',
                boxShadow: watchStatus === 'FINISHED' ? '0 5px 0 #22863a' : '0 5px 0 rgba(0,0,0,0.4)',
                transform: watchStatus === 'FINISHED' ? 'translateY(2px)' : 'none',
                transition: 'all 0.12s ease',
                fontFamily: "'Pixelify Sans', monospace",
                fontWeight: 700,
                fontSize: '15px',
              }}
            >
              <span style={{ fontSize: '22px', lineHeight: 1 }}>🎬</span>
              Watched
            </button>
            <button
              onClick={() => setWatchStatus('PLANNED')}
              style={{
                flex: 1,
                padding: '14px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '10px',
                border: `3px solid ${watchStatus === 'PLANNED' ? 'var(--yellow)' : 'var(--muted)'}`,
                background: watchStatus === 'PLANNED' ? 'var(--yellow)' : 'var(--card)',
                color: watchStatus === 'PLANNED' ? '#1a1033' : 'var(--muted)',
                cursor: 'pointer',
                boxShadow: watchStatus === 'PLANNED' ? '0 5px 0 #a07800' : '0 5px 0 rgba(0,0,0,0.4)',
                transform: watchStatus === 'PLANNED' ? 'translateY(2px)' : 'none',
                transition: 'all 0.12s ease',
                fontFamily: "'Pixelify Sans', monospace",
                fontWeight: 700,
                fontSize: '15px',
              }}
            >
              <span style={{ fontSize: '22px', lineHeight: 1 }}>📋</span>
              Plan to Watch
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="import-file">Choose a file</label>
          <input
            id="import-file"
            type="file"
            accept=".txt,.md,.csv,.pdf,.png,.jpg,.jpeg,.webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" disabled={!file} onClick={() => upload.mutate()}>
            Import
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type MetadataResult } from '../api/client';

interface Props {
  mode: string;
  onClose: () => void;
  onAdded: () => void;
  onError: (message: string) => void;
}

export function AddMovieModal({ mode, onClose, onAdded, onError }: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [suggestions, setSuggestions] = useState<MetadataResult[]>([]);
  const [selected, setSelected] = useState<MetadataResult | null>(null);
  const [watchedDate, setWatchedDate] = useState('');
  const [personalRating, setPersonalRating] = useState<number | null>(null);
  const [watchStatus, setWatchStatus] = useState<'PLANNED' | 'WATCHING' | 'FINISHED'>('FINISHED');
  const [open, setOpen] = useState(false);
  const timer = useRef<number>();

  useEffect(() => {
    window.clearTimeout(timer.current);
    if (title.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    timer.current = window.setTimeout(async () => {
      try {
        const { results } = await api.searchMetadata(title);
        setSuggestions(results);
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  }, [title]);

  const mutation = useMutation({
    mutationFn: () =>
      api.addMovie(mode, {
        title: title.trim(),
        watchedDate: watchedDate ? new Date(watchedDate).toISOString() : null,
        personalRating,
        watchStatus,
        metadata: selected,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      onAdded();
      onClose();
    },
    onError: (err) => onError(err instanceof Error ? err.message : 'Could not add movie'),
  });

  function pick(m: MetadataResult) {
    setSelected(m);
    setTitle(m.title);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add to {mode === 'ALONE' ? 'Alone' : 'US'} list</h2>
        <label htmlFor="add-title">Title</label>
        <input
          id="add-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setSelected(null);
          }}
          placeholder="e.g. Inception"
          autoFocus
        />
        {open && suggestions.length > 0 && (
          <ul className="suggestions">
            {suggestions.map((s) => (
              <li key={s.id} onClick={() => pick(s)}>
                {s.posterUrl ? (
                  <img src={s.posterUrl} alt="" />
                ) : (
                  <div className="poster-placeholder">{s.title.slice(0, 2).toUpperCase()}</div>
                )}
                <div>
                  <strong>{s.title}</strong>
                  <span>{s.year ?? ''} · {s.mediaType} · {s.provider}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
        {selected && <p className="selected-meta">Metadata selected: {selected.title} ({selected.year})</p>}
        <label htmlFor="add-date">Watched date</label>
        <input id="add-date" type="date" value={watchedDate} onChange={(e) => setWatchedDate(e.target.value)} />
        <label htmlFor="add-rating">Personal rating</label>
        <select
          id="add-rating"
          value={personalRating ?? ''}
          onChange={(e) => setPersonalRating(e.target.value === '' ? null : Number(e.target.value))}
        >
          <option value="">Not rated</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <option key={n} value={n}>{n}★</option>
          ))}
        </select>
        <label htmlFor="add-status">Status</label>
        <select
          id="add-status"
          value={watchStatus}
          onChange={(e) => setWatchStatus(e.target.value as 'PLANNED' | 'WATCHING' | 'FINISHED')}
        >
          <option value="PLANNED">Planned</option>
          <option value="WATCHING">Watching</option>
          <option value="FINISHED">Finished</option>
        </select>
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" disabled={!title.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

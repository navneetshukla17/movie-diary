import { useState } from 'react';
import { api, type Movie } from '../api/client';

interface Props {
  movie: Movie;
  mode: string;
  highlighted: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
}

const STATUSES = ['PLANNED', 'WATCHING', 'FINISHED'] as const;

export function MovieCard({ movie, mode, highlighted, onChanged, onError }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(movie.title);
  const [watchedDate, setWatchedDate] = useState(movie.watchedDate ? movie.watchedDate.slice(0, 10) : '');
  const [personalRating, setPersonalRating] = useState<number | null>(movie.personalRating);
  const [watchStatus, setWatchStatus] = useState(movie.watchStatus);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const titleOnly = movie.imported && !movie.posterUrl;

  async function fetchMetadata() {
    setBusy(true);
    try {
      await api.fetchMetadata(movie.id);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not fetch metadata');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      await api.updateMovie(mode, movie.id, {
        title: title.trim(),
        watchedDate: watchedDate ? new Date(watchedDate).toISOString() : null,
        personalRating,
        watchStatus,
      });
      setEditing(false);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save changes');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.deleteMovie(mode, movie.id);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not delete movie');
      setBusy(false);
    }
  }

  const ratings = movie.providerRatings as Record<string, number> | null;

  return (
    <article className={`card ${highlighted ? 'card-highlight' : ''}`}>
      <div className="card-poster">
        {movie.posterUrl ? (
          <img src={movie.posterUrl} alt={movie.title} />
        ) : (
          <div className="poster-placeholder">{movie.title.slice(0, 2).toUpperCase()}</div>
        )}
        {titleOnly && (
          <button className="mini-btn" disabled={busy} onClick={fetchMetadata}>
            Fetch real data
          </button>
        )}
      </div>
      <div className="card-body">
        {editing ? (
          <>
            <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
            <input type="date" value={watchedDate} onChange={(e) => setWatchedDate(e.target.value)} aria-label="Watched date" />
            <select value={personalRating ?? ''} onChange={(e) => setPersonalRating(e.target.value === '' ? null : Number(e.target.value))} aria-label="Rating">
              <option value="">Not rated</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>{n}★</option>
              ))}
            </select>
            <select value={watchStatus} onChange={(e) => setWatchStatus(e.target.value as (typeof STATUSES)[number])} aria-label="Status">
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.toLowerCase()}</option>
              ))}
            </select>
            <div className="card-actions">
              <button disabled={busy} onClick={save}>Save</button>
              <button onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <h3>{movie.title}</h3>
            <p className="meta">
              {movie.releaseDate ? movie.releaseDate.slice(0, 4) : '—'}
              {ratings && (ratings.tmdb != null || ratings.imdb != null) && (
                <>
                  {' · '}
                  {ratings.tmdb != null && `TMDB ${ratings.tmdb}`}
                  {ratings.tmdb != null && ratings.imdb != null && ' · '}
                  {ratings.imdb != null && `IMDb ${ratings.imdb}`}
                </>
              )}
            </p>
            <p className="badge-row">
              <span className={`badge badge-${movie.watchStatus.toLowerCase()}`}>{movie.watchStatus.toLowerCase()}</span>
              {movie.personalRating != null && <span className="rating">{movie.personalRating}★</span>}
              {movie.watchedDate && <span className="date">{movie.watchedDate.slice(0, 10)}</span>}
            </p>
            <div className="card-actions">
              <button onClick={() => setEditing(true)}>Edit</button>
              {confirmDelete ? (
                <>
                  <button className="danger" disabled={busy} onClick={remove}>Confirm</button>
                  <button onClick={() => setConfirmDelete(false)}>No</button>
                </>
              ) : (
                <button className="danger" onClick={() => setConfirmDelete(true)}>Delete</button>
              )}
            </div>
          </>
        )}
      </div>
    </article>
  );
}

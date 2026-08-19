import { useState } from 'react';
import { api, type Movie } from '../api/client';
import { Star } from 'lucide-react';
import { EditMovieModal } from './EditMovieModal';

interface Props {
  movie: Movie;
  mode: string;
  highlighted: boolean;
  onChanged: (message: string) => void;
  onError: (message: string) => void;
}

export function MovieCard({
  movie,
  mode,
  highlighted,
  onChanged,
  onError,
}: Props) {
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      await api.deleteMovie(mode, movie.id);
      onChanged('Movie deleted!');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not delete movie');
    } finally {
      setBusy(false);
    }
  }

  const ratings = movie.providerRatings as Record<string, number> | null;
  const titleOnly = movie.imported && !movie.posterUrl;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${d.getDate()} / ${d.toLocaleString('en-US', { month: 'short' })} / ${d.getFullYear()}`;
  };

  async function fetchMetadata() {
    setBusy(true);
    try {
      await api.fetchMetadata(movie.id);
      onChanged('Movie data fetched!');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not fetch metadata');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <article
        className={`card ${highlighted ? 'card-highlight' : ''}`}
        style={{
          position: 'relative',
          borderRadius: 10,
        }}
      >
        {/* Poster */}
        <div className="card-poster" style={{ position: 'relative' }}>
          {movie.posterUrl ? (
            <img src={movie.posterUrl} alt={movie.title} />
          ) : (
            <div className="poster-placeholder">{movie.title.slice(0, 2).toUpperCase()}</div>
          )}
          {titleOnly && (
            <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8 }}>
              <button className="mini-btn" disabled={busy} onClick={fetchMetadata} style={{ width: '100%' }}>
                {busy ? 'Loading…' : 'Fetch data'}
              </button>
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="card-body">
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
            {movie.watchStatus === 'PLANNED' && movie.plannedDate && (
              <span className="date">📅 {formatDate(movie.plannedDate)}</span>
            )}
            {movie.watchStatus !== 'PLANNED' && movie.watchedDate && (
              <span className="date">👁 {formatDate(movie.watchedDate)}</span>
            )}
          </p>
          {movie.personalRating != null && (
            <div style={{ display: 'flex', gap: 2, color: 'var(--yellow)', margin: '2px 0' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={14} fill={i < movie.personalRating! ? 'currentColor' : 'none'} style={{ opacity: i < movie.personalRating! ? 1 : 0.3 }} />
              ))}
            </div>
          )}
          {movie.review && (
            <p style={{
              fontSize: 12, fontStyle: 'italic', color: 'var(--text)', margin: '4px 0 0',
              borderLeft: '3px solid var(--pink)', paddingLeft: 8, lineHeight: 1.4,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              "{movie.review}"
            </p>
          )}

          {/* Edit / Delete action buttons */}
          <div className="card-actions">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowEdit(true);
              }}
              style={{ flex: 1 }}
            >
              Edit
            </button>
            {confirmDelete ? (
              <>
                <button
                  className="danger"
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation();
                    remove();
                  }}
                  style={{ flex: 1 }}
                >
                  Sure?
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(false);
                  }}
                  style={{ flex: 1 }}
                >
                  No
                </button>
              </>
            ) : (
              <button
                className="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
                style={{ flex: 1 }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </article>

      {/* Edit bottom-sheet modal */}
      {showEdit && (
        <EditMovieModal
          movie={movie}
          mode={mode}
          onClose={() => setShowEdit(false)}
          onSaved={onChanged}
          onError={onError}
        />
      )}
    </>
  );
}

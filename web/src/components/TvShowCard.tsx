import { useState } from 'react';
import { api, type Movie } from '../api/client';
import { Star, Tv, Layers, X, Edit, Trash2 } from 'lucide-react';
import { EditMovieModal } from './EditMovieModal';

interface Props {
  showTitle: string;
  seasons: Movie[];
  mode: string;
  highlightedIds: Set<string>;
  onChanged: (message: string) => void;
  onError: (message: string) => void;
}

export function TvShowCard({
  showTitle,
  seasons,
  mode,
  highlightedIds,
  onChanged,
  onError,
}: Props) {
  const [showAllSeasonsModal, setShowAllSeasonsModal] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Sort seasons: S1, S2, S3...
  const sortedSeasons = [...seasons].sort((a, b) => {
    const sA = a.seasonNumber ?? 999;
    const sB = b.seasonNumber ?? 999;
    if (sA !== sB) return sA - sB;
    return a.title.localeCompare(b.title);
  });

  // Pick the latest active season to feature on the card:
  // Priority: 1. WATCHING, 2. PLANNED, 3. Highest season number
  const activeSeason =
    sortedSeasons.find((s) => s.watchStatus === 'WATCHING') ||
    sortedSeasons.find((s) => s.watchStatus === 'PLANNED') ||
    sortedSeasons[sortedSeasons.length - 1] ||
    sortedSeasons[0];

  const posterUrl = activeSeason?.posterUrl || activeSeason?.showPosterUrl || sortedSeasons[0]?.showPosterUrl || sortedSeasons[0]?.posterUrl;
  const isHighlighted = activeSeason ? highlightedIds.has(activeSeason.id) : false;
  const ratings = activeSeason?.providerRatings as Record<string, number> | null;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${d.getDate()} / ${d.toLocaleString('en-US', { month: 'short' })} / ${d.getFullYear()}`;
  };

  async function remove(seasonId: string) {
    setBusy(true);
    try {
      await api.deleteMovie(mode, seasonId);
      onChanged('Season deleted!');
      setConfirmDeleteId(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not delete season');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <article
        className={`card ${isHighlighted ? 'card-highlight' : ''}`}
        style={{
          position: 'relative',
          borderRadius: 10,
        }}
      >
        {/* Poster */}
        <div className="card-poster" style={{ position: 'relative' }}>
          {/* TV Badge on top-right */}
          <div style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 5,
            background: 'rgba(26, 16, 51, 0.85)',
            backdropFilter: 'blur(4px)',
            border: '1px solid var(--cyan)',
            color: 'var(--cyan)',
            padding: '2px 6px',
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <Tv size={10} />
            <span>{sortedSeasons.length} {sortedSeasons.length === 1 ? 'Season' : 'Seasons'}</span>
          </div>

          {posterUrl ? (
            <img src={posterUrl} alt={showTitle} />
          ) : (
            <div className="poster-placeholder">{showTitle.slice(0, 2).toUpperCase()}</div>
          )}
        </div>

        {/* Card body */}
        <div className="card-body">
          <h3 style={{ marginBottom: 2 }}>{showTitle}</h3>

          {/* Active Season label */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 4,
            margin: '2px 0 4px',
          }}>
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--cyan)',
            }}>
              {activeSeason?.seasonNumber ? `Season ${activeSeason.seasonNumber}` : (activeSeason?.title || 'Season')}
            </span>

            {activeSeason?.episodeProgress && (
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--pink)',
                background: 'rgba(255, 106, 193, 0.15)',
                border: '1px solid var(--pink)',
                padding: '1px 5px',
                borderRadius: 4,
              }}>
                {activeSeason.episodeProgress}
              </span>
            )}
          </div>

          <p className="meta">
            {activeSeason?.releaseDate ? activeSeason.releaseDate.slice(0, 4) : '—'}
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
            <span className={`badge badge-${activeSeason?.watchStatus.toLowerCase() ?? 'planned'}`}>
              {activeSeason?.watchStatus.toLowerCase() ?? 'planned'}
            </span>
            {activeSeason?.watchStatus === 'PLANNED' && activeSeason?.plannedDate && (
              <span className="date">📅 {formatDate(activeSeason.plannedDate)}</span>
            )}
            {activeSeason?.watchStatus !== 'PLANNED' && activeSeason?.watchedDate && (
              <span className="date">👁 {formatDate(activeSeason.watchedDate)}</span>
            )}
          </p>

          {activeSeason?.personalRating != null && (
            <div style={{ display: 'flex', gap: 2, color: 'var(--yellow)', margin: '2px 0' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  fill={i < activeSeason.personalRating! ? 'currentColor' : 'none'}
                  style={{ opacity: i < activeSeason.personalRating! ? 1 : 0.3 }}
                />
              ))}
            </div>
          )}

          {activeSeason?.review && (
            <p style={{
              fontSize: 12, fontStyle: 'italic', color: 'var(--text)', margin: '4px 0 0',
              borderLeft: '3px solid var(--pink)', paddingLeft: 8, lineHeight: 1.4,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              "{activeSeason.review}"
            </p>
          )}

          {/* Card footer / bottom controls */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 6 }}>
            {/* See all seasons button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowAllSeasonsModal(true);
              }}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: 11,
                fontWeight: 700,
                background: 'rgba(103, 232, 249, 0.1)',
                border: '1px solid var(--cyan)',
                color: 'var(--cyan)',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
              }}
            >
              <Layers size={13} />
              <span>All Seasons ({sortedSeasons.length}) ▾</span>
            </button>

            {/* Edit / Delete action buttons for the active season */}
            <div className="card-actions" style={{ marginTop: 0, paddingTop: 0 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeSeason) setEditingMovie(activeSeason);
                }}
                style={{ flex: 1 }}
              >
                Edit
              </button>
              {confirmDeleteId === activeSeason?.id ? (
                <>
                  <button
                    className="danger"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeSeason) remove(activeSeason.id);
                    }}
                    style={{ flex: 1 }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(null);
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
                    if (activeSeason) setConfirmDeleteId(activeSeason.id);
                  }}
                  style={{ flex: 1 }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* "All Seasons" Bottom-sheet modal */}
      {showAllSeasonsModal && (
        <div className="modal-backdrop" onClick={() => setShowAllSeasonsModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--muted)', margin: '0 auto 14px' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {posterUrl && (
                  <img
                    src={posterUrl}
                    alt={showTitle}
                    style={{ width: 36, height: 54, objectFit: 'cover', borderRadius: 6 }}
                  />
                )}
                <div>
                  <h2 style={{ margin: 0, fontSize: 18 }}>{showTitle}</h2>
                  <span style={{ fontSize: 12, color: 'var(--cyan)', fontWeight: 600 }}>
                    {sortedSeasons.length} tracked season{sortedSeasons.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowAllSeasonsModal(false)}
                aria-label="Close"
                style={{ width: 36, height: 36, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--muted)', background: 'transparent' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* List of all seasons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
              {sortedSeasons.map((season) => (
                <div
                  key={season.id}
                  style={{
                    background: 'var(--bg-2)',
                    border: '1px solid var(--muted)',
                    borderRadius: 10,
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                      {season.seasonNumber ? `Season ${season.seasonNumber}` : season.title}
                    </span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {season.episodeProgress && (
                        <span style={{
                          fontSize: 11,
                          background: 'rgba(255, 106, 193, 0.15)',
                          color: 'var(--pink)',
                          border: '1px solid var(--pink)',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontWeight: 700,
                        }}>
                          {season.episodeProgress}
                        </span>
                      )}
                      <span className={`badge badge-${season.watchStatus.toLowerCase()}`}>
                        {season.watchStatus.toLowerCase()}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
                    {season.watchStatus === 'PLANNED' && season.plannedDate && (
                      <span>📅 {formatDate(season.plannedDate)}</span>
                    )}
                    {season.watchStatus !== 'PLANNED' && season.watchedDate && (
                      <span>👁 {formatDate(season.watchedDate)}</span>
                    )}
                    {season.personalRating != null && (
                      <div style={{ display: 'flex', gap: 2, color: 'var(--yellow)' }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            fill={i < season.personalRating! ? 'currentColor' : 'none'}
                            style={{ opacity: i < season.personalRating! ? 1 : 0.3 }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {season.review && (
                    <p style={{
                      fontSize: 12, fontStyle: 'italic', color: 'var(--text)', margin: 0,
                      borderLeft: '2px solid var(--pink)', paddingLeft: 6, lineHeight: 1.3,
                    }}>
                      "{season.review}"
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                      className="mini-btn"
                      onClick={() => {
                        setShowAllSeasonsModal(false);
                        setEditingMovie(season);
                      }}
                      style={{ flex: 1 }}
                    >
                      <Edit size={12} style={{ marginRight: 4 }} /> Edit
                    </button>
                    <button
                      className="mini-btn danger"
                      onClick={() => {
                        remove(season.id);
                        if (sortedSeasons.length <= 1) setShowAllSeasonsModal(false);
                      }}
                      style={{ flex: 1 }}
                    >
                      <Trash2 size={12} style={{ marginRight: 4 }} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16 }}>
              <button
                onClick={() => setShowAllSeasonsModal(false)}
                style={{ width: '100%' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingMovie && (
        <EditMovieModal
          movie={editingMovie}
          mode={mode}
          onClose={() => setEditingMovie(null)}
          onSaved={(msg) => {
            setEditingMovie(null);
            onChanged(msg);
          }}
          onError={onError}
        />
      )}
    </>
  );
}

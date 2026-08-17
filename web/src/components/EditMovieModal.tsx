import { useState } from 'react';
import { api, type Movie, type MetadataResult } from '../api/client';
import { StarRating } from './StarRating';
import { DatePicker } from './DatePicker';
import { MovieSearchOverlay } from './MovieSearchOverlay';
import { X, Search } from 'lucide-react';

const STATUSES = ['FINISHED', 'WATCHING', 'PLANNED'] as const;

interface Props {
  movie: Movie;
  mode: string;
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}

export function EditMovieModal({ movie, mode, onClose, onSaved, onError }: Props) {
  const [title, setTitle] = useState(movie.title);
  const [watchedDate, setWatchedDate] = useState(movie.watchedDate ? movie.watchedDate.slice(0, 10) : '');
  const [plannedDate, setPlannedDate] = useState(movie.plannedDate ? movie.plannedDate.slice(0, 10) : '');
  const [personalRating, setPersonalRating] = useState<number | null>(movie.personalRating);
  const [review, setReview] = useState(movie.review ?? '');
  const [watchStatus, setWatchStatus] = useState(movie.watchStatus);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<MetadataResult | null>(null);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);

  const currentPoster = selected?.posterUrl || movie.posterUrl;

  const setDateOffset = (setter: (d: string) => void, offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setter(d.toISOString().split('T')[0]);
  };

  async function save() {
    setBusy(true);
    try {
      await api.updateMovie(mode, movie.id, {
        title: title.trim(),
        watchedDate: watchStatus === 'PLANNED' ? null : (watchedDate ? new Date(watchedDate).toISOString() : null),
        plannedDate: watchStatus === 'PLANNED' && plannedDate ? new Date(plannedDate).toISOString() : null,
        personalRating,
        review: review.trim() || null,
        watchStatus,
        metadata: selected,
      });
      onSaved('Movie updated successfully!');
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save changes');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal edit-modal" onClick={(e) => e.stopPropagation()}>

          {/* Drag handle */}
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--muted)', margin: '0 auto 14px' }} />

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Edit Movie</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{ width: 36, height: 36, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--muted)', background: 'transparent', flexShrink: 0 }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Movie poster — top center, big preview */}
          {currentPoster && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <img
                src={currentPoster}
                alt={title}
                style={{
                  width: 120,
                  height: 180,
                  objectFit: 'cover',
                  borderRadius: 12,
                  boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
                  border: '2px solid var(--muted)',
                }}
              />
            </div>
          )}

          {/* Search / Change Title Trigger Box */}
          <label>Movie Title & Metadata</label>
          <div
            onClick={() => setShowSearchOverlay(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 10,
              border: '2px solid var(--cyan)',
              background: 'rgba(103, 232, 249, 0.06)',
              cursor: 'pointer',
              marginBottom: 16,
            }}
          >
            <Search size={18} color="var(--cyan)" />
            <span style={{ fontSize: 15, flex: 1, fontWeight: 600, color: 'var(--text)' }}>
              {title}
            </span>
            <span style={{
              fontSize: 11,
              background: 'var(--cyan)',
              color: '#1a1033',
              padding: '3px 8px',
              borderRadius: 6,
              fontWeight: 700,
              fontFamily: 'var(--font-brand)',
            }}>
              CHANGE 🔍
            </span>
          </div>

          {selected && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(74, 222, 128, 0.1)',
              border: '1px solid var(--green)',
              borderRadius: 8,
              padding: '6px 10px',
              margin: '-8px 0 14px',
            }}>
              <span style={{ color: 'var(--green)', fontSize: 12, fontWeight: 700 }}>
                ✓ Selected: {selected.title} ({selected.year ?? ''})
              </span>
            </div>
          )}

          {/* Status */}
          <label>Status</label>
          <select value={watchStatus} onChange={(e) => setWatchStatus(e.target.value as typeof STATUSES[number])} aria-label="Status">
            {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
          </select>

          {/* Date */}
          <label>{watchStatus === 'PLANNED' ? 'Planned date' : 'Watched date'}</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <DatePicker
              value={watchStatus === 'PLANNED' ? plannedDate : watchedDate}
              onChange={watchStatus === 'PLANNED' ? setPlannedDate : setWatchedDate}
            />
            <button
              type="button"
              onClick={() => setDateOffset(watchStatus === 'PLANNED' ? setPlannedDate : setWatchedDate, 0)}
              style={{ flexShrink: 0, padding: '0 14px' }}
            >
              Today
            </button>
          </div>

          {/* Rating + review */}
          {watchStatus !== 'PLANNED' && (
            <>
              <label>Your rating</label>
              <div style={{ marginBottom: 14 }}>
                <StarRating rating={personalRating} onChange={setPersonalRating} />
              </div>

              <label>
                Review <span style={{ color: 'var(--muted)', fontWeight: 400, fontFamily: 'var(--font-body)' }}>(optional)</span>
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="What did you think?"
                rows={3}
                style={{
                  fontFamily: 'var(--font-body)', width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '2px solid var(--muted)', background: '#130b28', color: 'var(--text)',
                  marginBottom: 16, resize: 'vertical', fontSize: 15, boxSizing: 'border-box',
                }}
              />
            </>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <button onClick={onClose}>Cancel</button>
            <button className="primary" disabled={busy} onClick={save}>
              {busy ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Dedicated full-screen search overlay */}
      {showSearchOverlay && (
        <MovieSearchOverlay
          initialQuery={title}
          onSelect={(m) => {
            setSelected(m);
            setTitle(m.title);
          }}
          onCustomTitle={(custom) => {
            setSelected(null);
            setTitle(custom);
          }}
          onClose={() => setShowSearchOverlay(false)}
        />
      )}
    </>
  );
}

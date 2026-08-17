import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type MetadataResult } from '../api/client';
import { StarRating } from './StarRating';
import { DatePicker } from './DatePicker';
import { MovieSearchOverlay } from './MovieSearchOverlay';
import { Search, X, Film } from 'lucide-react';

interface Props {
  mode: string;
  onClose: () => void;
  onAdded: () => void;
  onError: (message: string) => void;
}

export function AddMovieModal({ mode, onClose, onAdded, onError }: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<MetadataResult | null>(null);
  const [watchedDate, setWatchedDate] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [personalRating, setPersonalRating] = useState<number | null>(null);
  const [review, setReview] = useState('');
  const [watchStatus, setWatchStatus] = useState<'PLANNED' | 'WATCHING' | 'FINISHED'>('FINISHED');
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      api.addMovie(mode, {
        title: title.trim(),
        watchedDate: watchStatus === 'PLANNED' ? null : (watchedDate ? new Date(watchedDate).toISOString() : null),
        plannedDate: watchStatus === 'PLANNED' && plannedDate ? new Date(plannedDate).toISOString() : null,
        personalRating,
        review: review.trim() || null,
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

  const setDateOffset = (setter: (d: string) => void, offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setter(d.toISOString().split('T')[0]);
  };

  return (
    <>
      <div className="modal-backdrop" onClick={mutation.isPending ? undefined : onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          {/* Drag handle */}
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--muted)', margin: '0 auto 14px' }} />

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Add to {mode === 'ALONE' ? 'Alone' : 'US'} list</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{ width: 36, height: 36, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--muted)', background: 'transparent', flexShrink: 0 }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Selected Movie Preview Card or Search Trigger */}
          {selected ? (
            <div style={{
              display: 'flex',
              gap: 12,
              background: 'var(--card)',
              border: '2px solid var(--green)',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              alignItems: 'center',
            }}>
              {selected.posterUrl ? (
                <img
                  src={selected.posterUrl}
                  alt={selected.title}
                  style={{ width: 60, height: 90, objectFit: 'cover', borderRadius: 8, flexShrink: 0, boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}
                />
              ) : (
                <div className="poster-placeholder" style={{ width: 60, height: 90, borderRadius: 8, fontSize: 18 }}>
                  {selected.title.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--green)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ✓ Selected Title
                </div>
                <h3 style={{ margin: '2px 0 4px', fontSize: 16, color: 'var(--text)', lineHeight: 1.25 }}>
                  {selected.title}
                </h3>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {selected.year && <span className="suggestion-badge year">{selected.year}</span>}
                  <span className={`suggestion-badge type-${selected.mediaType}`}>
                    {selected.mediaType === 'tv' ? '📺 TV Series' : '🎬 Movie'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSearchOverlay(true)}
                  style={{ marginTop: 8, fontSize: 11, padding: '4px 8px', background: 'transparent', border: '1px solid var(--cyan)', color: 'var(--cyan)' }}
                >
                  Change movie 🔍
                </button>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <label>Search & Select Movie</label>
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
                  color: title ? 'var(--text)' : 'var(--muted)',
                }}
              >
                <Search size={20} color="var(--cyan)" />
                <span style={{ fontSize: 15, flex: 1 }}>
                  {title || 'Tap to search movie / TV series...'}
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
                  OPEN SEARCH
                </span>
              </div>
            </div>
          )}

          {/* Watch Status */}
          <label htmlFor="add-status">Status</label>
          <select
            id="add-status"
            value={watchStatus}
            onChange={(e) => setWatchStatus(e.target.value as 'PLANNED' | 'WATCHING' | 'FINISHED')}
          >
            <option value="FINISHED">Finished</option>
            <option value="WATCHING">Watching</option>
            <option value="PLANNED">Planned</option>
          </select>

          {watchStatus === 'PLANNED' ? (
            <>
              <label>Planned to watch when?</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <DatePicker value={plannedDate} onChange={setPlannedDate} />
                <button type="button" onClick={() => setDateOffset(setPlannedDate, 0)} className="mini-btn">Today</button>
                <button type="button" onClick={() => setDateOffset(setPlannedDate, 1)} className="mini-btn">Tomorrow</button>
              </div>
            </>
          ) : (
            <>
              <label>Watched date</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <DatePicker value={watchedDate} onChange={setWatchedDate} />
                <button type="button" onClick={() => setDateOffset(setWatchedDate, 0)} className="mini-btn">Today</button>
                <button type="button" onClick={() => setDateOffset(setWatchedDate, -1)} className="mini-btn">Yesterday</button>
              </div>
            </>
          )}

          {watchStatus !== 'PLANNED' && (
            <>
              <label>Personal rating</label>
              <div style={{ marginBottom: '16px' }}>
                <StarRating rating={personalRating} onChange={setPersonalRating} />
              </div>

              <label htmlFor="add-review">Review (Optional)</label>
              <textarea
                id="add-review"
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="What did you think?"
                rows={3}
                style={{
                  fontFamily: 'var(--font-body)',
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '2px solid var(--muted)',
                  background: '#130b28',
                  color: 'var(--text)',
                  marginBottom: '10px',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </>
          )}

          <div className="modal-actions">
            <button disabled={mutation.isPending} onClick={onClose}>Cancel</button>
            <button className="primary" disabled={!title.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
              Add Movie
            </button>
          </div>
        </div>
      </div>

      {/* Full-screen dedicated search overlay */}
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

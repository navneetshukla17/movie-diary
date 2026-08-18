import { useState, useEffect, useRef } from 'react';
import { api, type MetadataResult, type TvSeason, type TvSeasonSelection } from '../api/client';
import { ArrowLeft, Search, Loader2, X, Star, Tv } from 'lucide-react';

interface Props {
  initialQuery?: string;
  onSelect: (metadata: MetadataResult | TvSeasonSelection) => void;
  onCustomTitle?: (title: string) => void;
  onClose: () => void;
}

type View = 'search' | 'season-picker';

export function MovieSearchOverlay({ initialQuery = '', onSelect, onCustomTitle, onClose }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<MetadataResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Season picker state
  const [view, setView] = useState<View>('search');
  const [selectedShow, setSelectedShow] = useState<MetadataResult | null>(null);
  const [seasons, setSeasons] = useState<TvSeason[]>([]);
  const [isFetchingSeasons, setIsFetchingSeasons] = useState(false);
  const [seasonError, setSeasonError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number>();
  const searchCounter = useRef(0);

  useEffect(() => {
    if (view === 'search') inputRef.current?.focus();
  }, [view]);

  useEffect(() => {
    window.clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    const currentId = ++searchCounter.current;

    timer.current = window.setTimeout(async () => {
      try {
        const res = await api.searchMetadata(q);
        if (currentId !== searchCounter.current) return;
        setResults(res.results);
        setHasSearched(true);
      } catch {
        if (currentId === searchCounter.current) setResults([]);
      } finally {
        if (currentId === searchCounter.current) setIsSearching(false);
      }
    }, 280);

    return () => window.clearTimeout(timer.current);
  }, [query]);

  // Extract numeric TMDB ID from MetadataResult id like "tmdb-tv-1234"
  function extractTmdbId(result: MetadataResult): string | null {
    const match = result.id.match(/tmdb-tv-(\d+)/);
    return match ? match[1] : null;
  }

  async function handleTvShowClick(show: MetadataResult) {
    setSelectedShow(show);
    setView('season-picker');
    setIsFetchingSeasons(true);
    setSeasonError(null);
    setSeasons([]);

    const tmdbId = extractTmdbId(show);
    if (!tmdbId) {
      // Fallback: generic seasons
      setSeasons(Array.from({ length: 5 }, (_, i) => ({
        seasonNumber: i + 1,
        name: `Season ${i + 1}`,
        episodeCount: null,
        airDate: null,
        posterUrl: null,
      })));
      setIsFetchingSeasons(false);
      return;
    }

    try {
      const res = await api.getTvSeasons(tmdbId);
      setSeasons(res.seasons);
    } catch {
      setSeasonError('Could not fetch seasons. Showing generic list.');
      setSeasons(Array.from({ length: 5 }, (_, i) => ({
        seasonNumber: i + 1,
        name: `Season ${i + 1}`,
        episodeCount: null,
        airDate: null,
        posterUrl: null,
      })));
    } finally {
      setIsFetchingSeasons(false);
    }
  }

  function handleSeasonSelect(season: TvSeason) {
    if (!selectedShow) return;
    const tmdbId = extractTmdbId(selectedShow) ?? '';
    const selection: TvSeasonSelection = {
      ...selectedShow,
      title: `${selectedShow.title} — Season ${season.seasonNumber}`,
      seasonNumber: season.seasonNumber,
      seasonName: season.name,
      showTitle: selectedShow.title,
      showPosterUrl: selectedShow.posterUrl,
      tmdbId,
    };
    onSelect(selection);
    onClose();
  }

  function handleMovieClick(m: MetadataResult) {
    onSelect(m);
    onClose();
  }

  // ── Season Picker View ──────────────────────────────────────────────────
  if (view === 'season-picker' && selectedShow) {
    return (
      <div className="search-overlay">
        <div className="search-overlay-header">
          <button onClick={() => setView('search')} aria-label="Back" className="search-overlay-back-btn">
            <ArrowLeft size={22} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {selectedShow.posterUrl && (
                <img
                  src={selectedShow.posterUrl}
                  alt={selectedShow.title}
                  style={{ width: 32, height: 48, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                />
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--cyan)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📺 Pick a Season
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedShow.title}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="search-overlay-content">
          {isFetchingSeasons ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginTop: 60 }}>
              <Loader2 className="spinner" size={36} color="var(--cyan)" />
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>Fetching seasons from TMDB…</p>
            </div>
          ) : (
            <>
              {seasonError && (
                <div style={{ color: 'var(--yellow)', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: 'rgba(251,191,36,0.1)', borderRadius: 8 }}>
                  ⚠️ {seasonError}
                </div>
              )}

              <div style={{ marginBottom: 8 }}>
                <div className="search-overlay-count">
                  {seasons.length} season{seasons.length === 1 ? '' : 's'} available — tap to select
                </div>
              </div>

              <div className="season-grid">
                {seasons.map((s) => (
                  <button
                    key={s.seasonNumber}
                    className="season-card"
                    onClick={() => handleSeasonSelect(s)}
                  >
                    {s.posterUrl ? (
                      <img src={s.posterUrl} alt={s.name} className="season-card-poster" />
                    ) : (
                      <div className="season-card-poster season-card-poster-placeholder">
                        <Tv size={22} color="var(--cyan)" />
                      </div>
                    )}
                    <div className="season-card-label">
                      <span className="season-card-number">S{s.seasonNumber}</span>
                      <span className="season-card-name">{s.name}</span>
                      {s.episodeCount != null && (
                        <span className="season-card-eps">{s.episodeCount} ep</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Search View ─────────────────────────────────────────────────────────
  return (
    <div className="search-overlay">
      {/* Search Header Bar */}
      <div className="search-overlay-header">
        <button onClick={onClose} aria-label="Back" className="search-overlay-back-btn">
          <ArrowLeft size={22} />
        </button>

        <div className="search-overlay-input-wrap">
          <Search size={18} className="search-overlay-input-icon" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies, TV shows, anime..."
            className="search-overlay-input"
            autoComplete="off"
          />
          {query.length > 0 && (
            <button
              onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
              className="search-overlay-clear-btn"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
          {isSearching && (
            <div className="search-overlay-spinner">
              <Loader2 className="spinner" size={18} color="var(--cyan)" />
            </div>
          )}
        </div>
      </div>

      {/* Results / Empty state area */}
      <div className="search-overlay-content">
        {/* Results List */}
        {results.length > 0 && (
          <div className="search-overlay-results">
            <div className="search-overlay-count">
              Found {results.length} result{results.length === 1 ? '' : 's'} for "{query}"
            </div>

            {results.map((m) => {
              const rating = m.providerRatings?.tmdb || m.providerRatings?.imdb;
              const isTv = m.mediaType === 'tv';
              return (
                <div
                  key={m.id}
                  onClick={() => isTv ? handleTvShowClick(m) : handleMovieClick(m)}
                  className={`search-card ${isTv ? 'search-card-tv' : ''}`}
                >
                  {/* Poster */}
                  <div className="search-card-poster-wrap">
                    {m.posterUrl ? (
                      <img src={m.posterUrl} alt={m.title} className="search-card-poster" />
                    ) : (
                      <div className="poster-placeholder search-card-placeholder">
                        {m.title.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    {rating && (
                      <div className="search-card-rating">
                        <Star size={11} fill="currentColor" />
                        <span>{rating}</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="search-card-info">
                    <h3 className="search-card-title">{m.title}</h3>

                    <div className="search-card-badges">
                      {m.year && <span className="search-badge year">{m.year}</span>}
                      <span className={`search-badge type-${m.mediaType}`}>
                        {m.mediaType === 'tv' ? '📺 TV Show' : '🎬 Movie'}
                      </span>
                      <span className="search-card-provider">{m.provider}</span>
                    </div>

                    {m.overview ? (
                      <p className="search-card-overview">{m.overview}</p>
                    ) : (
                      <p className="search-card-overview empty">No synopsis available</p>
                    )}

                    <div className={`search-card-select-btn ${isTv ? 'search-card-select-tv' : ''}`}>
                      {isTv ? '📺 Pick a Season →' : 'Select this title →'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Custom title fallback */}
        {query.trim().length >= 2 && (
          <div className="search-overlay-custom-box">
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 8px' }}>
              Can't find the exact match or want to use your own custom title?
            </p>
            <button
              onClick={() => { onCustomTitle?.(query.trim()); onClose(); }}
              className="search-overlay-custom-btn"
            >
              Use "<strong>{query.trim()}</strong>" as custom title
            </button>
          </div>
        )}

        {/* Initial prompt */}
        {!hasSearched && query.trim().length < 2 && (
          <div className="search-overlay-initial">
            <div style={{ fontSize: 56, marginBottom: 12 }}>🎬</div>
            <h3 style={{ fontFamily: 'var(--font-brand)', color: 'var(--yellow)', margin: '0 0 8px', fontSize: 20 }}>
              Search Any Movie or TV Show
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 320, margin: 0, lineHeight: 1.5 }}>
              Movies → select immediately. TV Shows → pick a season first.
            </p>
          </div>
        )}

        {/* No results */}
        {hasSearched && results.length === 0 && !isSearching && (
          <div className="search-overlay-initial">
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <h3 style={{ fontFamily: 'var(--font-brand)', color: 'var(--yellow)', margin: '0 0 8px', fontSize: 18 }}>
              No matches found for "{query}"
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 16px' }}>
              Check spelling or click below to use it as a custom title.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

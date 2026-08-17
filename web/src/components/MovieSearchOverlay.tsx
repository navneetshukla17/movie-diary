import { useState, useEffect, useRef } from 'react';
import { api, type MetadataResult } from '../api/client';
import { ArrowLeft, Search, Loader2, X, Star } from 'lucide-react';

interface Props {
  initialQuery?: string;
  onSelect: (metadata: MetadataResult) => void;
  onCustomTitle?: (title: string) => void;
  onClose: () => void;
}

export function MovieSearchOverlay({ initialQuery = '', onSelect, onCustomTitle, onClose }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<MetadataResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number>();
  const searchCounter = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  return (
    <div className="search-overlay">
      {/* Search Header Bar */}
      <div className="search-overlay-header">
        <button
          onClick={onClose}
          aria-label="Back"
          className="search-overlay-back-btn"
        >
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
              return (
                <div
                  key={m.id}
                  onClick={() => {
                    onSelect(m);
                    onClose();
                  }}
                  className="search-card"
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
                        {m.mediaType === 'tv' ? '📺 TV Series' : '🎬 Movie'}
                      </span>
                      <span className="search-card-provider">{m.provider}</span>
                    </div>

                    {/* Synopsis / Plot */}
                    {m.overview ? (
                      <p className="search-card-overview">
                        {m.overview}
                      </p>
                    ) : (
                      <p className="search-card-overview empty">
                        No synopsis available
                      </p>
                    )}

                    <div className="search-card-select-btn">
                      Select this title →
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Custom title fallback option */}
        {query.trim().length >= 2 && (
          <div className="search-overlay-custom-box">
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 8px' }}>
              Can't find the exact match or want to use your own custom title?
            </p>
            <button
              onClick={() => {
                onCustomTitle?.(query.trim());
                onClose();
              }}
              className="search-overlay-custom-btn"
            >
              Use "<strong>{query.trim()}</strong>" as custom title
            </button>
          </div>
        )}

        {/* Initial Prompt when no search query */}
        {!hasSearched && query.trim().length < 2 && (
          <div className="search-overlay-initial">
            <div style={{ fontSize: 56, marginBottom: 12 }}>🎬</div>
            <h3 style={{ fontFamily: 'var(--font-brand)', color: 'var(--yellow)', margin: '0 0 8px', fontSize: 20 }}>
              Search Any Movie or TV Show
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 320, margin: 0, lineHeight: 1.5 }}>
              Type the title to view high-res posters, release years, and plot summaries to pick the right one.
            </p>
          </div>
        )}

        {/* No results found */}
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

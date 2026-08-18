import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { api, type Movie } from '../api/client';
import { MovieCard } from '../components/MovieCard';
import { TvShowCard } from '../components/TvShowCard';
import { SearchBar } from '../components/SearchBar';
import { AddMovieModal } from '../components/AddMovieModal';
import { ImportModal } from '../components/ImportModal';
import { EmptyState } from '../components/EmptyState';
import { NeonMarqueeCelebration } from '../components/NeonMarqueeCelebration';
import { Settings as SettingsIcon, User, MoreVertical, ChevronUp } from 'lucide-react';

type Mode = 'ALONE' | 'US';

interface Entry {
  movie: Movie;
  source: Mode;
}

interface TvGroup {
  showTitle: string;
  seasons: Movie[];
  source: Mode;
}

export function HomePage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(user?.defaultMode ?? 'ALONE');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'WATCHING' | 'FINISHED' | 'PLANNED'>('ALL');
  const [mediaTab, setMediaTab] = useState<'ALL' | 'MOVIES' | 'TV'>('ALL');
  const [showMenu, setShowMenu] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [celebration, setCelebration] = useState<{ active: boolean; type: 'first_movie' | 'import'; count?: number }>({
    active: false,
    type: 'first_movie',
  });

  const touchStartX = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) setNotice(null);
    touchStartX.current = null;
  }

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
      setIsScrolled(window.scrollY > 125);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const otherMode: Mode = mode === 'ALONE' ? 'US' : 'ALONE';
  const hasSearch = search.trim().length > 0;

  const query = useQuery({ queryKey: ['movies', mode], queryFn: () => api.listMovies(mode) });
  const otherQuery = useQuery({
    queryKey: ['movies', otherMode],
    queryFn: () => api.listMovies(otherMode),
    enabled: hasSearch,
  });

  const movies = query.data?.movies ?? [];
  const otherMovies = otherQuery.data?.movies ?? [];

  // Movie rankings: Latest watched/added strictly on top (latest to oldest)
  const entries = useMemo<Entry[]>(() => {
    const q = search.trim().toLowerCase();
    let all: Entry[] = [
      ...movies.map((movie) => ({ movie, source: mode })),
      ...(hasSearch ? otherMovies.map((movie) => ({ movie, source: otherMode })) : []),
    ];

    if (q) {
      all = all.filter(({ movie }) =>
        movie.title.toLowerCase().includes(q) ||
        (movie.showTitle && movie.showTitle.toLowerCase().includes(q))
      );
    }

    // Sort from latest to oldest:
    // 1. Primary: watchedDate or plannedDate or createdAt timestamp descending
    // 2. Secondary: createdAt timestamp descending as tiebreaker
    return all.sort((a, b) => {
      const dateA = new Date(a.movie.watchedDate || a.movie.plannedDate || a.movie.createdAt).getTime();
      const dateB = new Date(b.movie.watchedDate || b.movie.plannedDate || b.movie.createdAt).getTime();
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      const createdA = new Date(a.movie.createdAt).getTime();
      const createdB = new Date(b.movie.createdAt).getTime();
      return createdB - createdA;
    });
  }, [search, movies, otherMovies, mode, otherMode, hasSearch]);

  const isEmpty = !query.isLoading && !otherQuery.isLoading && entries.length === 0 && !hasSearch;

  function flash(message: string) {
    setNotice({ kind: 'success', text: message });
    window.setTimeout(() => setNotice(null), 3000);
  }

  function showError(message: string) {
    setNotice({ kind: 'error', text: message });
    window.setTimeout(() => {
      setNotice((prev) => (prev?.kind === 'error' && prev.text === message ? null : prev));
    }, 5000);
  }

  function handleMovieAdded() {
    const isFirst = movies.length === 0;
    if (isFirst) {
      setCelebration({ active: true, type: 'first_movie' });
      flash('First entry added to your diary! 🎬✨');
    } else {
      flash('Added to your diary!');
    }
  }

  function handleImported(imported: Movie[]) {
    setHighlighted(new Set(imported.map((m) => m.id)));
    setCelebration({ active: true, type: 'import', count: imported.length });
    flash(`Imported ${imported.length} movie${imported.length === 1 ? '' : 's'} successfully! ✨`);
    window.setTimeout(() => setHighlighted(new Set()), 5000);
  }

  async function downloadPdf() {
    try {
      await api.downloadPdf(mode);
    } catch {
      showError('Could not export the PDF. Try again.');
    }
  }

  const settingsRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent | TouchEvent) {
      if (showSettings && settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
      if (showMenu && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }

    if (showSettings || showMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showSettings, showMenu]);

  // Split into Movies and TV shows
  const movieEntries = useMemo(() => entries.filter((e) => e.movie.mediaType !== 'tv'), [entries]);
  const tvEntries = useMemo(() => entries.filter((e) => e.movie.mediaType === 'tv'), [entries]);

  // Group TV shows by showTitle
  const tvGroups = useMemo<TvGroup[]>(() => {
    const groupsMap = new Map<string, { showTitle: string; seasons: Movie[]; source: Mode }>();
    for (const entry of tvEntries) {
      const key = (entry.movie.showTitle || entry.movie.title).trim();
      const existing = groupsMap.get(key);
      if (existing) {
        existing.seasons.push(entry.movie);
      } else {
        groupsMap.set(key, {
          showTitle: entry.movie.showTitle || entry.movie.title,
          seasons: [entry.movie],
          source: entry.source,
        });
      }
    }
    return Array.from(groupsMap.values());
  }, [tvEntries]);

  // Filtered lists according to watchStatus
  const filteredMovieEntries = useMemo(() => {
    if (filter === 'ALL') return movieEntries;
    return movieEntries.filter((e) => e.movie.watchStatus === filter);
  }, [movieEntries, filter]);

  const filteredTvGroups = useMemo(() => {
    if (filter === 'ALL') return tvGroups;
    return tvGroups
      .map((g) => ({
        ...g,
        seasons: g.seasons.filter((s) => s.watchStatus === filter),
      }))
      .filter((g) => g.seasons.length > 0);
  }, [tvGroups, filter]);

  // Status counts for filters
  const watchingCount = useMemo(() => entries.filter((e) => e.movie.watchStatus === 'WATCHING').length, [entries]);
  const finishedCount = useMemo(() => entries.filter((e) => e.movie.watchStatus === 'FINISHED').length, [entries]);
  const plannedCount = useMemo(() => entries.filter((e) => e.movie.watchStatus === 'PLANNED').length, [entries]);

  const activeCategoriesCount = [watchingCount > 0, finishedCount > 0, plannedCount > 0].filter(Boolean).length;

  useEffect(() => {
    if (filter === 'WATCHING' && watchingCount === 0) setFilter('ALL');
    if (filter === 'FINISHED' && finishedCount === 0) setFilter('ALL');
    if (filter === 'PLANNED' && plannedCount === 0) setFilter('ALL');
  }, [filter, watchingCount, finishedCount, plannedCount]);

  const totalVisibleItems =
    (mediaTab === 'TV' ? 0 : filteredMovieEntries.length) +
    (mediaTab === 'MOVIES' ? 0 : filteredTvGroups.reduce((acc, g) => acc + g.seasons.length, 0));

  const showMoviesSection = (mediaTab === 'ALL' || mediaTab === 'MOVIES') && filteredMovieEntries.length > 0;
  const showTvSection = (mediaTab === 'ALL' || mediaTab === 'TV') && filteredTvGroups.length > 0;

  return (
    <div className="page" style={{ paddingBottom: '80px' }}>
      <header className="topbar" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '16px 0', marginBottom: '-16px' }}>
        <button aria-label="Profile" onClick={() => navigate('/profile')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', padding: 0, borderRadius: '50%', background: 'transparent', border: '2px solid var(--muted)', color: 'var(--text)' }}>
          <User size={24} />
        </button>
        <div className={`logo-container ${celebration.active ? 'marquee-neon-glowing' : ''}`} style={{ flex: 1, display: 'flex', justifyContent: 'center', transform: 'translateY(-15px)' }}>
          <img src="/home-logo.png" alt="Movie Diary" style={{
            width: '100%',
            height: 'auto',
          }} />
        </div>
        <div ref={settingsRef} style={{ position: 'relative', zIndex: showSettings ? 110 : 'auto' }}>
          <button
            onClick={() => {
              setShowMenu(false);
              setShowSettings(!showSettings);
            }}
            aria-label="Settings"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', padding: 0, borderRadius: '16px', background: showSettings ? 'var(--pink)' : 'transparent', border: showSettings ? '2px solid var(--pink)' : '2px solid var(--muted)', color: showSettings ? '#1a1033' : 'var(--text)' }}
          >
            <SettingsIcon size={24} />
          </button>
          {showSettings && (
            <div style={{
              position: 'absolute', right: 0, top: '100%', marginTop: '8px',
              background: 'var(--bg-2)', border: '2px solid var(--muted)',
              borderRadius: '8px', padding: '12px', zIndex: 120,
              display: 'flex', flexDirection: 'column', gap: '12px',
              minWidth: '240px', boxShadow: 'var(--shadow)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ margin: 0, color: 'var(--cyan)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Diary Mode
                </label>
                <div className="mode-toggle" style={{ margin: 0, display: 'flex' }}>
                  <button style={{ flex: 1 }} className={mode === 'ALONE' ? 'active' : ''} onClick={() => { setMode('ALONE'); setShowSettings(false); }}>Alone</button>
                  <button style={{ flex: 1 }} className={mode === 'US' ? 'active' : ''} onClick={() => { setMode('US'); setShowSettings(false); }}>US</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Sticky Search & Menu Row */}
      <div className="search-row" style={{
        position: 'sticky',
        top: '-1px',
        zIndex: showMenu ? 120 : 90,
        paddingTop: '16px',
        paddingBottom: '8px',
        paddingLeft: '16px',
        paddingRight: '16px',
        margin: '0 -16px 0px -16px',
        gap: '11px',
        background: isScrolled ? 'rgba(26, 16, 51, 0.95)' : 'transparent',
        backdropFilter: isScrolled ? 'blur(8px)' : 'none',
        transition: 'background 0.2s ease, backdrop-filter 0.2s ease',
      }}>
        <div style={{ flex: 1, marginTop: '3px' }}>
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <div style={{ display: isScrolled ? 'none' : 'flex', gap: '12px' }}>
          <div ref={menuRef} style={{ position: 'relative', zIndex: showMenu ? 130 : 'auto' }}>
            <button
              onClick={() => {
                setShowSettings(false);
                setShowMenu(!showMenu);
              }}
              aria-label="Menu"
              className={isEmpty ? 'empty-cta-pulse' : ''}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', padding: 0, borderRadius: '16px', background: showMenu ? 'var(--pink)' : 'transparent', color: showMenu ? '#1a1033' : 'var(--text)', border: showMenu ? '2px solid var(--pink)' : '2px solid var(--muted)' }}
            >
              <MoreVertical size={20} />
            </button>
            {showMenu && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: '8px',
                background: 'var(--bg-2)', border: '2px solid var(--muted)',
                borderRadius: '8px', padding: '12px', zIndex: 140,
                display: 'flex', flexDirection: 'column', gap: '8px',
                minWidth: '160px', boxShadow: 'var(--shadow)',
              }}>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowImport(true);
                  }}
                  style={{ width: '100%', textAlign: 'left' }}
                >
                  Import 📥
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    downloadPdf();
                  }}
                  style={{ width: '100%', textAlign: 'left' }}
                >
                  Export PDF 📄
                </button>
                <button
                  className="danger"
                  onClick={() => {
                    setShowMenu(false);
                    logout();
                  }}
                  style={{ width: '100%' }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Media Type Category Filter (Movies / TV Shows) */}
      {entries.length > 0 && tvEntries.length > 0 && movieEntries.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '8px',
          margin: '10px 0 2px',
          background: 'rgba(0,0,0,0.2)',
          padding: '4px',
          borderRadius: '10px',
        }}>
          <button
            className={mediaTab === 'ALL' ? 'primary' : ''}
            onClick={() => setMediaTab('ALL')}
            style={{ flex: 1, fontSize: '13px', padding: '6px 10px' }}
          >
            All Media ({entries.length})
          </button>
          <button
            className={mediaTab === 'MOVIES' ? 'primary' : ''}
            onClick={() => setMediaTab('MOVIES')}
            style={{ flex: 1, fontSize: '13px', padding: '6px 10px' }}
          >
            🎬 Movies ({movieEntries.length})
          </button>
          <button
            className={mediaTab === 'TV' ? 'primary' : ''}
            onClick={() => setMediaTab('TV')}
            style={{ flex: 1, fontSize: '13px', padding: '6px 10px' }}
          >
            📺 TV Shows ({tvGroups.length})
          </button>
        </div>
      )}

      {/* Status Filter Options Bar */}
      {entries.length > 0 && activeCategoriesCount > 1 && (
        <div style={{
          display: 'flex',
          gap: '8px',
          margin: '8px 0 6px',
          overflowX: 'auto',
          paddingBottom: '4px',
          scrollbarWidth: 'none',
        }}>
          <button
            className={filter === 'ALL' ? 'primary' : ''}
            onClick={() => setFilter('ALL')}
            style={{ fontSize: '13px', padding: '6px 14px', flexShrink: 0 }}
          >
            All ({entries.length})
          </button>
          {watchingCount > 0 && (
            <button
              className={filter === 'WATCHING' ? 'primary' : ''}
              onClick={() => setFilter('WATCHING')}
              style={{ fontSize: '13px', padding: '6px 14px', flexShrink: 0 }}
            >
              Watching ({watchingCount})
            </button>
          )}
          {finishedCount > 0 && (
            <button
              className={filter === 'FINISHED' ? 'primary' : ''}
              onClick={() => setFilter('FINISHED')}
              style={{ fontSize: '13px', padding: '6px 14px', flexShrink: 0 }}
            >
              Finished ({finishedCount})
            </button>
          )}
          {plannedCount > 0 && (
            <button
              className={filter === 'PLANNED' ? 'primary' : ''}
              onClick={() => setFilter('PLANNED')}
              style={{ fontSize: '13px', padding: '6px 14px', flexShrink: 0 }}
            >
              Planned ({plannedCount})
            </button>
          )}
        </div>
      )}

      {(notice || (!query.isLoading && !otherQuery.isLoading && entries.length === 0)) && (
        <div className="notice-area">
          {notice && (
            <div
              className={`notice ${notice.kind}`}
              onClick={() => setNotice(null)}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              style={{ cursor: 'pointer', touchAction: 'pan-y' }}
            >
              {notice.text}
            </div>
          )}
          {!query.isLoading && !otherQuery.isLoading && entries.length === 0 && (
            <EmptyState hasSearch={hasSearch} />
          )}
        </div>
      )}

      {/* Main Content Area */}
      {entries.length > 0 && (
        <main style={{ marginTop: '12px' }}>
          {/* TV Shows Section */}
          {showTvSection && (
            <section style={{ marginBottom: '24px' }}>
              <div style={{
                borderBottom: '2px dashed var(--cyan)',
                paddingBottom: '4px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
              }}>
                <h2 style={{ color: 'var(--cyan)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  📺 TV Shows &amp; Web Series
                </h2>
                <span style={{ color: 'var(--muted)', fontSize: '14px', fontWeight: 'bold' }}>
                  {filteredTvGroups.length} show{filteredTvGroups.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="grid" style={{ paddingTop: 0 }}>
                {filteredTvGroups.map((group) => (
                  <TvShowCard
                    key={group.showTitle}
                    showTitle={group.showTitle}
                    seasons={group.seasons}
                    mode={group.source}
                    highlightedIds={highlighted}
                    onChanged={(msg) => {
                      queryClient.invalidateQueries({ queryKey: ['movies'] });
                      flash(msg);
                    }}
                    onError={showError}
                    isSelecting={isSelecting}
                    selectedIds={selectedIds}
                    onToggleSelect={(id) => {
                      const next = new Set(selectedIds);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      setSelectedIds(next);
                    }}
                    onLongPress={(id) => {
                      setIsSelecting(true);
                      setSelectedIds(new Set([id]));
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Movies Section */}
          {showMoviesSection && (
            <section>
              <div style={{
                borderBottom: '2px dashed var(--yellow)',
                paddingBottom: '4px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
              }}>
                <h2 style={{ color: 'var(--yellow)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  🎬 Movies
                </h2>
                <span style={{ color: 'var(--muted)', fontSize: '14px', fontWeight: 'bold' }}>
                  {filteredMovieEntries.length}
                </span>
              </div>

              <div className="grid" style={{ paddingTop: 0 }}>
                {filteredMovieEntries.map(({ movie, source }) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    mode={source}
                    highlighted={highlighted.has(movie.id)}
                    onChanged={(msg) => {
                      queryClient.invalidateQueries({ queryKey: ['movies'] });
                      flash(msg);
                    }}
                    onError={showError}
                    isSelecting={isSelecting}
                    isSelected={selectedIds.has(movie.id)}
                    onLongPress={() => {
                      setIsSelecting(true);
                      setSelectedIds(new Set([movie.id]));
                    }}
                    onToggleSelect={() => {
                      const next = new Set(selectedIds);
                      if (next.has(movie.id)) next.delete(movie.id);
                      else next.add(movie.id);
                      setSelectedIds(next);
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {totalVisibleItems === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted)' }}>
              <p style={{ fontSize: 16 }}>No items matching the selected filters.</p>
            </div>
          )}
        </main>
      )}

      {/* Add Button */}
      {!isSelecting && (
        <button
          className={`primary ${isEmpty ? 'empty-cta-pulse' : ''}`}
          onClick={() => setShowAdd(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            borderRadius: '30px',
            padding: '14px 28px',
            fontSize: '18px',
            boxShadow: '0 6px 0 rgb(7, 0, 0)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#070000',
          }}
        >
          <span style={{ fontSize: '24px', lineHeight: '20px' }}>+</span> Add to Diary
        </button>
      )}

      {/* Multi-Select Toolbar */}
      {isSelecting && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--bg-2)',
          borderTop: '2px solid var(--muted)',
          padding: '16px',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 -4px 10px rgba(0,0,0,0.5)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--cyan)', fontWeight: 'bold' }}>
              {selectedIds.size} item{selectedIds.size === 1 ? '' : 's'} selected
            </span>
            <button
              className="mini-btn"
              onClick={() => {
                if (selectedIds.size === entries.length) setSelectedIds(new Set());
                else setSelectedIds(new Set(entries.map((e) => e.movie.id)));
              }}
            >
              {selectedIds.size === entries.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              style={{ flex: 1 }}
              onClick={() => {
                setIsSelecting(false);
                setSelectedIds(new Set());
                setConfirmBulkDelete(false);
              }}
            >
              Cancel
            </button>
            <button
              className="danger"
              style={{ flex: 1 }}
              disabled={selectedIds.size === 0 || isDeleting}
              onClick={() => setConfirmBulkDelete(true)}
            >
              {isDeleting ? 'Deleting...' : `Delete (${selectedIds.size})`}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Bulk Delete */}
      {confirmBulkDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmBulkDelete(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <h3 style={{ color: 'var(--yellow)', marginBottom: '8px' }}>
              Delete {selectedIds.size} item{selectedIds.size === 1 ? '' : 's'}?
            </h3>
            <p style={{ color: 'var(--muted)', marginBottom: '20px', fontSize: '14px' }}>
              Are you sure you want to delete the selected items? This cannot be undone.
            </p>
            <div className="modal-actions" style={{ display: 'flex', gap: '8px' }}>
              <button
                style={{ flex: 1 }}
                onClick={() => {
                  setConfirmBulkDelete(false);
                  setIsSelecting(false);
                  setSelectedIds(new Set());
                }}
              >
                No
              </button>
              <button
                className="danger"
                style={{ flex: 1 }}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    const idsToDelete = Array.from(selectedIds);
                    for (const id of idsToDelete) {
                      await api.deleteMovie(mode, id);
                    }
                    queryClient.invalidateQueries({ queryKey: ['movies'] });
                    flash(`Deleted ${idsToDelete.length} item${idsToDelete.length === 1 ? '' : 's'}!`);
                  } catch (err) {
                    showError(err instanceof Error ? err.message : 'Could not delete items');
                  } finally {
                    setIsDeleting(false);
                    setIsSelecting(false);
                    setSelectedIds(new Set());
                    setConfirmBulkDelete(false);
                  }
                }}
              >
                Yes, Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '16px',
            zIndex: 40,
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 0 rgba(0,0,0,0.5)',
            background: 'var(--card)',
            color: 'var(--text)',
            padding: 0,
          }}
          aria-label="Scroll to top"
        >
          <ChevronUp size={28} />
        </button>
      )}

      {showAdd && (
        <AddMovieModal mode={mode} onClose={() => setShowAdd(false)} onAdded={handleMovieAdded} onError={showError} />
      )}
      {showImport && (
        <ImportModal mode={mode} onClose={() => setShowImport(false)} onImported={handleImported} onError={showError} />
      )}

      {/* Neon Marquee Celebration & Warm Star Sparkles */}
      <NeonMarqueeCelebration
        active={celebration.active}
        type={celebration.type}
        count={celebration.count}
        onDone={() => setCelebration((prev) => ({ ...prev, active: false }))}
      />
    </div>
  );
}

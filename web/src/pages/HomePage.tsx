import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { api, type Movie, type Mode } from '../api/client';
import { MovieCard } from '../components/MovieCard';
import { TvShowCard } from '../components/TvShowCard';
import { SearchBar } from '../components/SearchBar';
import { AddMovieModal } from '../components/AddMovieModal';
import { ImportModal } from '../components/ImportModal';
import { EmptyState } from '../components/EmptyState';
import { NeonMarqueeCelebration } from '../components/NeonMarqueeCelebration';
import { Settings as SettingsIcon, User, MoreVertical, ChevronUp } from 'lucide-react';

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
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'WATCHING' | 'FINISHED' | 'PLANNED'>('ALL');
  const [mediaTab, setMediaTab] = useState<'ALL' | 'MOVIES' | 'TV'>('ALL');
  const [showMenu, setShowMenu] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [celebration, setCelebration] = useState<{ active: boolean; type: 'first_movie' | 'import'; count?: number }>({
    active: false,
    type: 'first_movie',
  });

  const person1 = user?.person1Name || 'Me';
  const person2 = user?.person2Name || 'Partner';
  const getModeLabel = (m: Mode) => (m === 'ALONE' ? person1 : m === 'PARTNER' ? person2 : 'US');

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

  const hasSearch = search.trim().length > 0;

  // Query strictly for the active profile mode
  const query = useQuery({ queryKey: ['movies', mode], queryFn: () => api.listMovies(mode) });
  const movies = query.data?.movies ?? [];

  // Movie rankings: Latest watched/added strictly on top (latest to oldest)
  // Scoped STRICTLY to current profile (no cross-profile search results)
  const entries = useMemo<Entry[]>(() => {
    const q = search.trim().toLowerCase();
    let all: Entry[] = movies.map((movie) => ({ movie, source: mode }));

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
  }, [search, movies, mode]);

  const isEmpty = !query.isLoading && entries.length === 0 && !hasSearch;

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

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent | TouchEvent) {
      if (showProfileMenu && profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (showMenu && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }

    if (showProfileMenu || showMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showProfileMenu, showMenu]);

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
    <div className="page">
      <header className="topbar">
        {/* Left: Mobile Settings Button (hidden on desktop) */}
        <div className="header-group-left mobile-header-btn">
          <button
            onClick={() => navigate('/profile')}
            aria-label="Settings"
            className="header-icon-btn"
            title="Settings"
          >
            <SettingsIcon size={22} />
          </button>
        </div>

        {/* Center: Movie Diary marquee logo */}
        <div className={`logo-container ${celebration.active ? 'marquee-neon-glowing' : ''}`}>
          <img src="/home-logo.png" alt="Movie Diary" className="header-logo-img" />
        </div>

        {/* Right: Mobile Profile Switcher (hidden on desktop) */}
        <div className="header-group-right mobile-header-btn">
          <div ref={profileRef} style={{ position: 'relative' }}>
            <button
              aria-label="Diary Profile"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className={`header-icon-btn ${showProfileMenu ? 'active' : ''}`}
              title={`Diary Profile: ${getModeLabel(mode)}`}
            >
              <User size={22} />
            </button>
            {/* Mobile Profile Switcher Popover */}
            {showProfileMenu && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: '8px',
                background: 'var(--bg-2)', border: '2px solid var(--muted)',
                borderRadius: '12px', padding: '12px', zIndex: 140,
                display: 'flex', flexDirection: 'column', gap: '8px',
                minWidth: '220px', boxShadow: 'var(--shadow)',
              }}>
                <label style={{ margin: 0, color: 'var(--cyan)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Diary Profile
                </label>
                <div className="mode-toggle" style={{ margin: 0, display: 'flex' }}>
                  <button style={{ flex: 1 }} className={mode === 'ALONE' ? 'active' : ''} onClick={() => { setMode('ALONE'); setShowProfileMenu(false); }}>{person1}</button>
                  <button style={{ flex: 1 }} className={mode === 'PARTNER' ? 'active' : ''} onClick={() => { setMode('PARTNER'); setShowProfileMenu(false); }}>{person2}</button>
                  <button style={{ flex: 1 }} className={mode === 'US' ? 'active' : ''} onClick={() => { setMode('US'); setShowProfileMenu(false); }}>US</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sticky Search & Toolbar Row */}
      <div className={`search-row ${isScrolled ? 'scrolled' : ''}`} style={{ zIndex: showMenu ? 120 : 90 }}>
        {/* Desktop Mode Switcher Pills (inline on the left of search bar) */}
        <div className="desktop-mode-toggle mode-toggle">
          <button className={mode === 'ALONE' ? 'active' : ''} onClick={() => setMode('ALONE')}>{person1}</button>
          <button className={mode === 'PARTNER' ? 'active' : ''} onClick={() => setMode('PARTNER')}>{person2}</button>
          <button className={mode === 'US' ? 'active' : ''} onClick={() => setMode('US')}>US</button>
        </div>

        <div className="search-row-input">
          <SearchBar value={search} placeholder={`Search ${getModeLabel(mode)}'s diary…`} onChange={setSearch} />
        </div>

        {/* Desktop Direct Action Buttons */}
        <div className="desktop-actions">
          <button className={`desktop-add-btn primary ${isEmpty ? 'empty-cta-pulse' : ''}`} onClick={() => setShowAdd(true)}>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>+</span> Add to Diary
          </button>
          <button className="desktop-action-btn" onClick={() => setShowImport(true)}>
            Import 📥
          </button>
          <button className="desktop-action-btn" onClick={downloadPdf}>
            Export PDF 📄
          </button>
          <button className="desktop-action-btn" onClick={() => navigate('/profile')} title="Settings & Profiles">
            Settings ⚙️
          </button>
        </div>

        {/* Mobile 3-dot Menu (Only rendered on mobile screens via CSS) */}
        <div className="mobile-menu-btn">
          <div ref={menuRef} style={{ position: 'relative', zIndex: showMenu ? 130 : 'auto' }}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              aria-label="Menu"
              className={`header-icon-btn ${showMenu ? 'active' : ''} ${isEmpty ? 'empty-cta-pulse' : ''}`}
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
        <div className="media-filter-bar">
          <button
            className={`media-filter-btn ${mediaTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setMediaTab('ALL')}
          >
            All Media ({entries.length})
          </button>
          <button
            className={`media-filter-btn ${mediaTab === 'MOVIES' ? 'active' : ''}`}
            onClick={() => setMediaTab('MOVIES')}
          >
            🎬 Movies ({movieEntries.length})
          </button>
          <button
            className={`media-filter-btn ${mediaTab === 'TV' ? 'active' : ''}`}
            onClick={() => setMediaTab('TV')}
          >
            📺 TV Shows ({tvGroups.length})
          </button>
        </div>
      )}

      {/* Status Filter Options Bar */}
      {entries.length > 0 && activeCategoriesCount > 1 && (
        <div className="status-filter-bar">
          <button
            className={`status-filter-btn ${filter === 'ALL' ? 'primary' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            All ({entries.length})
          </button>
          {watchingCount > 0 && (
            <button
              className={`status-filter-btn ${filter === 'WATCHING' ? 'primary' : ''}`}
              onClick={() => setFilter('WATCHING')}
            >
              Watching ({watchingCount})
            </button>
          )}
          {finishedCount > 0 && (
            <button
              className={`status-filter-btn ${filter === 'FINISHED' ? 'primary' : ''}`}
              onClick={() => setFilter('FINISHED')}
            >
              Finished ({finishedCount})
            </button>
          )}
          {plannedCount > 0 && (
            <button
              className={`status-filter-btn ${filter === 'PLANNED' ? 'primary' : ''}`}
              onClick={() => setFilter('PLANNED')}
            >
              Planned ({plannedCount})
            </button>
          )}
        </div>
      )}

      {(notice || (!query.isLoading && entries.length === 0)) && (
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
          {!query.isLoading && entries.length === 0 && (
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

      {/* Floating Add Button */}
      <button
        className={`fab-add-button ${isEmpty ? 'empty-cta-pulse' : ''}`}
        onClick={() => setShowAdd(true)}
        aria-label="Add to Diary"
      >
        <span className="plus-icon">+</span> Add to Diary
      </button>

      {showScrollTop && (
        <button
          className="scroll-to-top-btn"
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          <ChevronUp size={24} />
        </button>
      )}

      {showAdd && (
        <AddMovieModal mode={mode} modeLabel={getModeLabel(mode)} onClose={() => setShowAdd(false)} onAdded={handleMovieAdded} onError={showError} />
      )}
      {showImport && (
        <ImportModal mode={mode} modeLabel={getModeLabel(mode)} onClose={() => setShowImport(false)} onImported={handleImported} onError={showError} />
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

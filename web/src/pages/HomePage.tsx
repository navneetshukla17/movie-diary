import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { api, type Movie } from '../api/client';
import { ModeToggle } from '../components/ModeToggle';
import { MovieCard } from '../components/MovieCard';
import { SearchBar } from '../components/SearchBar';
import { AddMovieModal } from '../components/AddMovieModal';
import { ImportModal } from '../components/ImportModal';

type Mode = 'ALONE' | 'US';

interface Entry {
  movie: Movie;
  source: Mode;
}

export function HomePage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>(user?.defaultMode ?? 'ALONE');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

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

  const entries = useMemo<Entry[]>(() => {
    const q = search.trim().toLowerCase();
    const all: Entry[] = [
      ...movies.map((movie) => ({ movie, source: mode })),
      ...(hasSearch ? otherMovies.map((movie) => ({ movie, source: otherMode })) : []),
    ];
    if (!q) return all;
    return all.filter(({ movie }) => movie.title.toLowerCase().includes(q));
  }, [search, movies, otherMovies, mode, otherMode, hasSearch]);

  function flash(message: string) {
    setNotice({ kind: 'success', text: message });
    window.setTimeout(() => setNotice(null), 3000);
  }

  function showError(message: string) {
    setNotice({ kind: 'error', text: message });
  }

  function handleImported(imported: Movie[]) {
    setHighlighted(new Set(imported.map((m) => m.id)));
    window.setTimeout(() => setHighlighted(new Set()), 5000);
  }

  async function downloadPdf() {
    try {
      await api.downloadPdf(mode);
    } catch {
      showError('Could not export the PDF. Try again.');
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <h1 className="logo">my movies</h1>
        <ModeToggle mode={mode} onChange={setMode} />
        <div className="topbar-right">
          <button className="primary" onClick={() => setShowAdd(true)}>+ Add</button>
          <button onClick={() => setShowImport(true)}>Import</button>
          <button onClick={downloadPdf}>Export PDF</button>
          <button onClick={logout}>Logout ({user?.email})</button>
        </div>
      </header>

      <div className="notice-area">
        {notice && <div className={`notice ${notice.kind}`}>{notice.text}</div>}
        {!query.isLoading && entries.length === 0 && (
          <div className="no-results">
            {hasSearch ? 'No movies found for that search' : 'No movies yet — add or import some!'}
          </div>
        )}
      </div>

      <SearchBar value={search} onChange={setSearch} />

      <main className="grid">
        {entries.map(({ movie, source }) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            mode={source}
            highlighted={highlighted.has(movie.id)}
            onChanged={() => {
              queryClient.invalidateQueries({ queryKey: ['movies'] });
              flash('Updated');
            }}
            onError={showError}
          />
        ))}
      </main>

      {showAdd && (
        <AddMovieModal mode={mode} onClose={() => setShowAdd(false)} onAdded={() => flash('Added to your list!')} onError={showError} />
      )}
      {showImport && (
        <ImportModal mode={mode} onClose={() => setShowImport(false)} onImported={handleImported} onError={showError} />
      )}
    </div>
  );
}

export type Mode = 'ALONE' | 'PARTNER' | 'US';

export interface User {
  id: string;
  email: string;
  defaultMode: Mode;
  person1Name: string;
  person2Name: string;
}

export interface Movie {
  id: string;
  title: string;
  watchedDate: string | null;
  plannedDate: string | null;
  personalRating: number | null;
  review: string | null;
  watchStatus: 'PLANNED' | 'WATCHING' | 'FINISHED';
  posterUrl: string | null;
  releaseDate: string | null;
  providerRatings: Record<string, number> | null;
  metadataProvider: 'TMDB' | 'OMDB' | 'IMPORT' | 'MANUAL' | null;
  imported: boolean;
  // TV show fields
  mediaType: 'movie' | 'tv' | null;
  seasonNumber: number | null;
  episodeProgress: string | null;
  showTitle: string | null;
  showPosterUrl: string | null;
  tmdbId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MetadataResult {
  id: string;
  title: string;
  year: string | null;
  mediaType: 'movie' | 'tv';
  posterUrl: string | null;
  releaseDate: string | null;
  overview?: string | null;
  providerRatings: Record<string, number> | null;
  provider: 'TMDB' | 'OMDB' | 'IMPORT';
}

export interface TvSeason {
  seasonNumber: number;
  name: string;
  episodeCount: number | null;
  airDate: string | null;
  posterUrl: string | null;
}

// Extended metadata for TV show seasons — passed through the search overlay
export interface TvSeasonSelection extends MetadataResult {
  seasonNumber: number;
  seasonName: string;
  showTitle: string;
  showPosterUrl: string | null;
  tmdbId: string;
  selectedSeasons?: TvSeason[];
}

const TOKEN_KEY = 'movie_list_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...((options.headers as Record<string, string>) ?? {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api${path}`, { ...options, headers });
  if (!res.ok) {
    let message = 'Something went wrong';
    try {
      const body = await res.json();
      message = body.error?.message ?? message;
    } catch {
      /* keep default message */
    }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  signup: (email: string, password: string, defaultMode?: Mode, person1Name?: string, person2Name?: string) =>
    request<{ token: string; user: User }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, defaultMode, person1Name, person2Name }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: User }>('/auth/me'),
  updateProfile: (data: { defaultMode?: Mode; person1Name?: string; person2Name?: string }) =>
    request<{ token: string; user: User }>('/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),
  updateMe: (defaultMode: string) =>
    request<{ token: string; user: User }>('/auth/me', { method: 'PATCH', body: JSON.stringify({ defaultMode }) }),
  updatePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean }>('/auth/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  deleteAccount: () => request<{ success: boolean }>('/auth/account', { method: 'DELETE' }),
  listMovies: (mode: string) => request<{ movies: Movie[] }>(`/lists/${mode}/movies`),
  addMovie: (
    mode: string,
    body: {
      title: string;
      watchedDate: string | null;
      plannedDate?: string | null;
      personalRating: number | null;
      review?: string | null;
      watchStatus: string;
      metadata?: MetadataResult | null;
      // TV-specific
      mediaType?: 'movie' | 'tv' | null;
      seasonNumber?: number | null;
      episodeProgress?: string | null;
      showTitle?: string | null;
      showPosterUrl?: string | null;
      tmdbId?: string | null;
    },
  ) =>
    request<{ movie: Movie }>(`/lists/${mode}/movies`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateMovie: (
    mode: string,
    id: string,
    body: Partial<{
      title: string;
      watchedDate: string | null;
      plannedDate: string | null;
      personalRating: number | null;
      review: string | null;
      watchStatus: string;
      metadata?: MetadataResult | null;
      episodeProgress?: string | null;
    }>,
  ) =>
    request<{ movie: Movie }>(`/lists/${mode}/movies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteMovie: (mode: string, id: string) =>
    request<{ success: boolean }>(`/lists/${mode}/movies/${id}`, { method: 'DELETE' }),
  deleteMovies: (mode: string, ids: string[]) =>
    request<{ success: boolean }>(`/lists/${mode}/movies/delete-many`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  searchMetadata: (query: string) =>
    request<{ results: MetadataResult[] }>(`/metadata/search?query=${encodeURIComponent(query)}`),
  getTvSeasons: (tmdbId: string) =>
    request<{ seasons: TvSeason[] }>(`/metadata/tv-seasons?tmdbId=${encodeURIComponent(tmdbId)}`),
  fetchMetadata: (id: string) =>
    request<{ movie: Movie }>(`/movies/${id}/metadata`, { method: 'POST' }),
  fetchBulkMetadata: (ids: string[]) =>
    request<{ movies: Movie[] }>('/import/metadata', { method: 'POST', body: JSON.stringify({ ids }) }),
  importFile: (mode: string, file: File, watchStatus: 'PLANNED' | 'FINISHED') => {
    const form = new FormData();
    form.append('file', file);
    form.append('watchStatus', watchStatus);
    return request<{ movies: Movie[]; skippedLines: string[] }>(`/lists/${mode}/import`, {
      method: 'POST',
      body: form,
    });
  },
  downloadPdf: async (mode: string) => {
    const token = getToken();
    const res = await fetch(`/api/lists/${mode}/export/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mode.toLowerCase()}-list.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};

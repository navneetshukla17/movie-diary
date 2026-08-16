export interface User {
  id: string;
  email: string;
  defaultMode: 'ALONE' | 'US';
}

export interface Movie {
  id: string;
  title: string;
  watchedDate: string | null;
  personalRating: number | null;
  watchStatus: 'PLANNED' | 'WATCHING' | 'FINISHED';
  posterUrl: string | null;
  releaseDate: string | null;
  providerRatings: Record<string, number> | null;
  metadataProvider: 'TMDB' | 'OMDB' | 'IMPORT' | 'MANUAL' | null;
  imported: boolean;
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
  providerRatings: Record<string, number> | null;
  provider: 'TMDB' | 'OMDB';
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
  signup: (email: string, password: string, defaultMode: string) =>
    request<{ token: string; user: User }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, defaultMode }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: User }>('/auth/me'),
  updateMe: (defaultMode: string) =>
    request<{ user: User }>('/auth/me', { method: 'PATCH', body: JSON.stringify({ defaultMode }) }),
  listMovies: (mode: string) => request<{ movies: Movie[] }>(`/lists/${mode}/movies`),
  addMovie: (
    mode: string,
    body: {
      title: string;
      watchedDate: string | null;
      personalRating: number | null;
      watchStatus: string;
      metadata?: MetadataResult | null;
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
      personalRating: number | null;
      watchStatus: string;
    }>,
  ) =>
    request<{ movie: Movie }>(`/lists/${mode}/movies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteMovie: (mode: string, id: string) =>
    request<{ success: boolean }>(`/lists/${mode}/movies/${id}`, { method: 'DELETE' }),
  searchMetadata: (query: string) =>
    request<{ results: MetadataResult[] }>(`/metadata/search?query=${encodeURIComponent(query)}`),
  fetchMetadata: (id: string) =>
    request<{ movie: Movie }>(`/movies/${id}/metadata`, { method: 'POST' }),
  fetchBulkMetadata: (ids: string[]) =>
    request<{ movies: Movie[] }>('/import/metadata', { method: 'POST', body: JSON.stringify({ ids }) }),
  importFile: (mode: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
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
    URL.revokeObjectURL(url);
  },
};

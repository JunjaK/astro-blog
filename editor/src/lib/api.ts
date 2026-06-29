// Thin client for the editor backend (Hono) mounted at /editor-api.
// All content state lives server-side (RPi SQLite); no IndexedDB/local cache.
const BASE = '/editor-api';
const LOGIN_URL = `${import.meta.env.BASE_URL}login`; // '/editor/login'

function bounceToLogin() {
  if (!window.location.pathname.startsWith(LOGIN_URL)) window.location.assign(LOGIN_URL);
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'same-origin',
    headers: { 'X-Requested-With': 'XMLHttpRequest', ...init?.headers },
    ...init,
  });
  if (res.status === 401) { bounceToLogin(); throw new Error('unauthorized'); }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

// auth.* use raw fetch so their expected 401s don't trigger the global redirect.
export const auth = {
  me: async (): Promise<boolean> => {
    const res = await fetch(`${BASE}/auth/me`, { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    return res.ok;
  },
  login: async (password: string): Promise<boolean> => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ password }),
    });
    return res.ok;
  },
  logout: async (): Promise<void> => {
    await fetch(`${BASE}/auth/logout`, { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
  },
};

export interface HealthResponse {
  status: string;
  service: string;
  time: string;
}

export interface PostListItem {
  id: string;
  category: string;
  slug: string;
  title: string | null;
  source: string;
  created_at: string | null;
}

export interface PostDetail {
  id: string;
  category: string;
  title: string | null;
  source: string;
  raw: string; // full MDX (frontmatter + body)
}

export interface Frontmatter {
  title?: string;
  category?: string;
  created?: string;
  updated?: string;
  tags?: string[];
  thumbnail?: string;
  description?: string;
  artist?: string;
  album?: string;
  releaseYear?: number;
  appleMusicUrl?: string;
  youtubeMusicUrl?: string;
  [k: string]: unknown;
}

export interface DocResponse {
  frontmatter: Frontmatter;
  segments: {
    kind: 'md' | 'raw';
    src: string;
    node?: { name: string; attrs?: Record<string, string>; items?: { src: string; alt: string }[] };
  }[];
}

export const api = {
  health: () => req<HealthResponse>('/health'),
  posts: () => req<PostListItem[]>('/posts'),
  getPost: (id: string) => req<PostDetail>(`/posts/${id}`),
  getDoc: (id: string) => req<DocResponse>(`/doc/${id}`),
  savePost: (id: string, frontmatter: Frontmatter, body: string) =>
    req<{ ok: true }>(`/posts/${id}`, { method: 'PUT', body: JSON.stringify({ frontmatter, body }), headers: { 'Content-Type': 'application/json' } }),
  uploadMedia: async (file: File): Promise<{ src: string }> => {
    const fd = new FormData();
    fd.append('file', file);
    return req<{ src: string }>('/media', { method: 'POST', body: fd, headers: {} });
  },
  generate: (prompt: string) =>
    req<{ text: string }>('/generate', { method: 'POST', body: JSON.stringify({ prompt }), headers: { 'Content-Type': 'application/json' } }),
};

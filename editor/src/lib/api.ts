// Thin client for the editor backend (Hono) mounted at /editor-api.
// All content state lives server-side (RPi SQLite); no IndexedDB/local cache.
const BASE = '/editor-api';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'same-origin',
    headers: { 'X-Requested-With': 'XMLHttpRequest', ...init?.headers },
    ...init,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export interface HealthResponse {
  status: string;
  service: string;
  time: string;
}

export const api = {
  health: () => req<HealthResponse>('/health'),
  uploadMedia: async (file: File): Promise<{ src: string }> => {
    const fd = new FormData();
    fd.append('file', file);
    return req<{ src: string }>('/media', { method: 'POST', body: fd, headers: {} });
  },
  generate: (prompt: string) =>
    req<{ text: string }>('/generate', { method: 'POST', body: JSON.stringify({ prompt }), headers: { 'Content-Type': 'application/json' } }),
};

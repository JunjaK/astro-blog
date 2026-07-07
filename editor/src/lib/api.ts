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
  lyricsType?: LyricsKind;
  // ── tasting note (category: 'Tasting') — specs meaningful only when drinkKind==='nihonshu' ──
  drinkKind?: 'nihonshu' | 'whisky' | 'beer' | 'other';
  brand?: string; // 銘柄 (v1.1)
  yomigana?: string; // 술 이름 읽기 (히라가나)
  brandYomigana?: string; // 브랜드 읽기 (히라가나)
  brewery?: string;
  breweryYomigana?: string; // 양조장 읽기 (히라가나)
  tokuteiMeisho?: TokuteiMeisho;
  riceType?: string[];
  seimaiBuai?: number;
  alcohol?: number;
  nihonshuDo?: number;
  sando?: number;
  amakara?: number;
  noutan?: number;
  flavorTags?: string[];
  [k: string]: unknown;
}

// jpop: 원문(루비)+번역 · pop: 원문+번역 · kpop: 가사만
export type LyricsKind = 'jpop' | 'kpop' | 'pop';

// 特定名称 (등급 내림차순 — form/zod/type 동일 순서, Contract SSOT)
export type TokuteiMeisho =
  | '純米大吟醸' | '大吟醸' | '純米吟醸' | '吟醸'
  | '特別純米' | '特別本醸造' | '純米' | '本醸造' | '普通酒';

// 特定名称 상수 (FrontmatterForm/SakesPage 공유). union에서 파생 — 등급 추가/삭제 시
// TokuteiMeisho와 어긋나면 컴파일 실패(삼중 손유지 방지, Contract SSOT).
export const TOKUTEI_MEISHO = [
  '純米大吟醸', '大吟醸', '純米吟醸', '吟醸', '特別純米', '特別本醸造', '純米', '本醸造', '普通酒',
] as const satisfies readonly TokuteiMeisho[];

// autofill 결과 — 서버가 null/''/[] 키를 strip → present-or-absent (augment-only).
// drinkKind는 서버가 nihonshu 하드코딩 → 응답에 없음.
export type TastingAutofill = Partial<Pick<Frontmatter,
  'brand' | 'yomigana' | 'brandYomigana' | 'breweryYomigana'
  | 'brewery' | 'tokuteiMeisho' | 'riceType' | 'seimaiBuai' | 'alcohol'
  | 'nihonshuDo' | 'sando' | 'amakara' | 'noutan' | 'flavorTags'>>;

export interface DocResponse {
  frontmatter: Frontmatter;
  segments: {
    kind: 'md' | 'raw';
    src: string;
    node?: { name: string; attrs?: Record<string, string>; items?: { src: string; alt: string }[] };
  }[];
}

// Carries the numeric HTTP status so callers can branch on 502/503/504/500 — the shared
// req<T> collapses everything to a string message, which can't distinguish upstream states.
export class AutofillError extends Error {
  status: number;
  constructor(status: number, message?: string) {
    super(message ?? String(status));
    this.name = 'AutofillError';
    this.status = status;
  }
}

// AI autofill for a nihonshu tasting note. Own fetch (not req<T>) to expose the status.
// 401 reuses the global login bounce; other non-2xx throw an AutofillError with .status.
async function autofillTasting(query: string): Promise<TastingAutofill> {
  const res = await fetch(`${BASE}/generate/tasting`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify({ query }),
  });
  if (res.status === 401) { bounceToLogin(); throw new AutofillError(401, 'unauthorized'); }
  if (!res.ok) throw new AutofillError(res.status, `${res.status} ${res.statusText}`);
  return res.json() as Promise<TastingAutofill>;
}

// ── 사케/양조장 마스터 데이터 (editor 전용 SQLite, /editor-api/sake/*) — BE=SSOT ──
export interface Brewery {
  id: string;
  name: string;
  yomigana: string | null; // 양조장 읽기 (v1.1)
  region: string | null;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// GET 응답 (LEFT JOIN brewery 이름 + 서버가 riceType JSON.parse 완료).
export interface Sake {
  id: string;
  name: string;
  brand: string | null; // 銘柄 (v1.1)
  yomigana: string | null; // 술 이름 읽기 (v1.1)
  brandYomigana: string | null; // 브랜드 읽기 (v1.1)
  brewery: string | null; // 해석된 양조장 이름(표시용)
  breweryYomigana: string | null; // join된 양조장 읽기 (b.yomigana AS breweryYomigana)
  brewery_id: string | null;
  tokuteiMeisho: TokuteiMeisho | null;
  riceType: string[]; // 없으면 []
  seimaiBuai: number | null;
  alcohol: number | null;
  nihonshuDo: number | null;
  sando: number | null;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// POST(augment) / PUT(replace) 공용. brewery=이름(서버가 id 해석). `| null`로 PUT 명시 clear.
export interface SakeInput {
  name: string;
  brand?: string | null; // 銘柄 (v1.1)
  yomigana?: string | null; // 술 이름 읽기 (v1.1)
  brandYomigana?: string | null; // 브랜드 읽기 (v1.1)
  brewery?: string | null;
  breweryYomigana?: string | null; // 서버 resolveBreweryId가 브루어리 레코드에 반영 (v1.1)
  tokuteiMeisho?: TokuteiMeisho | null;
  riceType?: string[];
  seimaiBuai?: number | null;
  alcohol?: number | null;
  nihonshuDo?: number | null;
  sando?: number | null;
  note?: string | null;
}

export interface BreweryInput {
  name: string;
  yomigana?: string | null; // 양조장 읽기 (v1.1)
  region?: string | null;
  note?: string | null;
}

// Thrown by deleteBrewery on 409 "brewery in use". Carries the referencing sake count so the UI
// can show a blocking "N개 참조 중" message (mirrors the AutofillError .status idiom).
export class SakeRefError extends Error {
  status: number;
  count: number;
  constructor(count: number, message?: string) {
    super(message ?? 'brewery in use');
    this.name = 'SakeRefError';
    this.status = 409;
    this.count = count;
  }
}

// DELETE a brewery. Own fetch (not req<T>) to surface the 409 count as a SakeRefError.
// 401 reuses the global bounce; 409 → SakeRefError(count); other non-2xx → generic Error.
async function deleteBrewery(id: string): Promise<{ ok: true }> {
  const res = await fetch(`${BASE}/sake/breweries/${id}`, {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });
  if (res.status === 401) { bounceToLogin(); throw new Error('unauthorized'); }
  if (res.status === 409) {
    const body = await res.json() as { error: string; count: number };
    throw new SakeRefError(body.count);
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<{ ok: true }>;
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
  autofillTasting,
  // 사케/양조장 마스터 CRUD. q 생략 = 전량(관리 페이지), q 지정 = 서버 정규화+LIKE(콤보박스).
  searchSakes: (q?: string) => req<Sake[]>(`/sake/sakes${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  upsertSake: (input: SakeInput) =>
    req<{ sake: Sake; created: boolean }>('/sake/sakes', { method: 'POST', body: JSON.stringify(input), headers: { 'Content-Type': 'application/json' } }),
  updateSake: (id: string, input: SakeInput) =>
    req<{ ok: true }>(`/sake/sakes/${id}`, { method: 'PUT', body: JSON.stringify(input), headers: { 'Content-Type': 'application/json' } }),
  deleteSake: (id: string) => req<{ ok: true }>(`/sake/sakes/${id}`, { method: 'DELETE' }),
  searchBreweries: (q?: string) => req<Brewery[]>(`/sake/breweries${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  upsertBrewery: (input: BreweryInput) =>
    req<{ brewery: Brewery; created: boolean }>('/sake/breweries', { method: 'POST', body: JSON.stringify(input), headers: { 'Content-Type': 'application/json' } }),
  updateBrewery: (id: string, input: BreweryInput) =>
    req<{ ok: true }>(`/sake/breweries/${id}`, { method: 'PUT', body: JSON.stringify(input), headers: { 'Content-Type': 'application/json' } }),
  deleteBrewery,
};

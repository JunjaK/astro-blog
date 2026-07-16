// Thin client for the editor backend (Hono) mounted at /editor-api.
// All content state lives server-side (RPi SQLite); no IndexedDB/local cache.
//
// 都道府県 47개는 서버가 SSOT (server/prefectures.ts) — 시드 검증과 폼 셀렉트가 같은 배열을 본다.
// import + re-export (순수 re-export 는 이 파일 안에서 Prefecture 를 쓸 수 없다).
import { PREFECTURES, type Prefecture } from '../../server/prefectures';

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

// mirrors server/posts.ts SLUG_RE exactly (Contract SSOT) — FE gates canSave with the same regex so
// a normal user never trips the server's 400 'invalid slug', and doubles as the path-traversal guard.
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
  prefecture?: Prefecture; // 産地(도도부현, v1.2). 상세 주소는 마스터 전용 — 글엔 싣지 않는다
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
  | 'brewery' | 'prefecture' | 'tokuteiMeisho' | 'riceType' | 'seimaiBuai' | 'alcohol'
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

// Status + raw server error string — mirrors AutofillError's "own fetch to expose .status" idiom,
// but createPost's 400s aren't interchangeable ('invalid slug' needs different UI copy than
// 'invalid category'), so callers here need the actual body text, not just the status.
export class PostApiError extends Error {
  status: number;
  constructor(status: number, message?: string) {
    super(message ?? String(status));
    this.name = 'PostApiError';
    this.status = status;
  }
}

async function readErrorBody(res: Response): Promise<string | undefined> {
  const body = await res.json().catch(() => null) as { error?: string } | null;
  return body?.error;
}

// Create: own fetch (not req<T>) so onError can branch on both status and the server's error string.
async function createPost(frontmatter: Frontmatter, body: string, slug: string): Promise<{ id: string }> {
  const res = await fetch(`${BASE}/posts`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify({ frontmatter, body, slug }),
  });
  if (res.status === 401) { bounceToLogin(); throw new PostApiError(401, 'unauthorized'); }
  if (!res.ok) throw new PostApiError(res.status, await readErrorBody(res));
  return res.json() as Promise<{ id: string }>;
}

// Local publish (write live MDX under BLOG_CONTENT). 503 = BLOG_CONTENT missing (prod/RPi — publish
// is a local-only workflow by design, no git automation).
async function publishPost(id: string): Promise<{ path: string; hash: string }> {
  const res = await fetch(`${BASE}/publish/${id}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });
  if (res.status === 401) { bounceToLogin(); throw new PostApiError(401, 'unauthorized'); }
  if (!res.ok) throw new PostApiError(res.status, await readErrorBody(res));
  return res.json() as Promise<{ path: string; hash: string }>;
}

// Pure mappers (server error → Korean UI copy) — kept out of the component so they're unit-testable
// without a renderer, same rationale as Pager.tsx's computePage.
export function createPostErrorMessage(err: unknown): string {
  if (err instanceof PostApiError) {
    if (err.status === 409) return '같은 경로의 글이 이미 있습니다';
    if (err.message === 'invalid slug') return '슬러그(URL)를 확인하세요';
  }
  return '저장 실패';
}

export function publishErrorMessage(err: unknown): string {
  if (err instanceof PostApiError && err.status === 503) return '로컬에서만 발행 가능';
  return '발행 실패';
}

// ── 사케/양조장 마스터 데이터 (editor 전용 SQLite, /editor-api/sake/*) — BE=SSOT ──
export { PREFECTURES, type Prefecture };

export interface Brewery {
  id: string;
  name: string;
  yomigana: string | null; // 양조장 읽기 (v1.1)
  prefecture: string | null; // 都道府県 (v1.2) — PREFECTURES 중 하나
  address: string | null; // 세부 주소, 市区町村 이하 자유 텍스트 (v1.2)
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// 브랜드(銘柄) — v2에서 sakes의 TEXT 컬럼이 아니라 실체가 됐다. 蔵元 1:n 브랜드.
export interface Brand {
  id: string;
  name: string;
  yomigana: string | null;
  brewery: string | null; // join된 양조장 이름(표시용)
  breweryYomigana: string | null;
  brewery_id: string;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// GET 응답 (sakes → brands → breweries 2-hop join + 서버가 riceType JSON.parse 완료).
// brewery/brand는 이름 문자열로 내려온다 — 저장은 brand_id 하나뿐(양조장은 브랜드 경유로 도출).
export interface Sake {
  id: string;
  name: string;
  brand: string | null; // join된 銘柄 이름 (v2: brands.name)
  yomigana: string | null; // 술 이름 읽기 (v1.1)
  brandYomigana: string | null; // join된 브랜드 읽기 (v2: brands.yomigana)
  brand_id: string; // NOT NULL — 사케는 브랜드 없이 존재하지 않는다
  brewery: string | null; // 2-hop join된 양조장 이름(표시용)
  breweryYomigana: string | null;
  brewery_id: string | null; // 도출값(brands.brewery_id) — sakes에는 이 컬럼이 없다
  prefecture: string | null; // 양조장의 産地 (breweries.prefecture 조인) — DB 픽 소스
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

// POST(augment) / PUT(replace) 공용. brewery/brand=이름(서버가 id 해석). `| null`로 PUT 명시 clear.
// v2: brewery는 사실상 필수 — 없으면 400. brand 생략 시 서버가 해당 양조장의 브랜드를 찾아 붙이고,
// 브랜드가 2개 이상이면 추측하지 않고 400 (조용히 아무 데나 붙이지 않는다).
export interface SakeInput {
  name: string;
  brand?: string | null; // 銘柄
  yomigana?: string | null; // 술 이름 읽기 (v1.1)
  brandYomigana?: string | null; // 서버 resolveBrandId가 브랜드 레코드에 반영
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

export interface BrandInput {
  name: string;
  yomigana?: string | null;
  brewery: string; // 필수 — 브랜드는 양조장 없이 존재할 수 없다
  breweryYomigana?: string | null;
  note?: string | null;
}

export interface BreweryInput {
  name: string;
  yomigana?: string | null; // 양조장 읽기 (v1.1)
  prefecture?: string | null; // 都道府県 (v1.2)
  address?: string | null; // 세부 주소 (v1.2)
  note?: string | null;
}

// 409 "in use" — 참조가 남아 있어 삭제를 막았을 때. UI가 「N개 참조 중」 blocking 메시지를 띄우도록
// 개수와 종류를 함께 나른다 (AutofillError의 .status 관용구 미러). v2에서 참조는 두 종류:
// 양조장은 브랜드가, 브랜드는 사케가 물고 있다.
export class SakeRefError extends Error {
  status: number;
  count: number;
  kind: 'brand' | 'sake';
  constructor(count: number, kind: 'brand' | 'sake', message?: string) {
    super(message ?? 'in use');
    this.name = 'SakeRefError';
    this.status = 409;
    this.count = count;
    this.kind = kind;
  }
}

// DELETE with 409 surfacing. Own fetch (not req<T>) to turn the 409 body into a SakeRefError.
// 401 reuses the global bounce; other non-2xx → generic Error.
async function deleteWithRefCheck(path: string, fallbackKind: 'brand' | 'sake'): Promise<{ ok: true }> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });
  if (res.status === 401) { bounceToLogin(); throw new Error('unauthorized'); }
  if (res.status === 409) {
    const body = await res.json() as { error: string; count: number; kind?: 'brand' | 'sake' };
    throw new SakeRefError(body.count, body.kind ?? fallbackKind);
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
  createPost,
  publishPost,
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
  deleteBrewery: (id: string) => deleteWithRefCheck(`/sake/breweries/${id}`, 'brand'),
  // 브랜드(銘柄) CRUD. breweryId 지정 = 그 양조장의 브랜드만(사케 폼의 후보 좁히기).
  searchBrands: (q?: string, breweryId?: string) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (breweryId) p.set('brewery_id', breweryId);
    return req<Brand[]>(`/sake/brands${p.size ? `?${p}` : ''}`);
  },
  upsertBrand: (input: BrandInput) =>
    req<{ brand: Brand; created: boolean }>('/sake/brands', { method: 'POST', body: JSON.stringify(input), headers: { 'Content-Type': 'application/json' } }),
  updateBrand: (id: string, input: BrandInput) =>
    req<{ ok: true }>(`/sake/brands/${id}`, { method: 'PUT', body: JSON.stringify(input), headers: { 'Content-Type': 'application/json' } }),
  deleteBrand: (id: string) => deleteWithRefCheck(`/sake/brands/${id}`, 'sake'),
};

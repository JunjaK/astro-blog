import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, unlink } from 'node:fs/promises';
import matter from 'gray-matter';
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import sharp from 'sharp';
import { db } from './db';
import { catalogImage, setImageUsage, writeVariants } from './images';
import { isManagedImport, manageImports, segmentMdx } from './mdx';
import { sake } from './sake';

// Editor backend (Bun + Hono). Serves the built React SPA under /editor and the
// API under /editor-api on the same origin (cookie auth, no CORS).
// Milestone ① adds: /auth, /posts (CRUD + publish), SQLite, git publish.
const app = new Hono();

// Uploaded images. Local dev: ./.media. Prod: bind-mounted /home/files/media so
// the blog nginx serves them at /files/media (same dir as /home/jun/blog-files/media).
const MEDIA_DIR = process.env.MEDIA_DIR ?? './.media';
const MAX_BYTES = 25 * 1024 * 1024;

// ── Auth (single-user, server-side session, httpOnly cookie, behind Cloudflare) ──
const COOKIE = 'editor_session';
const PROD = process.env.NODE_ENV === 'production';
const SESSION_TTL_S = 30 * 24 * 60 * 60;
const SESSIONS = new Map<string, number>(); // token → expiresAt ms (in-memory: deploy = re-login)

const sha256 = (s: string) => createHash('sha256').update(s).digest();
const safeEqual = (a: string, b: string) => timingSafeEqual(sha256(a), sha256(b));
function newSession() {
  const token = randomBytes(32).toString('base64url');
  SESSIONS.set(token, Date.now() + SESSION_TTL_S * 1000);
  return token;
}
function validSession(token: string | undefined): boolean {
  if (!token) return false;
  const exp = SESSIONS.get(token);
  if (!exp) return false;
  if (exp < Date.now()) { SESSIONS.delete(token); return false; }
  return true;
}

// Default-DENY: every /editor-api/* needs a session except health + /auth/*.
app.use('/editor-api/*', async (c, next) => {
  const p = c.req.path;
  if (p === '/editor-api/health' || p.startsWith('/editor-api/auth/')) return next();
  if (!validSession(getCookie(c, COOKIE))) return c.json({ error: 'unauthorized' }, 401);
  return next();
});

app.post('/editor-api/auth/login', async (c) => {
  const expected = process.env.EDITOR_PASSWORD;
  if (!expected) return c.json({ error: 'auth not configured' }, 503);
  const { password } = await c.req.json<{ password?: string }>().catch(() => ({ password: undefined }));
  if (!password || !safeEqual(password, expected)) return c.json({ error: 'invalid' }, 401);
  setCookie(c, COOKIE, newSession(), { httpOnly: true, secure: PROD, sameSite: 'Lax', path: '/editor-api', maxAge: SESSION_TTL_S });
  c.header('Cache-Control', 'no-store');
  return c.json({ ok: true });
});

app.get('/editor-api/auth/me', (c) => {
  c.header('Cache-Control', 'no-store');
  return validSession(getCookie(c, COOKIE)) ? c.json({ ok: true }) : c.json({ error: 'unauthorized' }, 401);
});

app.post('/editor-api/auth/logout', (c) => {
  const token = getCookie(c, COOKIE);
  if (token) SESSIONS.delete(token);
  deleteCookie(c, COOKIE, { path: '/editor-api' });
  return c.json({ ok: true });
});

app.get('/editor-api/health', (c) =>
  c.json({ status: 'ok', service: 'editor-api', time: new Date().toISOString() }),
);

app.route('/editor-api/sake', sake);

// Post list (status dashboard). 'draft' state derivation comes with the publish step.
app.get('/editor-api/posts', (c) =>
  c.json(db.query('SELECT id, category, slug, title, source, created_at FROM posts ORDER BY created_at DESC').all()),
);

// Parsed doc for the rich editor: prose runs (md) + verbatim component blocks (raw).
// `doc` is a prefix (Hono can't match a static suffix after a greedy :id{.+}).
app.get('/editor-api/doc/:id{.+}', (c) => {
  const row = db.query('SELECT category, frontmatter, body FROM posts WHERE id = ?').get(c.req.param('id')) as
    | { category: string; frontmatter: string; body: string }
    | null;
  if (!row) return c.json({ error: 'not found' }, 404);
  // hide managed import lines — they're regenerated on save from used components
  const segments = segmentMdx(row.body).filter((s) => !(s.kind === 'raw' && isManagedImport(s.src)));
  return c.json({ frontmatter: JSON.parse(row.frontmatter), segments });
});

// Single post (id may contain slashes → rest-capture). `raw` = full MDX
// (frontmatter + body) for editing both in one shot.
app.get('/editor-api/posts/:id{.+}', (c) => {
  const row = db.query('SELECT * FROM posts WHERE id = ?').get(c.req.param('id')) as
    | { frontmatter: string; body: string; [k: string]: unknown }
    | null;
  if (!row) return c.json({ error: 'not found' }, 404);
  const raw = matter.stringify(row.body, JSON.parse(row.frontmatter));
  return c.json({ ...row, raw });
});

// Save edits: structured frontmatter (object) + body. DB only; publish is later.
app.put('/editor-api/posts/:id{.+}', async (c) => {
  const id = c.req.param('id');
  const { frontmatter, body } = await c.req.json<{ frontmatter?: Record<string, unknown>; body?: string }>();
  if (!frontmatter || typeof body !== 'string') return c.json({ error: 'bad payload' }, 400);
  const finalBody = manageImports(body); // auto-inject imports for components used
  const res = db.run(
    'UPDATE posts SET frontmatter = ?, body = ?, title = ?, version = version + 1, updated_at = ? WHERE id = ?',
    [JSON.stringify(frontmatter), finalBody, String(frontmatter.title ?? ''), new Date().toISOString(), id],
  );
  if (!res.changes) return c.json({ error: 'not found' }, 404);
  setImageUsage(id, finalBody); // track which images this post references (orphan detection)
  return c.json({ ok: true });
});

// Image upload → webp (EXIF/GPS stripped by sharp default), content-hash name.
app.post('/editor-api/media', async (c) => {
  const form = await c.req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return c.json({ error: 'no file' }, 400);
  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) return c.json({ error: 'not an image' }, 415); // HEIC often arrives as octet-stream
  if (file.size > MAX_BYTES) return c.json({ error: 'too large' }, 413);
  const input = Buffer.from(await file.arrayBuffer());
  let webp: Buffer;
  // The sized variants below carry display; this "full" webp is the lightbox source (true
  // originals live in the user's cloud). No aggressive 2k cap, but a generous 4096 longest-
  // edge cap bounds decode memory so a giant HEIC can't OOM the shared RPi. One lossy step.
  const cap = { width: 4096, height: 4096, fit: 'inside' as const, withoutEnlargement: true };
  if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
    // sharp can't decode HEIC here → heic-decode to raw RGBA, straight into sharp.
    const decode = (await import('heic-decode')).default;
    const { width, height, data } = await decode({ buffer: input });
    webp = await sharp(Buffer.from(data), { raw: { width, height, channels: 4 } }).resize(cap).webp({ quality: 80 }).toBuffer();
  } else {
    webp = await sharp(input).rotate().resize(cap).webp({ quality: 80 }).toBuffer(); // bake EXIF orientation, strip metadata
  }
  const name = `${createHash('sha256').update(webp).digest('hex').slice(0, 16)}.webp`;
  const base = name.replace(/\.webp$/, '');
  const src = `/files/media/${name}`;
  await mkdir(MEDIA_DIR, { recursive: true });
  await Bun.write(`${MEDIA_DIR}/${name}`, webp);
  try {
    // sized variants (foo-480/960/1600.webp, matching the blog convention) + catalog row
    const meta = await sharp(webp).metadata();
    await writeVariants(webp, base, MEDIA_DIR);
    catalogImage(src, webp, meta.width ?? 0, meta.height ?? 0);
  } catch (err) {
    // variants/catalog failed → unlink so no uncataloged orphan is left behind
    for (const p of [name, `${base}-480.webp`, `${base}-960.webp`, `${base}-1600.webp`]) {
      await unlink(`${MEDIA_DIR}/${p}`).catch(() => {});
    }
    return c.json({ error: `processing failed: ${(err as Error).message}` }, 500);
  }
  return c.json({ src });
});

// AI generate (Novel-style). One fetch to OpenAI, no SDK. Key via OPENAI_API_KEY.
app.post('/editor-api/generate', async (c) => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return c.json({ error: 'OPENAI_API_KEY not set' }, 503);
  const { prompt } = await c.req.json<{ prompt?: string }>();
  if (!prompt) return c.json({ error: 'no prompt' }, 400);
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '너는 블로그 글쓰기 도우미다. 요청에 맞는 한국어 본문만 마크다운으로 출력해라. 군더더기 설명 금지.' },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!r.ok) return c.json({ error: `openai ${r.status}` }, 502);
  const data = await r.json();
  return c.json({ text: data.choices?.[0]?.message?.content ?? '' });
});

// ── AI autofill (nihonshu tasting notes) ──
// Mirrors /generate: one raw fetch to OpenAI, no SDK, key via OPENAI_API_KEY. The strict json_schema
// forces every field into the reply (nullable); the server null-strips so only *confident* keys reach
// the client (augment-only hallucination guard — its location is the server, per the plan).

type TokuteiMeisho =
  | '純米大吟醸' | '大吟醸' | '純米吟醸' | '吟醸'
  | '特別純米' | '特別本醸造' | '純米' | '本醸造' | '普通酒';

type FieldValue = string | number | string[] | null;

// Raw model reply (json_schema strict → all keys present, each nullable). drinkKind is NOT here —
// the endpoint is nihonshu-only and the client sets drinkKind itself. `type` (not interface) so it
// carries an implicit index signature and satisfies stripNulls' Record<string, FieldValue> bound.
type TastingRaw = {
  brewery: string | null;
  tokuteiMeisho: TokuteiMeisho | null;
  riceType: string[] | null;
  seimaiBuai: number | null;
  alcohol: number | null;
  nihonshuDo: number | null;
  sando: number | null;
  amakara: number | null;
  noutan: number | null;
  flavorTags: string[] | null;
};

// Drop null / '' / [] keys — a plain truthy check would wrongly drop legit zeros (amakara/noutan 中央,
// nihonshuDo). Pure + exported so it's unit-testable in isolation (autofill.test.ts).
export function stripNulls<T extends Record<string, FieldValue>>(raw: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(raw) as (keyof T)[]) {
    const v = raw[key];
    if (v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)) out[key] = v;
  }
  return out;
}

const TASTING_SYSTEM_PROMPT
  = '너는 일본 사케(니혼슈) 데이터 어시스턴트다. 입력은 사케명(또는 "양조장 - 사케명")이다. '
  + '확실히 아는 정보만 채우고, 확신하지 못하는 필드는 반드시 null로 둔다. '
  + 'seimaiBuai(정미보합%)/alcohol(도수%)/nihonshuDo(일본주도 SMV)/sando(산도)는 공식 실측값을 확신하지 못하면 절대 창작하지 말고 null. '
  + 'amakara(-2 甘 ~ +2 辛)/noutan(-2 淡麗 ~ +2 濃醇)는 관능 인상을 나타내는 정수이며, 모르면 null. '
  + 'tokuteiMeisho(特定名称)는 제공된 9개 값 중 하나 또는 null. '
  + 'flavorTags는 한국어 라벨 배열로 출력한다(예: "리치·백도향", "키레(산뜻한 후미)"). 없으면 null.';

// Strict structured-output schema. Rules: additionalProperties:false, every key required, nullable via
// type:['x','null'], nullable enum via null appended to the enum array. No numeric min/max — ranges are
// enforced downstream (zod ingest + FE picker) and stated in descriptions, keeping the schema portable.
const TASTING_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['brewery', 'tokuteiMeisho', 'riceType', 'seimaiBuai', 'alcohol', 'nihonshuDo', 'sando', 'amakara', 'noutan', 'flavorTags'],
  properties: {
    brewery: { type: ['string', 'null'], description: '양조장(酒蔵) 이름. 확신 못 하면 null.' },
    tokuteiMeisho: {
      type: ['string', 'null'],
      enum: ['純米大吟醸', '大吟醸', '純米吟醸', '吟醸', '特別純米', '特別本醸造', '純米', '本醸造', '普通酒', null],
      description: '特定名称. 9값 중 하나 또는 null.',
    },
    riceType: { type: ['array', 'null'], items: { type: 'string' }, description: '원료미(酒米). 블렌드 가능. 확신 못 하면 null.' },
    seimaiBuai: { type: ['integer', 'null'], description: '정미보합 %. 0–100 정수. 공식 실측값 확신 못 하면 절대 창작 말고 null.' },
    alcohol: { type: ['number', 'null'], description: '도수 %. 공식 실측값 확신 못 하면 절대 창작 말고 null.' },
    nihonshuDo: { type: ['number', 'null'], description: '일본주도(SMV). 부호 허용. 공식 실측값 확신 못 하면 절대 창작 말고 null.' },
    sando: { type: ['number', 'null'], description: '산도(酸度). 공식 실측값 확신 못 하면 절대 창작 말고 null.' },
    amakara: { type: ['integer', 'null'], description: '甘辛 관능 인상. -2(甘) ~ +2(辛) 정수. 모르면 null.' },
    noutan: { type: ['integer', 'null'], description: '濃淡 관능 인상. -2(淡麗) ~ +2(濃醇) 정수. 모르면 null.' },
    flavorTags: { type: ['array', 'null'], items: { type: 'string' }, description: '향미 태그(한국어 라벨). 없으면 null.' },
  },
};

interface ChatCompletion {
  choices?: { message?: { content?: string } }[];
}

app.post('/editor-api/generate/tasting', async (c) => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return c.json({ error: 'OPENAI_API_KEY not set' }, 503);
  const { query } = await c.req.json<{ query?: string }>();
  if (!query) return c.json({ error: 'no query' }, 400);

  let r: Response;
  try {
    r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        messages: [
          { role: 'system', content: TASTING_SYSTEM_PROMPT },
          { role: 'user', content: query },
        ],
        response_format: { type: 'json_schema', json_schema: { name: 'tasting_nihonshu', strict: true, schema: TASTING_SCHEMA } },
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return c.json({ error: 'openai timeout' }, 504); // AbortSignal.timeout / network throw
  }
  if (!r.ok) return c.json({ error: `openai ${r.status}` }, 502);

  const data = (await r.json()) as ChatCompletion;
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string') return c.json({ error: 'no content' }, 500);
  let parsed: TastingRaw;
  try {
    parsed = JSON.parse(content) as TastingRaw;
  } catch {
    return c.json({ error: 'bad json' }, 500);
  }
  return c.json(stripNulls(parsed)); // flat, null-stripped → only confident keys
});

// Serve uploaded media (dev; in prod the blog nginx serves /files/* from the shared mount).
app.use('/files/media/*', serveStatic({ root: MEDIA_DIR, rewriteRequestPath: (p) => p.replace(/^\/files\/media/, '') }));

// Built assets (vite base = /editor/).
app.use('/editor/*', serveStatic({ root: './dist', rewriteRequestPath: (p) => p.replace(/^\/editor/, '') }));
// SPA fallback for client-side routes.
app.get('/editor/*', serveStatic({ path: './dist/index.html' }));
app.get('/editor', (c) => c.redirect('/editor/'));
app.get('/', (c) => c.redirect('/editor/'));

const port = Number(process.env.PORT ?? 4322);
// eslint-disable-next-line no-console
console.log(`[editor-api] listening on :${port}`);

export default { port, fetch: app.fetch };

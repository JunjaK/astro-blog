import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import matter from 'gray-matter';
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import sharp from 'sharp';
import { db } from './db';
import { catalogImage, setImageUsage, writeVariants } from './images';
import { isManagedImport, manageImports, segmentMdx } from './mdx';

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
  if (!file.type.startsWith('image/')) return c.json({ error: 'not an image' }, 415);
  if (file.size > MAX_BYTES) return c.json({ error: 'too large' }, 413);
  const input = Buffer.from(await file.arrayBuffer());
  let webp: Buffer;
  // Full-resolution webp (no 2k cap — the sized variants below carry display; this full
  // file is the lightbox source. True originals live in the user's cloud). One lossy step.
  if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
    // sharp can't decode HEIC here → heic-decode to raw RGBA, straight into sharp.
    const decode = (await import('heic-decode')).default;
    const { width, height, data } = await decode({ buffer: input });
    webp = await sharp(Buffer.from(data), { raw: { width, height, channels: 4 } }).webp({ quality: 80 }).toBuffer();
  } else {
    webp = await sharp(input).rotate().webp({ quality: 80 }).toBuffer(); // bake EXIF orientation, strip metadata
  }
  const name = `${createHash('sha256').update(webp).digest('hex').slice(0, 16)}.webp`;
  await mkdir(MEDIA_DIR, { recursive: true });
  await Bun.write(`${MEDIA_DIR}/${name}`, webp);
  const src = `/files/media/${name}`;
  // sized variants (foo-480/960/1600.webp, matching the blog convention) + catalog row
  const meta = await sharp(webp).metadata();
  await writeVariants(webp, name.replace(/\.webp$/, ''), MEDIA_DIR);
  catalogImage(src, webp, meta.width ?? 0, meta.height ?? 0);
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

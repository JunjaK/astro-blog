import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import sharp from 'sharp';

// Editor backend (Bun + Hono). Serves the built React SPA under /editor and the
// API under /editor-api on the same origin (cookie auth, no CORS).
// Milestone ① adds: /auth, /posts (CRUD + publish), SQLite, git publish.
const app = new Hono();

// Uploaded images. Local dev: ./.media. Prod: bind-mounted /home/files/media so
// the blog nginx serves them at /files/media (same dir as /home/jun/blog-files/media).
const MEDIA_DIR = process.env.MEDIA_DIR ?? './.media';
const MAX_BYTES = 25 * 1024 * 1024;

app.get('/editor-api/health', (c) =>
  c.json({ status: 'ok', service: 'editor-api', time: new Date().toISOString() }),
);

// Image upload → webp (EXIF/GPS stripped by sharp default), content-hash name.
app.post('/editor-api/media', async (c) => {
  const form = await c.req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return c.json({ error: 'no file' }, 400);
  if (!file.type.startsWith('image/')) return c.json({ error: 'not an image' }, 415);
  if (file.size > MAX_BYTES) return c.json({ error: 'too large' }, 413);
  const webp = await sharp(Buffer.from(await file.arrayBuffer()))
    .rotate() // bake EXIF orientation, then drop metadata (default = no withMetadata)
    .webp({ quality: 80 })
    .toBuffer();
  const name = `${createHash('sha256').update(webp).digest('hex').slice(0, 16)}.webp`;
  await mkdir(MEDIA_DIR, { recursive: true });
  await Bun.write(`${MEDIA_DIR}/${name}`, webp);
  return c.json({ src: `/files/media/${name}` });
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

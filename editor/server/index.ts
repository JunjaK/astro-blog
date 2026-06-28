import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';

// Editor backend (Bun + Hono). Serves the built React SPA under /editor and the
// API under /editor-api on the same origin (cookie auth, no CORS).
// Milestone ① adds: /auth, /posts (CRUD + publish), /media, SQLite, git publish.
const app = new Hono();

app.get('/editor-api/health', (c) =>
  c.json({ status: 'ok', service: 'editor-api', time: new Date().toISOString() }),
);

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

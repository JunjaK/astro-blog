import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import matter from 'gray-matter';
import { Hono } from 'hono';
import { db } from './db';
import { setImageUsage } from './images';
import { isManagedImport, manageImports, segmentMdx } from './mdx';

// Editor-only post CRUD + local publish (plan: editor-uiux-fix, D-BE). index.ts mounts this at
// app.route('/editor-api', posts) — i.e. NO extra prefix segment (unlike sake.ts's own
// /editor-api/sake mount), so the routes below reuse the exact URLs index.ts used inline
// ('/posts', '/doc/:id{.+}', ...). Auth is inherited from index.ts's default-DENY middleware
// (registered before this mount) — this file adds no auth of its own.

const CATEGORIES = new Set(['daily', 'diary', 'game', 'music', 'tasting', 'web']);
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Same env var + default as seed.ts:7 — reused, not reinvented, so both processes agree on where
// the live blog content tree is. Read per-call (not frozen at module load): under `bun test`'s
// shared module registry, another test file can import this module first (e.g. autofill.test.ts →
// ./index → ./posts) before posts.test.ts sets its own BLOG_CONTENT — a module-level const would
// freeze to the real default at that point and every publish in the suite would write into the
// actual blog content tree instead of the test's tmpdir.
const blogContent = () => process.env.BLOG_CONTENT ?? '../blog/src/content/blog';

export const posts = new Hono();

// Post list (status dashboard). 'draft' state derivation comes with the publish step.
posts.get('/posts', (c) =>
  c.json(db.query('SELECT id, category, slug, title, source, created_at FROM posts ORDER BY created_at DESC').all()),
);

// Parsed doc for the rich editor: prose runs (md) + verbatim component blocks (raw).
// `doc` is a prefix (Hono can't match a static suffix after a greedy :id{.+}).
posts.get('/doc/:id{.+}', (c) => {
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
posts.get('/posts/:id{.+}', (c) => {
  const row = db.query('SELECT * FROM posts WHERE id = ?').get(c.req.param('id')) as
    | { frontmatter: string; body: string; [k: string]: unknown }
    | null;
  if (!row) return c.json({ error: 'not found' }, 404);
  const raw = matter.stringify(row.body, JSON.parse(row.frontmatter));
  return c.json({ ...row, raw });
});

// Create: {frontmatter, body, slug}. slug is required input (BE-derived slugs are a dead branch —
// most titles are CJK) and doubles as the path-traversal guard at write-time (regex forbids '/','.',
// etc). id = category(lower)/slug. doc_json stays NULL — body is the source of truth until a TipTap
// import step exists (no point half-filling a column nothing reads yet).
posts.post('/posts', async (c) => {
  const { frontmatter, body, slug } = await c.req.json<{ frontmatter?: Record<string, unknown>; body?: string; slug?: string }>();
  if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter) || typeof body !== 'string' || typeof slug !== 'string') {
    return c.json({ error: 'bad payload' }, 400);
  }
  const title = typeof frontmatter.title === 'string' ? frontmatter.title : '';
  if (!title.trim()) return c.json({ error: 'title required' }, 400);
  if (!frontmatter.created) return c.json({ error: 'created required' }, 400);
  const category = typeof frontmatter.category === 'string' ? frontmatter.category : '';
  if (!CATEGORIES.has(category.toLowerCase())) return c.json({ error: 'invalid category' }, 400);
  if (!SLUG_RE.test(slug)) return c.json({ error: 'invalid slug' }, 400);
  const id = `${category.toLowerCase()}/${slug}`;
  if (db.query('SELECT 1 FROM posts WHERE id = ?').get(id)) return c.json({ error: 'id exists' }, 409);
  const finalBody = manageImports(body); // auto-inject imports for components used
  const t = new Date().toISOString();
  db.run(
    `INSERT INTO posts (id, category, slug, title, frontmatter, body, doc_json, source, published_mdx_hash, version, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, 'editor', NULL, 1, ?, ?)`,
    [id, category, id, title, JSON.stringify(frontmatter), finalBody, t, t],
  );
  setImageUsage(id, finalBody); // track which images this post references (orphan detection)
  return c.json({ id }, 201);
});

// Save edits: structured frontmatter (object) + body. DB only; publish is later.
posts.put('/posts/:id{.+}', async (c) => {
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

// Local publish: write the live MDX file under BLOG_CONTENT. No git automation here — commit/push
// stays in the user's hands (persona hard-gate). Order matters for both security checks below:
//  1. row lookup FIRST, before any path math — an unknown id 404s before an unvalidated id ever
//     reaches path derivation (never build a path from an id that isn't a real row's id).
//  2. BLOG_CONTENT root existence checked BEFORE mkdir — recursive mkdir must never silently
//     create the root itself, or every future publish would "succeed" into a phantom directory
//     nothing actually serves (a silent-failure mode, not a crash — worse).
// containment (resolve + prefix check) is the only id-shape boundary enforced here on purpose: a
// strict id-format regex would false-positive on legitimate multi-segment/non-ASCII legacy ids
// (e.g. diary/2024/foo) that predate the slug regex added at creation time.
//
// prod (RPi editor container) has no BLOG_CONTENT mounted at all — it's a separate Docker image
// from blog's, no shared filesystem. Rather than write into some volume-mounted git checkout (a
// second writer touching the same tree the blog CI/user work in, with no git-level conflict
// detection since this handler only does raw file I/O — a silent-drift risk), this branch hands
// the rendered MDX straight back so the user can place it and commit by hand later. Git stays
// 100% manual either way; this only changes *where* the file ends up.
posts.post('/publish/:id{.+}', async (c) => {
  const row = db.query('SELECT id, frontmatter, body FROM posts WHERE id = ?').get(c.req.param('id')) as
    | { id: string; frontmatter: string; body: string }
    | null;
  if (!row) return c.json({ error: 'not found' }, 404);
  const mdx = matter.stringify(row.body, JSON.parse(row.frontmatter));

  const BLOG_CONTENT = blogContent();
  if (!existsSync(BLOG_CONTENT)) {
    return c.json({ mode: 'download', filename: `${row.id.split('/').pop()}.mdx`, content: mdx });
  }
  const root = resolve(BLOG_CONTENT);
  const target = resolve(root, `${row.id}.mdx`);
  if (target !== root && !target.startsWith(root + sep)) return c.json({ error: 'invalid path' }, 400);
  await mkdir(dirname(target), { recursive: true });
  await Bun.write(target, mdx);
  const hash = createHash('sha256').update(mdx).digest('hex').slice(0, 16); // same recipe as seed.ts:23
  db.run('UPDATE posts SET published_mdx_hash = ? WHERE id = ?', [hash, row.id]);
  return c.json({ mode: 'written', path: `${row.id}.mdx`, hash });
});

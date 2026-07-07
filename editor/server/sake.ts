import { randomBytes } from 'node:crypto';
import { Hono } from 'hono';
import { db } from './db';

// Editor-only sake / brewery master CRUD (plan: sake-master-db). Mounted at /editor-api/sake by
// index.ts AFTER the auth middleware, so every route below inherits default-DENY. Types mirror the
// Contract table (BE = SSOT); the client re-declares the same shapes in src/lib/api.ts.

export type TokuteiMeisho =
  | '純米大吟醸' | '大吟醸' | '純米吟醸' | '吟醸'
  | '特別純米' | '特別本醸造' | '純米' | '本醸造' | '普通酒';

export interface Brewery {
  id: string;
  name: string;
  region: string | null;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Sake { // GET response — join resolved + riceType parsed, name_norm stripped
  id: string;
  name: string;
  brewery: string | null; // LEFT JOIN brewery display name
  brewery_id: string | null;
  tokuteiMeisho: TokuteiMeisho | null;
  riceType: string[]; // parsed from JSON; [] when none
  seimaiBuai: number | null;
  alcohol: number | null;
  nihonshuDo: number | null;
  sando: number | null;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SakeInput { // POST (augment) / PUT (replace) shared. brewery = name → server resolves id
  name: string;
  brewery?: string | null;
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
  region?: string | null;
  note?: string | null;
}

// Raw sakes row (name_norm present, riceType still a JSON string) before toSake() normalizes it.
interface SakeRow extends Omit<Sake, 'riceType'> {
  name_norm?: string;
  riceType: string | null;
}

export const newId = () => randomBytes(6).toString('base64url'); // 8 chars, mirrors newSession
export const normalizeName = (s: string) =>
  s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase(); // NFKC folds 全角４５/　 → 45/space
// LIKE metacharacter escape. Query uses `... LIKE ? ESCAPE '\'`, param `%${likeEscape(norm)}%`.
// Literal is exactly '\\$&' ($& = the matched char) — an escaped-then-wrong variant leaks _/% wildcards.
export const likeEscape = (s: string) => s.replace(/[\\%_]/g, '\\$&');
const now = () => new Date().toISOString();

function toSake(row: SakeRow): Sake {
  delete row.name_norm; // internal column — never exposed
  const riceType = row.riceType ? JSON.parse(row.riceType) as string[] : [];
  return { ...row, riceType };
}

function getSakeById(id: string): Sake | null {
  const row = db.query(
    `SELECT s.*, b.name AS brewery FROM sakes s
     LEFT JOIN breweries b ON b.id = s.brewery_id WHERE s.id = ?`,
  ).get(id) as SakeRow | null;
  return row ? toSake(row) : null;
}

function getBreweryById(id: string): Brewery | null {
  return db.query(
    'SELECT id, name, region, note, created_at, updated_at FROM breweries WHERE id = ?',
  ).get(id) as Brewery | null;
}

// find-or-create by normalized name; only returns the id (does not patch region/note).
export function resolveBreweryId(name: string): string {
  const norm = normalizeName(name);
  const hit = db.query('SELECT id FROM breweries WHERE name_norm = ?').get(norm) as { id: string } | null;
  if (hit) return hit.id;
  const id = newId();
  const t = now();
  db.run(
    'INSERT INTO breweries (id, name, name_norm, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [id, name.trim(), norm, t, t],
  );
  return id;
}

// POST upsert: brewery + sake atomic. Explicit SELECT (brewery_id IS ? = NULL-safe) → COALESCE
// augment (never overwrites a prior non-null with null; clearing is PUT's job) or INSERT.
export const upsertSake = db.transaction((b: SakeInput) => {
  const name = b.name.trim();
  const norm = normalizeName(name);
  const brewery_id = b.brewery ? resolveBreweryId(b.brewery) : null;
  const rice = b.riceType?.length ? JSON.stringify(b.riceType) : null;
  const found = db.query('SELECT id FROM sakes WHERE brewery_id IS ? AND name_norm = ?')
    .get(brewery_id, norm) as { id: string } | null;
  if (found) {
    db.run(
      `UPDATE sakes SET tokuteiMeisho = COALESCE(?, tokuteiMeisho), riceType = COALESCE(?, riceType),
        seimaiBuai = COALESCE(?, seimaiBuai), alcohol = COALESCE(?, alcohol), nihonshuDo = COALESCE(?, nihonshuDo),
        sando = COALESCE(?, sando), note = COALESCE(?, note), updated_at = ? WHERE id = ?`,
      [b.tokuteiMeisho ?? null, rice, b.seimaiBuai ?? null, b.alcohol ?? null,
        b.nihonshuDo ?? null, b.sando ?? null, b.note ?? null, now(), found.id],
    );
    return { id: found.id, created: false };
  }
  const id = newId();
  const t = now();
  db.run(
    `INSERT INTO sakes (id, name, name_norm, brewery_id, tokuteiMeisho, riceType, seimaiBuai, alcohol, nihonshuDo, sando, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, norm, brewery_id, b.tokuteiMeisho ?? null, rice, b.seimaiBuai ?? null,
      b.alcohol ?? null, b.nihonshuDo ?? null, b.sando ?? null, b.note ?? null, t, t],
  );
  return { id, created: true };
});

// POST /breweries upsert (name_norm SELECT → COALESCE region/note or INSERT). Never a bare INSERT
// (UNIQUE(name_norm) would throw on a repeat).
const upsertBrewery = db.transaction((b: BreweryInput) => {
  const name = b.name.trim();
  const norm = normalizeName(name);
  const found = db.query('SELECT id FROM breweries WHERE name_norm = ?').get(norm) as { id: string } | null;
  if (found) {
    db.run(
      'UPDATE breweries SET region = COALESCE(?, region), note = COALESCE(?, note), updated_at = ? WHERE id = ?',
      [b.region ?? null, b.note ?? null, now(), found.id],
    );
    return { id: found.id, created: false };
  }
  const id = newId();
  const t = now();
  db.run(
    'INSERT INTO breweries (id, name, name_norm, region, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, name, norm, b.region ?? null, b.note ?? null, t, t],
  );
  return { id, created: true };
});

export const sake = new Hono();

// 1. GET /sakes?q= — full list (updated_at DESC) or normalized LIKE-ESCAPE search.
sake.get('/sakes', (c) => {
  const q = c.req.query('q');
  const norm = q ? normalizeName(q) : '';
  const rows = (norm
    ? db.query(
      `SELECT s.*, b.name AS brewery FROM sakes s
         LEFT JOIN breweries b ON b.id = s.brewery_id
         WHERE s.name_norm LIKE ? ESCAPE '\\' ORDER BY s.updated_at DESC`,
    ).all(`%${likeEscape(norm)}%`)
    : db.query(
      `SELECT s.*, b.name AS brewery FROM sakes s
         LEFT JOIN breweries b ON b.id = s.brewery_id ORDER BY s.updated_at DESC`,
    ).all()) as SakeRow[];
  return c.json(rows.map(toSake));
});

// 2. GET /sakes/:id — single (FE unused, kept for BE test #1).
sake.get('/sakes/:id', (c) => {
  const row = getSakeById(c.req.param('id'));
  return row ? c.json(row) : c.json({ error: 'not found' }, 404);
});

// 3. POST /sakes — upsert (augment). name validated AFTER normalize (whitespace-only → 400).
sake.post('/sakes', async (c) => {
  const b = await c.req.json<SakeInput>();
  const name = typeof b.name === 'string' ? b.name : '';
  if (!normalizeName(name)) return c.json({ error: 'name required' }, 400);
  const { id, created } = upsertSake(b);
  return c.json({ sake: getSakeById(id), created });
});

// 4. PUT /sakes/:id — full replace (omitted/null → clear). brewery is part of the body (no silent unlink).
sake.put('/sakes/:id', async (c) => {
  const b = await c.req.json<SakeInput>();
  const name = typeof b.name === 'string' ? b.name : '';
  const norm = normalizeName(name);
  if (!norm) return c.json({ error: 'name required' }, 400);
  const brewery_id = b.brewery ? resolveBreweryId(b.brewery) : null;
  const rice = b.riceType?.length ? JSON.stringify(b.riceType) : null;
  const res = db.run(
    `UPDATE sakes SET name = ?, name_norm = ?, brewery_id = ?, tokuteiMeisho = ?, riceType = ?,
      seimaiBuai = ?, alcohol = ?, nihonshuDo = ?, sando = ?, note = ?, updated_at = ? WHERE id = ?`,
    [name.trim(), norm, brewery_id, b.tokuteiMeisho ?? null, rice, b.seimaiBuai ?? null,
      b.alcohol ?? null, b.nihonshuDo ?? null, b.sando ?? null, b.note ?? null, now(), c.req.param('id')],
  );
  return res.changes ? c.json({ ok: true }) : c.json({ error: 'not found' }, 404);
});

// 5. DELETE /sakes/:id.
sake.delete('/sakes/:id', (c) => {
  const res = db.run('DELETE FROM sakes WHERE id = ?', [c.req.param('id')]);
  return res.changes ? c.json({ ok: true }) : c.json({ error: 'not found' }, 404);
});

// 6. GET /breweries?q= — full list (name ASC) or normalized LIKE-ESCAPE search.
sake.get('/breweries', (c) => {
  const q = c.req.query('q');
  const norm = q ? normalizeName(q) : '';
  const rows = norm
    ? db.query(
      `SELECT id, name, region, note, created_at, updated_at FROM breweries
         WHERE name_norm LIKE ? ESCAPE '\\' ORDER BY name ASC`,
    ).all(`%${likeEscape(norm)}%`)
    : db.query(
      'SELECT id, name, region, note, created_at, updated_at FROM breweries ORDER BY name ASC',
    ).all();
  return c.json(rows);
});

// 7. POST /breweries — upsert (augment region/note).
sake.post('/breweries', async (c) => {
  const b = await c.req.json<BreweryInput>();
  const name = typeof b.name === 'string' ? b.name : '';
  if (!normalizeName(name)) return c.json({ error: 'name required' }, 400);
  const { id, created } = upsertBrewery(b);
  return c.json({ brewery: getBreweryById(id), created });
});

// 8. PUT /breweries/:id — full replace.
sake.put('/breweries/:id', async (c) => {
  const b = await c.req.json<BreweryInput>();
  const name = typeof b.name === 'string' ? b.name : '';
  const norm = normalizeName(name);
  if (!norm) return c.json({ error: 'name required' }, 400);
  const res = db.run(
    'UPDATE breweries SET name = ?, name_norm = ?, region = ?, note = ?, updated_at = ? WHERE id = ?',
    [name.trim(), norm, b.region ?? null, b.note ?? null, now(), c.req.param('id')],
  );
  return res.changes ? c.json({ ok: true }) : c.json({ error: 'not found' }, 404);
});

// 9. DELETE /breweries/:id — 409 while referenced (no silent data loss), else delete.
sake.delete('/breweries/:id', (c) => {
  const id = c.req.param('id');
  const { count } = db.query('SELECT count(*) AS count FROM sakes WHERE brewery_id = ?').get(id) as { count: number };
  if (count > 0) return c.json({ error: 'brewery in use', count }, 409);
  const res = db.run('DELETE FROM breweries WHERE id = ?', [id]);
  return res.changes ? c.json({ ok: true }) : c.json({ error: 'not found' }, 404);
});

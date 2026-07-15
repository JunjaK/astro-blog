import { randomBytes } from 'node:crypto';
import { Hono } from 'hono';
import { db } from './db';

// Editor-only 蔵元/브랜드/사케 마스터 CRUD (plan: sake-master-db v2). index.ts 가 auth 미들웨어 뒤에
// /editor-api/sake 로 마운트하므로 아래 라우트는 전부 default-DENY 를 상속한다. 타입은 Contract
// 테이블의 미러(BE = SSOT); 클라이언트가 src/lib/api.ts 에 같은 모양을 재선언한다.
//
// v2 구조: breweries 1:n brands 1:n sakes. 蔵元은 브랜드 경유로만 도출된다(sakes 에 brewery_id 없음)
// — 사본을 두면 어긋난다. API 표면은 이름 문자열 그대로(brewery/brand) 유지하고 서버가 id 로 해석한다.

export type TokuteiMeisho =
  | '純米大吟醸' | '大吟醸' | '純米吟醸' | '吟醸'
  | '特別純米' | '特別本醸造' | '純米' | '本醸造' | '普通酒';

export interface Brewery {
  id: string;
  name: string;
  yomigana: string | null; // 読み (hiragana); null when unknown
  prefecture: string | null; // 都道府県 — one of PREFECTURES; free text at rest
  address: string | null; // 詳細住所 (市区町村以下), free text
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Brand { // GET response — brewery name resolved via join
  id: string;
  name: string; // 銘柄
  yomigana: string | null;
  brewery: string | null; // LEFT JOIN breweries.name (표시용)
  breweryYomigana: string | null;
  brewery_id: string;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Sake { // GET response — 2-hop join resolved + riceType parsed, name_norm stripped
  id: string;
  name: string;
  yomigana: string | null; // 読み of the sake name (hiragana)
  brand: string | null; // JOIN brands.name
  brandYomigana: string | null; // JOIN brands.yomigana
  brand_id: string;
  brewery: string | null; // 2-hop: sakes → brands → breweries.name
  breweryYomigana: string | null;
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

export interface SakeInput { // POST (augment) / PUT (replace). brewery/brand = 이름 → 서버가 id 해석
  name: string;
  yomigana?: string | null;
  brand?: string | null;
  brandYomigana?: string | null;
  brewery?: string | null;
  breweryYomigana?: string | null;
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
  yomigana?: string | null;
  prefecture?: string | null;
  address?: string | null;
  note?: string | null;
}

export interface BrandInput {
  name: string;
  yomigana?: string | null;
  brewery: string; // 蔵元 이름 (필수 — 브랜드는 蔵元 없이 존재할 수 없다)
  breweryYomigana?: string | null;
  note?: string | null;
}

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

// 蔵元명 → 브랜드명 폴백. 브랜드를 **모를 때만** 쓴다. 일반 도출 규칙이 아니다 —
// 高木酒造→高木(실제 十四代), 朝日酒造→朝日(실제 久保田)처럼 대부분 틀린다. 그래서 resolveBrandId 는
// 브랜드가 0개인 蔵元에만 이걸 태운다. 긴 접미사부터 잘라야 한다(総本店 이 本店 보다 먼저).
const BREWERY_SUFFIXES = [
  '酒類製造', '総本店', '酒造店', '酒造場', '酒造部', '本舗', '本店', '商店', '銘醸', '酒造', '醸造',
];
export function stripBrewerySuffix(name: string): string {
  const t = name.trim();
  for (const s of BREWERY_SUFFIXES) {
    if (t.length > s.length && t.endsWith(s)) return t.slice(0, -s.length);
  }
  return t;
}

function toSake(row: SakeRow): Sake {
  delete row.name_norm; // internal column — never exposed
  const riceType = row.riceType ? JSON.parse(row.riceType) as string[] : [];
  return { ...row, riceType };
}

// sakes → brands → breweries 2-hop. brand_id 가 NOT NULL 이라 brands 조인은 항상 맞고,
// breweries 만 방어적으로 LEFT (brewery_id 는 DB 가 강제하지 않는 논리 FK).
const SAKE_SELECT = `
  SELECT s.*, br.name AS brand, br.yomigana AS brandYomigana, br.brewery_id AS brewery_id,
         b.name AS brewery, b.yomigana AS breweryYomigana
    FROM sakes s
    JOIN brands br ON br.id = s.brand_id
    LEFT JOIN breweries b ON b.id = br.brewery_id`;

const BRAND_SELECT = `
  SELECT br.id, br.name, br.yomigana, br.brewery_id, br.note, br.created_at, br.updated_at,
         b.name AS brewery, b.yomigana AS breweryYomigana
    FROM brands br
    LEFT JOIN breweries b ON b.id = br.brewery_id`;

function getSakeById(id: string): Sake | null {
  const row = db.query(`${SAKE_SELECT} WHERE s.id = ?`).get(id) as SakeRow | null;
  return row ? toSake(row) : null;
}

function getBreweryById(id: string): Brewery | null {
  return db.query(
    'SELECT id, name, yomigana, prefecture, address, note, created_at, updated_at FROM breweries WHERE id = ?',
  ).get(id) as Brewery | null;
}

function getBrandById(id: string): Brand | null {
  return db.query(`${BRAND_SELECT} WHERE br.id = ?`).get(id) as Brand | null;
}

// find-or-create by normalized name; returns the id. Patches only yomigana (COALESCE) when a
// reading is supplied for an existing brewery — never prefecture/address/note (the brewery form's job).
export function resolveBreweryId(name: string, yomigana?: string | null): string {
  const norm = normalizeName(name);
  const hit = db.query('SELECT id FROM breweries WHERE name_norm = ?').get(norm) as { id: string } | null;
  if (hit) {
    if (yomigana) {
      db.run(
        'UPDATE breweries SET yomigana = COALESCE(?, yomigana), updated_at = ? WHERE id = ?',
        [yomigana, now(), hit.id],
      );
    }
    return hit.id;
  }
  const id = newId();
  const t = now();
  db.run(
    'INSERT INTO breweries (id, name, name_norm, yomigana, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name.trim(), norm, yomigana ?? null, t, t],
  );
  return id;
}

// find-or-create a brand under a brewery. brandName 이 비면 폴백을 태우는데, 그 蔵元이 이미 브랜드를
// 갖고 있으면 잘못된 브랜드(高木酒造 밑에 「高木」)를 새로 만드는 꼴이라: 브랜드가 정확히 1개면
// 그걸 쓰고, 0개일 때만 접미사-제거 이름으로 만든다. 2개 이상인데 안 주면 추측할 수 없으므로 null.
export function resolveBrandId(
  brandName: string | null | undefined,
  breweryId: string,
  breweryName: string,
  yomigana?: string | null,
): string | null {
  let name = brandName?.trim() ?? '';
  if (!name) {
    const existing = db.query('SELECT id, name FROM brands WHERE brewery_id = ?')
      .all(breweryId) as { id: string; name: string }[];
    if (existing.length === 1) return existing[0].id;
    if (existing.length > 1) return null; // 모호 — 호출자가 400 으로 돌려준다
    name = stripBrewerySuffix(breweryName);
  }
  const norm = normalizeName(name);
  if (!norm) return null;
  const hit = db.query('SELECT id FROM brands WHERE brewery_id = ? AND name_norm = ?')
    .get(breweryId, norm) as { id: string } | null;
  if (hit) {
    if (yomigana) {
      db.run('UPDATE brands SET yomigana = COALESCE(?, yomigana), updated_at = ? WHERE id = ?',
        [yomigana, now(), hit.id]);
    }
    return hit.id;
  }
  const id = newId();
  const t = now();
  db.run(
    'INSERT INTO brands (id, name, name_norm, yomigana, brewery_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, name, norm, yomigana ?? null, breweryId, t, t],
  );
  return id;
}

// 사케 입력의 蔵元/브랜드를 brand_id 로 접는다. 蔵元이 없으면 브랜드를 걸 곳이 없으므로 실패.
function resolveChain(b: SakeInput): { brandId: string } | { error: string } {
  if (!b.brewery?.trim()) return { error: 'brewery required' };
  const breweryId = resolveBreweryId(b.brewery, b.breweryYomigana);
  const brandId = resolveBrandId(b.brand, breweryId, b.brewery, b.brandYomigana);
  if (!brandId) return { error: 'brand required (this brewery has multiple brands — pick one)' };
  return { brandId };
}

// POST upsert: 蔵元 + 브랜드 + 사케 atomic. 명시 SELECT → COALESCE augment (기존 non-null 을 null 로
// 덮지 않는다; clear 는 PUT 의 일) 또는 INSERT.
export const upsertSake = db.transaction((b: SakeInput, brandId: string) => {
  const name = b.name.trim();
  const norm = normalizeName(name);
  const rice = b.riceType?.length ? JSON.stringify(b.riceType) : null;
  const found = db.query('SELECT id FROM sakes WHERE brand_id = ? AND name_norm = ?')
    .get(brandId, norm) as { id: string } | null;
  if (found) {
    db.run(
      `UPDATE sakes SET yomigana = COALESCE(?, yomigana), tokuteiMeisho = COALESCE(?, tokuteiMeisho),
        riceType = COALESCE(?, riceType), seimaiBuai = COALESCE(?, seimaiBuai),
        alcohol = COALESCE(?, alcohol), nihonshuDo = COALESCE(?, nihonshuDo),
        sando = COALESCE(?, sando), note = COALESCE(?, note), updated_at = ? WHERE id = ?`,
      [b.yomigana ?? null, b.tokuteiMeisho ?? null, rice, b.seimaiBuai ?? null, b.alcohol ?? null,
        b.nihonshuDo ?? null, b.sando ?? null, b.note ?? null, now(), found.id],
    );
    return { id: found.id, created: false };
  }
  const id = newId();
  const t = now();
  db.run(
    `INSERT INTO sakes (id, name, name_norm, yomigana, brand_id, tokuteiMeisho, riceType, seimaiBuai,
       alcohol, nihonshuDo, sando, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, norm, b.yomigana ?? null, brandId, b.tokuteiMeisho ?? null, rice, b.seimaiBuai ?? null,
      b.alcohol ?? null, b.nihonshuDo ?? null, b.sando ?? null, b.note ?? null, t, t],
  );
  return { id, created: true };
});

// POST /breweries upsert (name_norm SELECT → COALESCE prefecture/address/note or INSERT). Never a
// bare INSERT (UNIQUE(name_norm) would throw on a repeat).
const upsertBrewery = db.transaction((b: BreweryInput) => {
  const name = b.name.trim();
  const norm = normalizeName(name);
  const found = db.query('SELECT id FROM breweries WHERE name_norm = ?').get(norm) as { id: string } | null;
  if (found) {
    db.run(
      `UPDATE breweries SET yomigana = COALESCE(?, yomigana), prefecture = COALESCE(?, prefecture),
        address = COALESCE(?, address), note = COALESCE(?, note), updated_at = ? WHERE id = ?`,
      [b.yomigana ?? null, b.prefecture ?? null, b.address ?? null, b.note ?? null, now(), found.id],
    );
    return { id: found.id, created: false };
  }
  const id = newId();
  const t = now();
  db.run(
    `INSERT INTO breweries (id, name, name_norm, yomigana, prefecture, address, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, norm, b.yomigana ?? null, b.prefecture ?? null, b.address ?? null, b.note ?? null, t, t],
  );
  return { id, created: true };
});

const upsertBrand = db.transaction((b: BrandInput) => {
  const breweryId = resolveBreweryId(b.brewery, b.breweryYomigana);
  const name = b.name.trim();
  const norm = normalizeName(name);
  const found = db.query('SELECT id FROM brands WHERE brewery_id = ? AND name_norm = ?')
    .get(breweryId, norm) as { id: string } | null;
  if (found) {
    db.run(
      'UPDATE brands SET yomigana = COALESCE(?, yomigana), note = COALESCE(?, note), updated_at = ? WHERE id = ?',
      [b.yomigana ?? null, b.note ?? null, now(), found.id],
    );
    return { id: found.id, created: false };
  }
  const id = newId();
  const t = now();
  db.run(
    'INSERT INTO brands (id, name, name_norm, yomigana, brewery_id, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, name, norm, b.yomigana ?? null, breweryId, b.note ?? null, t, t],
  );
  return { id, created: true };
});

export const sake = new Hono();

// 1. GET /sakes?q= — full list (updated_at DESC) or normalized LIKE-ESCAPE search.
sake.get('/sakes', (c) => {
  const q = c.req.query('q');
  const norm = q ? normalizeName(q) : '';
  // 정규화 쿼리를 name_norm + 가변 텍스트(읽기/브랜드) 컬럼에 건다. brands.name_norm 은 이미 정규화돼
  // 있어 v1 의 LOWER(s.brand) 근사가 필요 없다 — 브랜드가 실체가 된 덕에 검색이 정확해졌다.
  const like = `%${likeEscape(norm)}%`;
  const rows = (norm
    ? db.query(
      `${SAKE_SELECT}
         WHERE s.name_norm LIKE ? ESCAPE '\\' OR s.yomigana LIKE ? ESCAPE '\\'
            OR br.name_norm LIKE ? ESCAPE '\\' OR br.yomigana LIKE ? ESCAPE '\\'
         ORDER BY s.updated_at DESC`,
    ).all(like, like, like, like)
    : db.query(`${SAKE_SELECT} ORDER BY s.updated_at DESC`).all()) as SakeRow[];
  return c.json(rows.map(toSake));
});

// 2. GET /sakes/:id — single.
sake.get('/sakes/:id', (c) => {
  const row = getSakeById(c.req.param('id'));
  return row ? c.json(row) : c.json({ error: 'not found' }, 404);
});

// 3. POST /sakes — upsert (augment). name validated AFTER normalize (whitespace-only → 400).
sake.post('/sakes', async (c) => {
  const b = await c.req.json<SakeInput>();
  const name = typeof b.name === 'string' ? b.name : '';
  if (!normalizeName(name)) return c.json({ error: 'name required' }, 400);
  const chain = resolveChain(b);
  if ('error' in chain) return c.json({ error: chain.error }, 400);
  const { id, created } = upsertSake(b, chain.brandId);
  return c.json({ sake: getSakeById(id), created });
});

// 4. PUT /sakes/:id — full replace (omitted/null → clear). brewery/brand 도 body 의 일부(조용한 unlink 금지).
sake.put('/sakes/:id', async (c) => {
  const b = await c.req.json<SakeInput>();
  const name = typeof b.name === 'string' ? b.name : '';
  const norm = normalizeName(name);
  if (!norm) return c.json({ error: 'name required' }, 400);
  const chain = resolveChain(b);
  if ('error' in chain) return c.json({ error: chain.error }, 400);
  const rice = b.riceType?.length ? JSON.stringify(b.riceType) : null;
  const res = db.run(
    `UPDATE sakes SET name = ?, name_norm = ?, yomigana = ?, brand_id = ?, tokuteiMeisho = ?,
      riceType = ?, seimaiBuai = ?, alcohol = ?, nihonshuDo = ?, sando = ?, note = ?, updated_at = ?
     WHERE id = ?`,
    [name.trim(), norm, b.yomigana ?? null, chain.brandId, b.tokuteiMeisho ?? null, rice,
      b.seimaiBuai ?? null, b.alcohol ?? null, b.nihonshuDo ?? null, b.sando ?? null, b.note ?? null,
      now(), c.req.param('id')],
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
  const like = `%${likeEscape(norm)}%`;
  const rows = norm
    ? db.query(
      `SELECT id, name, yomigana, prefecture, address, note, created_at, updated_at FROM breweries
         WHERE name_norm LIKE ? ESCAPE '\\' OR yomigana LIKE ? ESCAPE '\\' ORDER BY name ASC`,
    ).all(like, like)
    : db.query(
      'SELECT id, name, yomigana, prefecture, address, note, created_at, updated_at FROM breweries ORDER BY name ASC',
    ).all();
  return c.json(rows);
});

// 7. POST /breweries — upsert (augment prefecture/address/note).
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
    `UPDATE breweries SET name = ?, name_norm = ?, yomigana = ?, prefecture = ?, address = ?, note = ?,
      updated_at = ? WHERE id = ?`,
    [name.trim(), norm, b.yomigana ?? null, b.prefecture ?? null, b.address ?? null, b.note ?? null,
      now(), c.req.param('id')],
  );
  return res.changes ? c.json({ ok: true }) : c.json({ error: 'not found' }, 404);
});

// 9. DELETE /breweries/:id — 참조 중이면 409 (조용한 데이터 손실 금지). 브랜드가 사케를 물고 있을 수
// 있으므로 브랜드 수를 센다 — 브랜드가 붙어 있으면 사케 유무와 무관하게 막는다.
sake.delete('/breweries/:id', (c) => {
  const id = c.req.param('id');
  const { count } = db.query('SELECT count(*) AS count FROM brands WHERE brewery_id = ?')
    .get(id) as { count: number };
  if (count > 0) return c.json({ error: 'brewery in use', count, kind: 'brand' }, 409);
  const res = db.run('DELETE FROM breweries WHERE id = ?', [id]);
  return res.changes ? c.json({ ok: true }) : c.json({ error: 'not found' }, 404);
});

// 10. GET /brands?q=&brewery_id= — 목록/검색. brewery_id 는 사케 폼의 브랜드 후보 좁히기용.
sake.get('/brands', (c) => {
  const q = c.req.query('q');
  const breweryId = c.req.query('brewery_id');
  const norm = q ? normalizeName(q) : '';
  const like = `%${likeEscape(norm)}%`;
  const where: string[] = [];
  const params: string[] = [];
  if (breweryId) { where.push('br.brewery_id = ?'); params.push(breweryId); }
  if (norm) {
    where.push(`(br.name_norm LIKE ? ESCAPE '\\' OR br.yomigana LIKE ? ESCAPE '\\')`);
    params.push(like, like);
  }
  const sql = `${BRAND_SELECT}${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY b.name ASC, br.name ASC`;
  return c.json(db.query(sql).all(...params));
});

// 11. GET /brands/:id — single.
sake.get('/brands/:id', (c) => {
  const row = getBrandById(c.req.param('id'));
  return row ? c.json(row) : c.json({ error: 'not found' }, 404);
});

// 12. POST /brands — upsert (蔵元 find-or-create 포함).
sake.post('/brands', async (c) => {
  const b = await c.req.json<BrandInput>();
  const name = typeof b.name === 'string' ? b.name : '';
  if (!normalizeName(name)) return c.json({ error: 'name required' }, 400);
  if (!normalizeName(typeof b.brewery === 'string' ? b.brewery : '')) {
    return c.json({ error: 'brewery required' }, 400);
  }
  const { id, created } = upsertBrand(b);
  return c.json({ brand: getBrandById(id), created });
});

// 13. PUT /brands/:id — full replace. 蔵元 이동도 허용(브랜드가 잘못된 蔵元에 붙은 걸 고칠 수 있어야).
sake.put('/brands/:id', async (c) => {
  const b = await c.req.json<BrandInput>();
  const name = typeof b.name === 'string' ? b.name : '';
  const norm = normalizeName(name);
  if (!norm) return c.json({ error: 'name required' }, 400);
  if (!normalizeName(typeof b.brewery === 'string' ? b.brewery : '')) {
    return c.json({ error: 'brewery required' }, 400);
  }
  const breweryId = resolveBreweryId(b.brewery, b.breweryYomigana);
  const res = db.run(
    'UPDATE brands SET name = ?, name_norm = ?, yomigana = ?, brewery_id = ?, note = ?, updated_at = ? WHERE id = ?',
    [name.trim(), norm, b.yomigana ?? null, breweryId, b.note ?? null, now(), c.req.param('id')],
  );
  return res.changes ? c.json({ ok: true }) : c.json({ error: 'not found' }, 404);
});

// 14. DELETE /brands/:id — 참조 사케가 있으면 409 (사케는 brand_id NOT NULL 이라 고아가 될 수 없다).
sake.delete('/brands/:id', (c) => {
  const id = c.req.param('id');
  const { count } = db.query('SELECT count(*) AS count FROM sakes WHERE brand_id = ?')
    .get(id) as { count: number };
  if (count > 0) return c.json({ error: 'brand in use', count, kind: 'sake' }, 409);
  const res = db.run('DELETE FROM brands WHERE id = ?', [id]);
  return res.changes ? c.json({ ok: true }) : c.json({ error: 'not found' }, 404);
});

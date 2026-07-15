import { beforeEach, describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import type { Brand, Brewery, Sake } from './sake';

// In-memory DB so these cases never touch the real dev file. This wins only when THIS file
// loads ./db first (standalone `bun test server/sake.test.ts`). In the full `bun test` suite
// bun shares the module registry across files, so ./db may already be cached against the real
// path (autofill.test.ts imports ./index → ./db earlier) — the beforeEach wipe below keeps the
// cases deterministic either way. Set BEFORE the dynamic import that instantiates the db.
process.env.DB_PATH = ':memory:';
const { sake, stripBrewerySuffix } = await import('./sake');
const { db, ensureColumns, renameColumn } = await import('./db');

beforeEach(() => {
  db.run('DELETE FROM sakes');
  db.run('DELETE FROM brands');
  db.run('DELETE FROM breweries');
});

async function call<T>(method: string, path: string, body?: unknown): Promise<{ status: number; body: T }> {
  const res = await sake.request(path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as T };
}

type UpsertRes = { sake: Sake; created: boolean };
type BrandRes = { brand: Brand; created: boolean };
type ErrRes = { error: string; count?: number; kind?: string };

// v2: 사케는 蔵元 없이 만들 수 없다(브랜드를 걸 곳이 없으므로). 대부분의 케이스가 蔵元을 필요로 하니
// 최소 입력을 여기 모아둔다 — 각 테스트가 실제로 보려는 것만 남기려고.
const KURA = { brewery: '木屋正酒造' };

describe('sake CRUD router', () => {
  it('1. CRUD roundtrip: create → list → by-id → update → delete → 404', async () => {
    const created = await call<UpsertRes>('POST', '/sakes', { name: '而今', seimaiBuai: 45, ...KURA });
    expect(created.status).toBe(200);
    expect(created.body.created).toBe(true);
    const id = created.body.sake.id;
    expect(id.length).toBe(8); // randomBytes(6).base64url

    const list = await call<Sake[]>('GET', '/sakes');
    expect(list.body.some((s) => s.id === id)).toBe(true);

    const byId = await call<Sake>('GET', `/sakes/${id}`);
    expect(byId.status).toBe(200);
    expect(byId.body.name).toBe('而今');
    expect(byId.body.seimaiBuai).toBe(45);
    expect((byId.body as Record<string, unknown>).name_norm).toBeUndefined(); // internal column hidden

    const put = await call<{ ok: true }>('PUT', `/sakes/${id}`, { name: '而今 純米', seimaiBuai: 39, ...KURA });
    expect(put.status).toBe(200);
    const after = await call<Sake>('GET', `/sakes/${id}`);
    expect(after.body.name).toBe('而今 純米');
    expect(after.body.seimaiBuai).toBe(39);

    const del = await call<{ ok: true }>('DELETE', `/sakes/${id}`);
    expect(del.status).toBe(200);
    const gone = await call<ErrRes>('GET', `/sakes/${id}`);
    expect(gone.status).toBe(404);
  });

  it('2. normalization: full-width "獺祭　４５" dedups with "獺祭 45" (created:false, count 1)', async () => {
    const first = await call<UpsertRes>('POST', '/sakes', { name: '獺祭　４５', ...KURA }); // U+3000 + full-width digits
    expect(first.body.created).toBe(true);
    const second = await call<UpsertRes>('POST', '/sakes', { name: '獺祭 45', ...KURA }); // half-width
    expect(second.body.created).toBe(false);
    const list = await call<Sake[]>('GET', '/sakes');
    expect(list.body.length).toBe(1);
  });

  it('3. LIKE escape: "a_b" query matches only literal a_b (not axb); "50%" matches 50%off', async () => {
    await call('POST', '/sakes', { name: 'a_b', ...KURA });
    await call('POST', '/sakes', { name: 'axb', ...KURA });
    const under = await call<Sake[]>('GET', `/sakes?q=${encodeURIComponent('a_b')}`);
    expect(under.body.length).toBe(1);
    expect(under.body[0].name).toBe('a_b');

    await call('POST', '/sakes', { name: '50%off', ...KURA });
    const pct = await call<Sake[]>('GET', `/sakes?q=${encodeURIComponent('50%')}`);
    expect(pct.body.some((s) => s.name === '50%off')).toBe(true);
  });

  it('4. upsert COALESCE: augments without clobbering prior non-null values', async () => {
    const first = await call<UpsertRes>('POST', '/sakes', { name: '久保田', seimaiBuai: 50, ...KURA });
    const id = first.body.sake.id;
    const second = await call<UpsertRes>('POST', '/sakes', { name: '久保田', alcohol: 15, ...KURA }); // seimaiBuai omitted
    expect(second.body.created).toBe(false);
    const row = await call<Sake>('GET', `/sakes/${id}`);
    expect(row.body.seimaiBuai).toBe(50); // preserved
    expect(row.body.alcohol).toBe(15); // added
  });

  it('5. brewery delete: 409 while a brand hangs off it, 200 once the brand is gone', async () => {
    // v2: 蔵元은 브랜드가 물고 있다(사케가 아니라). 사케를 지워도 브랜드가 남아 있으면 여전히 막혀야 한다.
    const s = await call<UpsertRes>('POST', '/sakes', { name: '而今', brewery: '木屋正酒造', brand: '而今' });
    const breweries = await call<Brewery[]>('GET', '/breweries');
    const b = breweries.body.find((x) => x.name === '木屋正酒造');
    expect(b).toBeDefined();

    const blocked = await call<ErrRes>('DELETE', `/breweries/${b!.id}`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error).toBe('brewery in use');
    expect(blocked.body.kind).toBe('brand');
    expect(blocked.body.count).toBe(1);

    await call('DELETE', `/sakes/${s.body.sake.id}`);
    const stillBlocked = await call<ErrRes>('DELETE', `/breweries/${b!.id}`);
    expect(stillBlocked.status).toBe(409); // 브랜드가 아직 남아 있다

    const brands = await call<Brand[]>('GET', `/brands?brewery_id=${b!.id}`);
    await call('DELETE', `/brands/${brands.body[0].id}`);
    const ok = await call<{ ok: true }>('DELETE', `/breweries/${b!.id}`);
    expect(ok.status).toBe(200);
  });

  it('6. brewery auto-create: POST sake with brewery name → row + 2-hop join', async () => {
    const s = await call<UpsertRes>('POST', '/sakes', { name: '而今', brewery: '木屋正酒造' });
    expect(s.body.sake.brewery).toBe('木屋正酒造'); // sakes → brands → breweries
    expect(typeof s.body.sake.brewery_id).toBe('string');
    const breweries = await call<Brewery[]>('GET', '/breweries');
    expect(breweries.body.some((b) => b.name === '木屋正酒造')).toBe(true);
  });

  it('7. riceType roundtrips as string[]', async () => {
    const s = await call<UpsertRes>('POST', '/sakes', { name: '田酒', riceType: ['山田錦', '雄町'], ...KURA });
    const row = await call<Sake>('GET', `/sakes/${s.body.sake.id}`);
    expect(row.body.riceType).toEqual(['山田錦', '雄町']);
  });

  it('8. name validation: empty and whitespace-only names are rejected 400', async () => {
    const empty = await call<ErrRes>('POST', '/sakes', { name: '', ...KURA });
    expect(empty.status).toBe(400);
    const ws = await call<ErrRes>('POST', '/sakes', { name: '　', ...KURA }); // full-width space only → normalizes to ''
    expect(ws.status).toBe(400);
  });

  it('9. brand/yomigana/brandYomigana roundtrip through POST → GET', async () => {
    const created = await call<UpsertRes>('POST', '/sakes', {
      name: '獺祭 純米大吟醸 45',
      brewery: '獺祭',
      brand: '獺祭',
      yomigana: 'だっさい じゅんまいだいぎんじょう 45',
      brandYomigana: 'だっさい',
    });
    expect(created.status).toBe(200);
    const row = await call<Sake>('GET', `/sakes/${created.body.sake.id}`);
    expect(row.body.brand).toBe('獺祭');
    expect(row.body.yomigana).toBe('だっさい じゅんまいだいぎんじょう 45');
    expect(row.body.brandYomigana).toBe('だっさい'); // brands.yomigana 에서 조인돼 온다
  });

  it('10. search matches by yomigana, brand, and brandYomigana (not just name)', async () => {
    // name shares no chars with brand/yomigana → each hit must come from its own column
    await call('POST', '/sakes', {
      name: 'スパークリング',
      brewery: '獺祭',
      brand: '獺祭',
      yomigana: 'すぱーくりんぐ',
      brandYomigana: 'だっさい',
    });
    const byBrand = await call<Sake[]>('GET', `/sakes?q=${encodeURIComponent('獺祭')}`);
    expect(byBrand.body.some((s) => s.brand === '獺祭')).toBe(true);
    const byBrandYomi = await call<Sake[]>('GET', `/sakes?q=${encodeURIComponent('だっさい')}`);
    expect(byBrandYomi.body.some((s) => s.brand === '獺祭')).toBe(true);
    const byYomi = await call<Sake[]>('GET', `/sakes?q=${encodeURIComponent('すぱー')}`);
    expect(byYomi.body.length).toBe(1);
  });

  it('11. brewery yomigana: set via sake POST, joined into GET, COALESCE-preserved', async () => {
    const first = await call<UpsertRes>('POST', '/sakes', { name: '獺祭', brewery: '旭酒造' });
    const before = await call<Brewery[]>('GET', '/breweries');
    expect(before.body.find((x) => x.name === '旭酒造')!.yomigana).toBeNull();

    await call('POST', '/sakes', { name: '獺祭 45', brewery: '旭酒造', breweryYomigana: 'あさひしゅぞう' });
    const after = await call<Brewery[]>('GET', '/breweries');
    expect(after.body.find((x) => x.name === '旭酒造')!.yomigana).toBe('あさひしゅぞう');

    const sakeRow = await call<Sake>('GET', `/sakes/${first.body.sake.id}`);
    expect(sakeRow.body.breweryYomigana).toBe('あさひしゅぞう');

    // a later sake with no reading must not wipe the stored one
    await call('POST', '/sakes', { name: '獺祭 39', brewery: '旭酒造' });
    const final = await call<Brewery[]>('GET', '/breweries');
    expect(final.body.find((x) => x.name === '旭酒造')!.yomigana).toBe('あさひしゅぞう');
  });

  it('12. brewery upsert stores yomigana and search matches on it', async () => {
    await call('POST', '/breweries', { name: '木屋正酒造', yomigana: 'きやしょうしゅぞう' });
    const hit = await call<Brewery[]>('GET', `/breweries?q=${encodeURIComponent('きやしょう')}`);
    expect(hit.body.some((b) => b.name === '木屋正酒造')).toBe(true);
    expect(hit.body[0].yomigana).toBe('きやしょうしゅぞう');
  });
});

// ── v2 delta: 蔵元 1:n 브랜드 1:n 사케 ──

describe('brand chain (v2)', () => {
  it('13. sake requires a brewery — 400 without one (no brand to hang it on)', async () => {
    const none = await call<ErrRes>('POST', '/sakes', { name: '而今' });
    expect(none.status).toBe(400);
    expect(none.body.error).toBe('brewery required');
    const blank = await call<ErrRes>('POST', '/sakes', { name: '而今', brewery: '  ' });
    expect(blank.status).toBe(400);
  });

  it('14. brand fallback fires ONLY when the brewery has zero brands (suffix stripped)', async () => {
    // 브랜드 0개 + brand 미지정 → 蔵元명에서 접미사를 떼어 만든다
    const s = await call<UpsertRes>('POST', '/sakes', { name: '飛良泉 山廃', brewery: '飛良泉本舗' });
    expect(s.status).toBe(200);
    expect(s.body.sake.brand).toBe('飛良泉'); // 本舗 제거
    const brands = await call<Brand[]>('GET', '/brands');
    expect(brands.body.length).toBe(1);
  });

  it('15. brand fallback: brewery with exactly ONE brand reuses it (never invents a second)', async () => {
    // 高木酒造는 十四代를 낸다 — 접미사 제거를 태우면 「高木」이라는 없는 브랜드가 생긴다
    await call('POST', '/brands', { name: '十四代', brewery: '高木酒造' });
    const s = await call<UpsertRes>('POST', '/sakes', { name: '本丸', brewery: '高木酒造' }); // brand 미지정
    expect(s.status).toBe(200);
    expect(s.body.sake.brand).toBe('十四代'); // 「高木」이 아니다
    const brands = await call<Brand[]>('GET', '/brands');
    expect(brands.body.length).toBe(1); // 새로 만들지 않았다
  });

  it('16. brand fallback: brewery with 2+ brands cannot be guessed → 400, nothing written', async () => {
    await call('POST', '/brands', { name: '而今', brewery: '木屋正酒造' });
    await call('POST', '/brands', { name: '高砂', brewery: '木屋正酒造' });
    const s = await call<ErrRes>('POST', '/sakes', { name: '特別純米', brewery: '木屋正酒造' });
    expect(s.status).toBe(400);
    expect(s.body.error).toContain('brand required');
    const sakes = await call<Sake[]>('GET', '/sakes');
    expect(sakes.body.length).toBe(0); // 조용히 아무 브랜드에나 붙이지 않았다
  });

  it('17. same brand name under different breweries coexists (信州亀齢 vs 亀齢 real case)', async () => {
    // 브랜드명은 蔵元 간 충돌한다 — 전역 UNIQUE 였으면 둘 중 하나가 못 들어간다
    const a = await call<BrandRes>('POST', '/brands', { name: '亀齢', brewery: '岡崎酒造' });
    const b = await call<BrandRes>('POST', '/brands', { name: '亀齢', brewery: '亀齢酒造' });
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(a.body.brand.id).not.toBe(b.body.brand.id);
    const all = await call<Brand[]>('GET', '/brands');
    expect(all.body.filter((x) => x.name === '亀齢').length).toBe(2);
  });

  it('18. same brand name twice under ONE brewery dedups (created:false)', async () => {
    const first = await call<BrandRes>('POST', '/brands', { name: '而今', brewery: '木屋正酒造' });
    expect(first.body.created).toBe(true);
    const second = await call<BrandRes>('POST', '/brands', { name: '而今　', brewery: '木屋正酒造' }); // 全角 space
    expect(second.body.created).toBe(false);
    expect(second.body.brand.id).toBe(first.body.brand.id);
  });

  it('19. brand delete: 409 while a sake references it, 200 after', async () => {
    const s = await call<UpsertRes>('POST', '/sakes', { name: '而今 特別純米', brewery: '木屋正酒造', brand: '而今' });
    const brandId = s.body.sake.brand_id;
    const blocked = await call<ErrRes>('DELETE', `/brands/${brandId}`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error).toBe('brand in use');
    expect(blocked.body.count).toBe(1);

    await call('DELETE', `/sakes/${s.body.sake.id}`);
    const ok = await call<{ ok: true }>('DELETE', `/brands/${brandId}`);
    expect(ok.status).toBe(200);
  });

  it('20. same sake name under different brands of one brewery coexists (UNIQUE is per-brand)', async () => {
    const a = await call<UpsertRes>('POST', '/sakes', { name: '純米吟醸', brewery: '木屋正酒造', brand: '而今' });
    const b = await call<UpsertRes>('POST', '/sakes', { name: '純米吟醸', brewery: '木屋正酒造', brand: '高砂' });
    expect(a.body.created).toBe(true);
    expect(b.body.created).toBe(true); // v1 의 UNIQUE(brewery_id, name_norm) 였으면 dedup 돼버렸다
    expect(a.body.sake.id).not.toBe(b.body.sake.id);
  });

  it('21. brands can be reassigned to another brewery via PUT (fix a wrong link)', async () => {
    const made = await call<BrandRes>('POST', '/brands', { name: '而今', brewery: '間違い酒造' });
    const moved = await call<{ ok: true }>('PUT', `/brands/${made.body.brand.id}`, {
      name: '而今', brewery: '木屋正酒造',
    });
    expect(moved.status).toBe(200);
    const row = await call<Brand>('GET', `/brands/${made.body.brand.id}`);
    expect(row.body.brewery).toBe('木屋正酒造');
  });

  it('22. brands?brewery_id= narrows to that brewery only', async () => {
    await call('POST', '/brands', { name: '而今', brewery: '木屋正酒造' });
    const other = await call<BrandRes>('POST', '/brands', { name: '十四代', brewery: '高木酒造' });
    const filtered = await call<Brand[]>('GET', `/brands?brewery_id=${other.body.brand.brewery_id}`);
    expect(filtered.body.length).toBe(1);
    expect(filtered.body[0].name).toBe('十四代');
  });

  it('23. stripBrewerySuffix: longest suffix wins, and a bare name is left alone', () => {
    expect(stripBrewerySuffix('飛良泉本舗')).toBe('飛良泉');
    expect(stripBrewerySuffix('小嶋総本店')).toBe('小嶋'); // 総本店 が 本店 より先
    expect(stripBrewerySuffix('玉村本店')).toBe('玉村');
    expect(stripBrewerySuffix('新政酒造')).toBe('新政');
    expect(stripBrewerySuffix('八海醸造')).toBe('八海');
    expect(stripBrewerySuffix('山本酒造店')).toBe('山本'); // 酒造店 が 酒造 より先
    expect(stripBrewerySuffix('澄川酒造場')).toBe('澄川');
    expect(stripBrewerySuffix('秋田酒類製造')).toBe('秋田');
    expect(stripBrewerySuffix('清水清三郎商店')).toBe('清水清三郎');
    expect(stripBrewerySuffix('吉乃川')).toBe('吉乃川'); // 접미사 없음 → 그대로
    expect(stripBrewerySuffix('北鹿')).toBe('北鹿');
    expect(stripBrewerySuffix('酒造')).toBe('酒造'); // 전부 잘라내면 빈 문자열 → 손대지 않는다
  });
});

describe('db migration (ensureColumns — idempotent ALTER)', () => {
  it('24. adds v1.1 columns to a v1-schema table without new columns', () => {
    // a table created by an older (v1) db.ts run — no brand/yomigana columns
    const legacy = new Database(':memory:');
    legacy.run('CREATE TABLE sakes (id TEXT PRIMARY KEY, name TEXT, name_norm TEXT)');
    legacy.run('CREATE TABLE breweries (id TEXT PRIMARY KEY, name TEXT, name_norm TEXT)');

    ensureColumns(legacy, 'sakes', { brand: 'TEXT', yomigana: 'TEXT', brandYomigana: 'TEXT' });
    ensureColumns(legacy, 'breweries', { yomigana: 'TEXT' });
    // running again must be a no-op (SQLite throws "duplicate column" on a re-ADD)
    ensureColumns(legacy, 'sakes', { brand: 'TEXT', yomigana: 'TEXT', brandYomigana: 'TEXT' });

    const sakeCols = new Set(
      (legacy.query('PRAGMA table_info(sakes)').all() as { name: string }[]).map((r) => r.name),
    );
    expect(sakeCols.has('brand')).toBe(true);
    expect(sakeCols.has('yomigana')).toBe(true);
    expect(sakeCols.has('brandYomigana')).toBe(true);
    const breweryCols = new Set(
      (legacy.query('PRAGMA table_info(breweries)').all() as { name: string }[]).map((r) => r.name),
    );
    expect(breweryCols.has('yomigana')).toBe(true);

    // the added columns actually store data
    legacy.run(
      "INSERT INTO sakes (id, name, name_norm, brand, yomigana, brandYomigana) VALUES ('x', 'スパークリング', 'スパークリング', '獺祭', 'すぱー', 'だっさい')",
    );
    const row = legacy.query('SELECT brand, brandYomigana FROM sakes WHERE id = ?').get('x') as
      { brand: string; brandYomigana: string };
    expect(row.brand).toBe('獺祭');
    expect(row.brandYomigana).toBe('だっさい');
    legacy.close();
  });
});

describe('db migration (renameColumn — region → prefecture, v1.2)', () => {
  it('25. renames region→prefecture preserving the value, adds address, re-run is a no-op', () => {
    // a v1.1-schema table: region is one free-text box holding 「都道府県+住所」 (the real prod row)
    const legacy = new Database(':memory:');
    legacy.run('CREATE TABLE breweries (id TEXT PRIMARY KEY, name TEXT, name_norm TEXT, yomigana TEXT, region TEXT)');
    legacy.run(
      "INSERT INTO breweries (id, name, name_norm, yomigana, region) VALUES ('x', '飛良泉', '飛良泉', 'ひらいずみ', '秋田県にかほし平沢町')",
    );

    renameColumn(legacy, 'breweries', 'region', 'prefecture');
    ensureColumns(legacy, 'breweries', { yomigana: 'TEXT', prefecture: 'TEXT', address: 'TEXT' });
    // re-run must be a no-op: rename would throw "no such column: region", ADD would throw "duplicate"
    renameColumn(legacy, 'breweries', 'region', 'prefecture');
    ensureColumns(legacy, 'breweries', { yomigana: 'TEXT', prefecture: 'TEXT', address: 'TEXT' });

    const cols = new Set(
      (legacy.query('PRAGMA table_info(breweries)').all() as { name: string }[]).map((r) => r.name),
    );
    expect(cols.has('region')).toBe(false);
    expect(cols.has('prefecture')).toBe(true);
    expect(cols.has('address')).toBe(true);

    // the rename carries the old value across (an ADD+DROP would have dropped it on the floor)
    const row = legacy.query('SELECT prefecture, address FROM breweries WHERE id = ?').get('x') as
      { prefecture: string; address: string | null };
    expect(row.prefecture).toBe('秋田県にかほし平沢町');
    expect(row.address).toBe(null);
    legacy.close();
  });
});

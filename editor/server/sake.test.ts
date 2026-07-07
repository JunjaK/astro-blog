import { beforeEach, describe, expect, it } from 'bun:test';
import type { Brewery, Sake } from './sake';

// In-memory DB so these cases never touch the real dev file. This wins only when THIS file
// loads ./db first (standalone `bun test server/sake.test.ts`). In the full `bun test` suite
// bun shares the module registry across files, so ./db may already be cached against the real
// path (autofill.test.ts imports ./index → ./db earlier) — the beforeEach wipe below keeps the
// 8 cases deterministic either way. Set BEFORE the dynamic import that instantiates the db.
process.env.DB_PATH = ':memory:';
const { sake } = await import('./sake');
const { db } = await import('./db');

beforeEach(() => {
  db.run('DELETE FROM sakes');
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
type ErrRes = { error: string; count?: number };

describe('sake CRUD router', () => {
  it('1. CRUD roundtrip: create → list → by-id → update → delete → 404', async () => {
    const created = await call<UpsertRes>('POST', '/sakes', { name: '獺祭', seimaiBuai: 45 });
    expect(created.status).toBe(200);
    expect(created.body.created).toBe(true);
    const id = created.body.sake.id;
    expect(id.length).toBe(8); // randomBytes(6).base64url

    const list = await call<Sake[]>('GET', '/sakes');
    expect(list.body.some((s) => s.id === id)).toBe(true);

    const byId = await call<Sake>('GET', `/sakes/${id}`);
    expect(byId.status).toBe(200);
    expect(byId.body.name).toBe('獺祭');
    expect(byId.body.seimaiBuai).toBe(45);
    expect((byId.body as Record<string, unknown>).name_norm).toBeUndefined(); // internal column hidden

    const put = await call<{ ok: true }>('PUT', `/sakes/${id}`, { name: '獺祭 純米', seimaiBuai: 39 });
    expect(put.status).toBe(200);
    expect(put.body.ok).toBe(true);
    const after = await call<Sake>('GET', `/sakes/${id}`);
    expect(after.body.name).toBe('獺祭 純米');
    expect(after.body.seimaiBuai).toBe(39);

    const del = await call<{ ok: true }>('DELETE', `/sakes/${id}`);
    expect(del.status).toBe(200);
    const gone = await call<ErrRes>('GET', `/sakes/${id}`);
    expect(gone.status).toBe(404);
  });

  it('2. normalization: full-width "獺祭　４５" dedups with "獺祭 45" (created:false, count 1)', async () => {
    const first = await call<UpsertRes>('POST', '/sakes', { name: '獺祭　４５' }); // U+3000 + full-width digits
    expect(first.body.created).toBe(true);
    const second = await call<UpsertRes>('POST', '/sakes', { name: '獺祭 45' }); // half-width
    expect(second.body.created).toBe(false);
    const list = await call<Sake[]>('GET', '/sakes');
    expect(list.body.length).toBe(1);
  });

  it('3. LIKE escape: "a_b" query matches only literal a_b (not axb); "50%" matches 50%off', async () => {
    await call('POST', '/sakes', { name: 'a_b' });
    await call('POST', '/sakes', { name: 'axb' });
    const under = await call<Sake[]>('GET', `/sakes?q=${encodeURIComponent('a_b')}`);
    expect(under.body.length).toBe(1);
    expect(under.body[0].name).toBe('a_b');

    await call('POST', '/sakes', { name: '50%off' });
    const pct = await call<Sake[]>('GET', `/sakes?q=${encodeURIComponent('50%')}`);
    expect(pct.body.some((s) => s.name === '50%off')).toBe(true);
  });

  it('4. upsert COALESCE: augments without clobbering prior non-null values', async () => {
    const first = await call<UpsertRes>('POST', '/sakes', { name: '久保田', seimaiBuai: 50 });
    const id = first.body.sake.id;
    const second = await call<UpsertRes>('POST', '/sakes', { name: '久保田', alcohol: 15 }); // seimaiBuai omitted
    expect(second.body.created).toBe(false);
    const row = await call<Sake>('GET', `/sakes/${id}`);
    expect(row.body.seimaiBuai).toBe(50); // preserved
    expect(row.body.alcohol).toBe(15); // added
  });

  it('5. brewery delete: 409 while referenced, 200 after the sake is removed', async () => {
    const s = await call<UpsertRes>('POST', '/sakes', { name: '獺祭', brewery: '旭酒造' });
    const breweries = await call<Brewery[]>('GET', '/breweries');
    const b = breweries.body.find((x) => x.name === '旭酒造');
    expect(b).toBeDefined();

    const blocked = await call<ErrRes>('DELETE', `/breweries/${b!.id}`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error).toBe('brewery in use');
    expect(blocked.body.count).toBe(1);

    await call('DELETE', `/sakes/${s.body.sake.id}`);
    const ok = await call<{ ok: true }>('DELETE', `/breweries/${b!.id}`);
    expect(ok.status).toBe(200);
  });

  it('6. brewery auto-create: POST sake with brewery name → row + brewery_id + join', async () => {
    const s = await call<UpsertRes>('POST', '/sakes', { name: '而今', brewery: '木屋正酒造' });
    expect(s.body.sake.brewery).toBe('木屋正酒造');
    expect(typeof s.body.sake.brewery_id).toBe('string');
    const breweries = await call<Brewery[]>('GET', '/breweries');
    expect(breweries.body.some((b) => b.name === '木屋正酒造')).toBe(true);
  });

  it('7. riceType roundtrips as string[]', async () => {
    const s = await call<UpsertRes>('POST', '/sakes', { name: '田酒', riceType: ['山田錦', '雄町'] });
    const row = await call<Sake>('GET', `/sakes/${s.body.sake.id}`);
    expect(row.body.riceType).toEqual(['山田錦', '雄町']);
  });

  it('8. name validation: empty and whitespace-only names are rejected 400', async () => {
    const empty = await call<ErrRes>('POST', '/sakes', { name: '' });
    expect(empty.status).toBe(400);
    const ws = await call<ErrRes>('POST', '/sakes', { name: '　' }); // full-width space only → normalizes to ''
    expect(ws.status).toBe(400);
  });
});

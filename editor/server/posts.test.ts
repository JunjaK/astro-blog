import { describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';

// In-memory DB + a scratch BLOG_CONTENT dir, same shape as sake.test.ts: env vars set BEFORE the
// dynamic import that instantiates the module-level consts in db.ts / posts.ts.
process.env.DB_PATH = ':memory:';
const TMP = mkdtempSync(join(tmpdir(), 'posts-test-'));
const BLOG_CONTENT = join(TMP, 'content');
mkdirSync(BLOG_CONTENT, { recursive: true });
process.env.BLOG_CONTENT = BLOG_CONTENT;

const { posts } = await import('./posts');
const { db } = await import('./db');

async function call<T>(method: string, path: string, body?: unknown): Promise<{ status: number; body: T }> {
  const res = await posts.request(path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as T };
}

interface CreateRes { id: string }
interface ErrRes { error: string }
interface ListItem { id: string; category: string; slug: string; title: string | null; source: string; created_at: string | null }
interface DocRes { frontmatter: Record<string, unknown>; segments: { kind: string; src: string }[] }
interface RawRes { id: string; category: string; title: string | null; source: string; raw: string; frontmatter: string; body: string }
interface PublishRes { path: string; hash: string }

const VALID_FM = { title: '테스트 글', category: 'Diary', created: '2026-07-17' };

describe('posts router — create (POST /posts)', () => {
  it('1. create roundtrip: POST → id shape → shows in GET list → GET doc parses segments', async () => {
    const created = await call<CreateRes>('POST', '/posts', {
      frontmatter: VALID_FM,
      body: '본문 텍스트',
      slug: 'roundtrip-post',
    });
    expect(created.status).toBe(201);
    expect(created.body.id).toBe('diary/roundtrip-post'); // category lowered, slug appended

    const list = await call<ListItem[]>('GET', '/posts');
    expect(list.status).toBe(200);
    expect(list.body.some((p) => p.id === 'diary/roundtrip-post')).toBe(true);

    const doc = await call<DocRes>('GET', `/doc/${created.body.id}`);
    expect(doc.status).toBe(200);
    expect(doc.body.frontmatter.title).toBe('테스트 글');
    expect(doc.body.segments.some((s) => s.src.includes('본문 텍스트'))).toBe(true);
  });

  it('2. 400 bad payload: missing/wrong-typed frontmatter, body, or slug', async () => {
    const noFm = await call<ErrRes>('POST', '/posts', { body: 'x', slug: 'a' });
    expect(noFm.status).toBe(400);
    expect(noFm.body.error).toBe('bad payload');

    const noBody = await call<ErrRes>('POST', '/posts', { frontmatter: VALID_FM, slug: 'a' });
    expect(noBody.status).toBe(400);
    expect(noBody.body.error).toBe('bad payload');

    const noSlug = await call<ErrRes>('POST', '/posts', { frontmatter: VALID_FM, body: 'x' });
    expect(noSlug.status).toBe(400);
    expect(noSlug.body.error).toBe('bad payload');

    const arrayFm = await call<ErrRes>('POST', '/posts', { frontmatter: [], body: 'x', slug: 'a' });
    expect(arrayFm.status).toBe(400);
    expect(arrayFm.body.error).toBe('bad payload');
  });

  it('3. 400 title required: missing or blank title', async () => {
    const missing = await call<ErrRes>('POST', '/posts', {
      frontmatter: { category: 'diary', created: '2026-07-17' }, body: 'x', slug: 'no-title',
    });
    expect(missing.status).toBe(400);
    expect(missing.body.error).toBe('title required');

    const blank = await call<ErrRes>('POST', '/posts', {
      frontmatter: { title: '   ', category: 'diary', created: '2026-07-17' }, body: 'x', slug: 'blank-title',
    });
    expect(blank.status).toBe(400);
    expect(blank.body.error).toBe('title required');
  });

  it('4. 400 created required: missing created', async () => {
    const res = await call<ErrRes>('POST', '/posts', {
      frontmatter: { title: 't', category: 'diary' }, body: 'x', slug: 'no-created',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('created required');
  });

  it('5. 400 invalid category: not in the allowlist (checked case-insensitively)', async () => {
    const res = await call<ErrRes>('POST', '/posts', {
      frontmatter: { title: 't', category: 'notarealcategory', created: '2026-07-17' }, body: 'x', slug: 'bad-cat',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid category');

    // sanity: uppercase category (as authored in real content frontmatter) IS accepted
    const ok = await call<CreateRes>('POST', '/posts', {
      frontmatter: { title: 't', category: 'Web', created: '2026-07-17' }, body: 'x', slug: 'cap-category',
    });
    expect(ok.status).toBe(201);
    expect(ok.body.id).toBe('web/cap-category');
  });

  it('6. 400 invalid slug: uppercase, spaces, slashes, dots all rejected', async () => {
    for (const slug of ['Has-Caps', 'has space', 'has/slash', '../traverse', 'trailing-']) {
      const res = await call<ErrRes>('POST', '/posts', { frontmatter: VALID_FM, body: 'x', slug });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid slug');
    }
  });

  it('7. 409 id exists: duplicate category/slug rejected, nothing overwritten', async () => {
    const first = await call<CreateRes>('POST', '/posts', { frontmatter: VALID_FM, body: 'first', slug: 'dup-post' });
    expect(first.status).toBe(201);
    const second = await call<ErrRes>('POST', '/posts', { frontmatter: VALID_FM, body: 'second', slug: 'dup-post' });
    expect(second.status).toBe(409);
    expect(second.body.error).toBe('id exists');
    const raw = await call<RawRes>('GET', '/posts/diary/dup-post');
    expect(raw.body.body).toBe('first'); // untouched by the rejected duplicate
  });
});

describe('posts router — moved routes regression (GET list/doc/raw, PUT)', () => {
  it('8. GET /posts list returns the expected projection shape', async () => {
    await call('POST', '/posts', { frontmatter: VALID_FM, body: 'x', slug: 'list-shape' });
    const list = await call<ListItem[]>('GET', '/posts');
    const row = list.body.find((p) => p.id === 'diary/list-shape');
    expect(row).toBeDefined();
    expect(row!.category).toBe('Diary');
    expect(row!.source).toBe('editor');
  });

  it('9. GET /posts/:id{.+} raw = matter.stringify(body, frontmatter)', async () => {
    await call('POST', '/posts', { frontmatter: VALID_FM, body: '본문', slug: 'raw-check' });
    const res = await call<RawRes>('GET', '/posts/diary/raw-check');
    expect(res.status).toBe(200);
    expect(res.body.raw).toBe(matter.stringify('본문', VALID_FM));
  });

  it('10. GET /doc/:id{.+} 404s for an unknown id', async () => {
    const res = await call<ErrRes>('GET', '/doc/diary/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not found');
  });

  it('11. PUT /posts/:id{.+} updates frontmatter/body and bumps version; 404 for unknown id', async () => {
    const created = await call<CreateRes>('POST', '/posts', { frontmatter: VALID_FM, body: 'orig', slug: 'put-check' });
    const put = await call<{ ok: true }>('PUT', `/posts/${created.body.id}`, {
      frontmatter: { ...VALID_FM, title: '수정됨' }, body: 'edited',
    });
    expect(put.status).toBe(200);
    const after = await call<RawRes>('GET', `/posts/${created.body.id}`);
    expect(after.body.title).toBe('수정됨');
    expect(after.body.body).toBe('edited');

    const missing = await call<ErrRes>('PUT', '/posts/diary/no-such-id', { frontmatter: VALID_FM, body: 'x' });
    expect(missing.status).toBe(404);
  });
});

describe('posts router — publish (POST /publish/:id{.+})', () => {
  it('12. publish 404s when the post id does not exist (checked BEFORE any path math)', async () => {
    const res = await call<ErrRes>('POST', '/publish/diary/never-created');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not found');
  });

  it('13. publish 503s when BLOG_CONTENT root is missing (checked BEFORE mkdir)', async () => {
    const created = await call<CreateRes>('POST', '/posts', { frontmatter: VALID_FM, body: 'x', slug: 'root-missing' });
    rmSync(BLOG_CONTENT, { recursive: true, force: true });
    try {
      const res = await call<ErrRes>('POST', `/publish/${created.body.id}`);
      expect(res.status).toBe(503);
      expect(res.body.error).toBe('content dir missing');
      expect(existsSync(BLOG_CONTENT)).toBe(false); // recursive mkdir must NOT have silently created the root
    } finally {
      mkdirSync(BLOG_CONTENT, { recursive: true }); // restore for the remaining tests
    }
  });

  it('14. publish success: writes matter.stringify(body, frontmatter) to BLOG_CONTENT/<id>.mdx, updates hash in DB', async () => {
    const created = await call<CreateRes>('POST', '/posts', {
      frontmatter: VALID_FM, body: '발행 테스트 본문', slug: 'publish-ok',
    });
    const res = await call<PublishRes>('POST', `/publish/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.path).toBe(`${created.body.id}.mdx`);

    const filePath = join(BLOG_CONTENT, `${created.body.id}.mdx`);
    expect(existsSync(filePath)).toBe(true);
    const written = readFileSync(filePath, 'utf-8');
    const expected = matter.stringify('발행 테스트 본문', VALID_FM);
    expect(written).toBe(expected);
    const expectedHash = createHash('sha256').update(expected).digest('hex').slice(0, 16);
    expect(res.body.hash).toBe(expectedHash);

    const row = db.query('SELECT published_mdx_hash FROM posts WHERE id = ?').get(created.body.id) as
      { published_mdx_hash: string };
    expect(row.published_mdx_hash).toBe(expectedHash);
  });

  it('15. publish path-traversal: encoded-slash id with no matching row 404s before any file write', async () => {
    const res = await posts.request('/publish/..%2f..%2fetc%2fpasswd', { method: 'POST' });
    expect(res.status).toBe(404); // Hono decodes to "../../etc/passwd" — no such row exists
    expect(existsSync(join(TMP, 'etc'))).toBe(false); // nothing escaped BLOG_CONTENT
  });

  it('16. publish path-traversal: a maliciously-crafted row id is rejected by containment (400), not written', async () => {
    // Simulates a hypothetical bypass of the id/slug validation at creation time — containment must
    // still be the boundary (Arch C: no strict id-format re-check here, only resolve+prefix).
    const t = new Date().toISOString();
    db.run(
      `INSERT INTO posts (id, category, slug, title, frontmatter, body, doc_json, source, published_mdx_hash, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, 'editor', NULL, 1, ?, ?)`,
      ['../escaped', 'diary', '../escaped', 'evil', JSON.stringify(VALID_FM), 'x', t, t],
    );
    // literal unencoded ".." collapses at the URL layer before it ever reaches Hono's router
    // (verified empirically — it 404s at the fetch layer, not our handler), so the request must
    // use the encoded form to actually exercise the containment check inside the handler.
    const res = await posts.request('/publish/..%2fescaped', { method: 'POST' });
    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrRes;
    expect(body.error).toBe('invalid path');
    expect(existsSync(join(TMP, 'escaped.mdx'))).toBe(false);
  });
});

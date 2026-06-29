import { createHash } from 'node:crypto';
import matter from 'gray-matter';
import { db } from './db';

// Seed existing blog posts into the DB as source='legacy' (catalog + body mirror).
// Re-runnable: INSERT OR REPLACE keeps it idempotent. Run: bun run seed
const CONTENT = process.env.BLOG_CONTENT ?? '../blog/src/content/blog';

const insert = db.prepare(`
  INSERT OR REPLACE INTO posts
    (id, category, slug, title, frontmatter, body, doc_json, source, published_mdx_hash, version, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, NULL, 'legacy', ?, 1, ?, ?)
`);

let n = 0;
for await (const file of new Bun.Glob('**/*.{md,mdx}').scan({ cwd: CONTENT })) {
  const raw = await Bun.file(`${CONTENT}/${file}`).text();
  const { data, content } = matter(raw);
  const slug = file.replace(/\.(md|mdx)$/, '');
  const category = String(data.category ?? slug.split('/')[0]);
  const created = data.created ? new Date(data.created).toISOString() : null;
  const updated = data.updated ? new Date(data.updated).toISOString() : created;
  const hash = createHash('sha256').update(raw).digest('hex').slice(0, 16);
  insert.run(slug, category, slug, data.title ?? slug, JSON.stringify(data), content, hash, created, updated);
  n++;
}

const total = db.query('SELECT count(*) AS c FROM posts').get() as { c: number };
// eslint-disable-next-line no-console
console.log(`seeded ${n} posts · total ${total.c}`);

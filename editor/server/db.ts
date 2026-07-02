import { mkdirSync } from 'node:fs';
import { Database } from 'bun:sqlite';

// Single content store (D8). Local dev: ./.data/blog.db. posts = one row per article;
// 'draft' is a derived state (serialize(doc_json) != published_mdx_hash), not a column.
const DB_PATH = process.env.DB_PATH ?? './.data/blog.db';
mkdirSync(DB_PATH.replace(/\/[^/]+$/, '') || '.', { recursive: true });

export const db = new Database(DB_PATH);
db.run(`
  CREATE TABLE IF NOT EXISTS posts (
    id                 TEXT PRIMARY KEY,           -- = slug (full path under content/blog, no ext)
    category           TEXT NOT NULL,
    slug               TEXT NOT NULL,
    title              TEXT,
    frontmatter        TEXT NOT NULL,              -- json
    body               TEXT NOT NULL,              -- raw mdx body (legacy) / serialized
    doc_json           TEXT,                       -- TipTap JSON; NULL for legacy until imported
    source             TEXT NOT NULL,              -- 'legacy' | 'editor'
    published_mdx_hash TEXT,                        -- hash of what's live in git (drift detect)
    version            INTEGER NOT NULL DEFAULT 1,
    created_at         TEXT,
    updated_at         TEXT
  )
`);

// Image catalog (plan P2/§8). One row per uploaded/known image (dedup by content hash);
// image_usage tracks which post references which image (orphan detection, asset reuse).
db.run(`
  CREATE TABLE IF NOT EXISTS images (
    path       TEXT PRIMARY KEY,          -- canonical /files/... url of the original
    hash       TEXT NOT NULL,             -- sha256(16hex) of the webp bytes → dedup
    ext        TEXT,
    width      INTEGER,
    height     INTEGER,
    bytes      INTEGER,
    variants   INTEGER NOT NULL DEFAULT 0,-- 1 = sized webp variants generated
    created_at TEXT
  )
`);
db.run('CREATE INDEX IF NOT EXISTS idx_images_hash ON images(hash)');
db.run(`
  CREATE TABLE IF NOT EXISTS image_usage (
    image_path TEXT NOT NULL,
    post_id    TEXT NOT NULL,
    PRIMARY KEY (image_path, post_id)
  )
`);

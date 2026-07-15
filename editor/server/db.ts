import { mkdirSync } from 'node:fs';
import { Database } from 'bun:sqlite';

// Single content store (D8). Local dev: ./.data/blog.db. posts = one row per article;
// 'draft' is a derived state (serialize(doc_json) != published_mdx_hash), not a column.
const DB_PATH = process.env.DB_PATH ?? './.data/blog.db';
// ':memory:' has no parent dir (sake.test.ts uses it); mkdir would create a bogus './:memory:' folder.
if (DB_PATH !== ':memory:') mkdirSync(DB_PATH.replace(/\/[^/]+$/, '') || '.', { recursive: true });

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

// Editor-only sake / brewery master (plan: sake-master-db). `name` = display original,
// `name_norm` = normalizeName() for match/dedup (never exposed in responses). No FK PRAGMA
// (unenforced logical FK) — the app blocks brewery delete with a 409 when still referenced.
db.run(`
  CREATE TABLE IF NOT EXISTS breweries (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    name_norm  TEXT NOT NULL UNIQUE,
    yomigana   TEXT,
    prefecture TEXT,
    address    TEXT,
    note       TEXT,
    created_at TEXT,
    updated_at TEXT
  )
`);
// v2: 蔵元 1:n 브랜드 1:n 사케. brand 는 v1 에서 sakes 의 TEXT 컬럼이었다 — 실체가 없어서 표기
// 흔들림을 막지 못했고(brand 엔 name_norm 도 없었다), 브랜드 rename 이 전 행 UPDATE 였다.
// UNIQUE 는 (brewery_id, name_norm): 브랜드명은 蔵元 간 충돌한다 — 長野 岡崎酒造가 広島 亀齢酒造와
// 겹쳐 「信州亀齢」로 개칭한 게 실례. 전역 UNIQUE 였으면 둘 중 하나를 못 넣는다.
db.run(`
  CREATE TABLE IF NOT EXISTS brands (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    name_norm  TEXT NOT NULL,
    yomigana   TEXT,
    brewery_id TEXT NOT NULL,
    note       TEXT,
    created_at TEXT,
    updated_at TEXT,
    UNIQUE(brewery_id, name_norm)
  )
`);
db.run('CREATE INDEX IF NOT EXISTS idx_brands_brewery ON brands(brewery_id)');

// v1→v2 sakes 재작성. sakes.brewery_id 는 제거 — brand_id 가 있으면 蔵元은 브랜드 경유로 도출되고,
// 둘 다 들면 서로 어긋날 수 있는 사본이 된다. DROP 이 아니라 RENAME 인 이유: 이 파일은 서버 기동 때
// 돌기 때문에, 배포 시점에 누가 사케를 써놨으면 조용히 날아간다. 0행이면 빈 백업이라 무해.
const sakeCols = new Set(
  (db.query('PRAGMA table_info(sakes)').all() as { name: string }[]).map((r) => r.name),
);
if (sakeCols.has('brewery_id')) {
  db.run('ALTER TABLE sakes RENAME TO sakes_v1_backup');
}
db.run(`
  CREATE TABLE IF NOT EXISTS sakes (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    name_norm     TEXT NOT NULL,
    yomigana      TEXT,
    brand_id      TEXT NOT NULL,
    tokuteiMeisho TEXT,
    riceType      TEXT,
    seimaiBuai    INTEGER,
    alcohol       REAL,
    nihonshuDo    REAL,
    sando         REAL,
    note          TEXT,
    created_at    TEXT,
    updated_at    TEXT,
    UNIQUE(brand_id, name_norm)
  )
`);
db.run('CREATE INDEX IF NOT EXISTS idx_sakes_brand ON sakes(brand_id)');

// Idempotent column migration (v1.1 delta). CREATE TABLE IF NOT EXISTS above is a no-op when the
// table predates a column (a prior test run / deployed .data/blog.db has the v1 shape), so add any
// missing column via PRAGMA table_info → ALTER TABLE ADD COLUMN. Exported so sake.test.ts can prove
// it upgrades a v1-schema table. `table`/`columns` are code literals (never user input) → safe DDL.
export function ensureColumns(database: Database, table: string, columns: Record<string, string>) {
  const existing = new Set(
    (database.query(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((r) => r.name),
  );
  for (const [name, type] of Object.entries(columns)) {
    if (!existing.has(name)) database.run(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
  }
}
// Idempotent column rename (v1.2 delta). Same PRAGMA-guard shape as ensureColumns: rename only when
// the old name is still there AND the new one isn't, so a re-run (or a fresh CREATE TABLE above,
// which already has the new name) is a no-op. Preserves existing values — ADD+DROP would not.
export function renameColumn(database: Database, table: string, from: string, to: string) {
  const cols = new Set(
    (database.query(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((r) => r.name),
  );
  if (cols.has(from) && !cols.has(to)) database.run(`ALTER TABLE ${table} RENAME COLUMN ${from} TO ${to}`);
}

// v1.2: breweries.region was one free-text box that in practice held 「都道府県 + 詳細住所」 glued
// together (e.g. '秋田県にかほし平沢町') → split into prefecture (47-item picker) + address (free text).
// Rename BEFORE ensureColumns so the PRAGMA check below sees the new name and skips re-adding it.
renameColumn(db, 'breweries', 'region', 'prefecture');
ensureColumns(db, 'breweries', { yomigana: 'TEXT', prefecture: 'TEXT', address: 'TEXT' });
// sakes 는 위에서 v2 스키마로 재작성되므로 v1.1 의 ensureColumns(brand/yomigana/brandYomigana)는 불필요.

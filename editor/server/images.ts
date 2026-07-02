import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';
import { db } from './db';

// Body-image variant tiers — MUST match blog/src/utils/imageVariant.ts (foo-<w>.webp).
const SIZES = [480, 960, 1600] as const;
const IMG_URL_RE = /\/files\/[^\s"')]+\.(?:webp|png|jpe?g)/gi;
// only our own suffixes (must match blog/src/utils/generateVariants.js) — a real original
// named foo-2.webp is NOT a variant, so don't drop it from usage.
const isVariant = (url: string) => /-(?:thumb|480|960|1600)\.webp$/i.test(url);

// Write sibling downscaled webp variants (<base>-480.webp …) next to the full image.
export async function writeVariants(full: Buffer, baseName: string, dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  for (const w of SIZES) {
    const out = await sharp(full).resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    await Bun.write(`${dir}/${baseName}-${w}.webp`, out);
  }
}

// Upsert an images-catalog row (dedup key = content hash).
export function catalogImage(path: string, full: Buffer, width: number, height: number): void {
  const hash = createHash('sha256').update(full).digest('hex').slice(0, 16);
  db.run(
    `INSERT INTO images (path, hash, ext, width, height, bytes, variants, created_at)
     VALUES (?, ?, 'webp', ?, ?, ?, 1, ?)
     ON CONFLICT(path) DO UPDATE SET
       hash = excluded.hash, width = excluded.width, height = excluded.height,
       bytes = excluded.bytes, variants = 1`,
    [path, hash, width, height, full.length, new Date().toISOString()],
  );
}

// Replace the set of images a post references (parsed from its body's /files URLs).
export function setImageUsage(postId: string, body: string): void {
  const urls = new Set<string>();
  for (const m of body.matchAll(IMG_URL_RE)) if (!isVariant(m[0])) urls.add(m[0]);
  const ins = db.query('INSERT OR IGNORE INTO image_usage (image_path, post_id) VALUES (?, ?)');
  db.transaction(() => { // atomic: never leave a post with a half-rebuilt usage set
    db.run('DELETE FROM image_usage WHERE post_id = ?', [postId]);
    for (const u of urls) ins.run(u, postId);
  })();
}

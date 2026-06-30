import * as fs from 'node:fs';
import * as path from 'node:path';
import { glob } from 'glob';
import sharp from 'sharp';

// Downscaled WebP variants for BODY images (DiaryCarousel slides, inline ImageLoader).
// Convention: /files/a/foo.png -> /files/a/foo-480.webp (sibling, sized suffix).
// Distinct from cover thumbnails (-thumb.webp, generateThumbnails.js). Does NOT touch
// MDX — originals stay; components derive variant URLs via src/utils/imageVariant.ts.
// Idempotent (mtime). Additive (never overwrites originals).
//
//   node ./src/utils/generateVariants.js [--match <substr>] [--dry-run] [--force]

const ROOT = process.cwd();
const IMAGE_ASSETS_DIR = path.join(ROOT, 'image-assets');
const CONTENT_DIR = path.join(ROOT, 'src/content');
const SIZES = [480, 960, 1600]; // 480/960 carousel slides; 1600 for inline retina

const FLAGS = { dryRun: process.argv.includes('--dry-run'), force: process.argv.includes('--force') };
const matchArg = (() => { const i = process.argv.indexOf('--match'); return i >= 0 ? process.argv[i + 1] : null; })();

const IMG_URL_RE = /\/files\/[^\s"')]+\.(?:png|jpe?g|webp)/gi;
const isVariant = (url) => /-(?:thumb|\d+)\.webp$/i.test(url); // skip existing thumbs/variants

const urlToLocal = (url) => (url.startsWith('/files/') ? path.join(IMAGE_ASSETS_DIR, url.replace(/^\/files\//, '')) : null);
const variantLocal = (local, w) => { const p = path.parse(local); return path.join(p.dir, `${p.name}-${w}.webp`); };

function imageUrls(content) {
  const set = new Set();
  for (const m of content.matchAll(IMG_URL_RE)) if (!isVariant(m[0])) set.add(m[0]);
  return [...set];
}

async function main() {
  let files = glob.sync(`${CONTENT_DIR}/**/*.{md,mdx}`);
  if (matchArg) files = files.filter((f) => f.includes(matchArg));
  console.log(`=== Variant Generator ===${FLAGS.dryRun ? ' (dry-run)' : ''}`);
  console.log(`Scanning ${files.length} file(s)${matchArg ? ` matching "${matchArg}"` : ''}, sizes [${SIZES.join(', ')}]\n`);

  let gen = 0, skip = 0, missing = 0, origTotal = 0, varTotal = 0;
  const seen = new Set();
  for (const file of files) {
    for (const url of imageUrls(fs.readFileSync(file, 'utf-8'))) {
      if (seen.has(url)) continue;
      seen.add(url);
      const local = urlToLocal(url);
      if (!local || !fs.existsSync(local)) { missing++; console.log(`  MISS ${url}`); continue; }
      const origMtime = fs.statSync(local).mtimeMs;
      for (const w of SIZES) {
        const out = variantLocal(local, w);
        if (!FLAGS.force && fs.existsSync(out) && fs.statSync(out).mtimeMs >= origMtime) { skip++; continue; }
        if (FLAGS.dryRun) { console.log(`  would gen ${path.relative(ROOT, out)}`); gen++; continue; }
        await sharp(local).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toFile(out);
        origTotal += fs.statSync(local).size; varTotal += fs.statSync(out).size; gen++;
        console.log(`  GEN  ${path.relative(ROOT, out)}`);
      }
    }
  }
  console.log(`\n${FLAGS.dryRun ? 'would generate' : 'generated'} ${gen}, skipped ${skip}, missing-original ${missing}`);
  if (varTotal) console.log(`orig ${(origTotal / 1e6).toFixed(1)}MB → variants ${(varTotal / 1e6).toFixed(1)}MB (${((1 - varTotal / origTotal) * 100).toFixed(0)}% smaller)`);
}

main().catch((e) => { console.error(e); process.exit(1); });

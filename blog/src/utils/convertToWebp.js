import * as fs from 'node:fs';
import * as path from 'node:path';
import { glob } from 'glob';
import sharp from 'sharp';

// Convert legacy raster originals (png/jpeg/gif) → webp, and rewrite MDX references.
//   png  → lossless webp (crisp screenshots)
//   jpeg → q85 webp
//   gif  → animated webp
// Variant files (-480/960/1600.webp) are NOT touched (their names don't depend on the
// original's extension). Collisions (a foo.webp already exists next to foo.png) are skipped
// + reported, and their refs are left alone. Idempotent. Dry-run default. NEVER deletes
// originals (that's a separate, verify-gated step).
//
//   node ./src/utils/convertToWebp.js            # dry-run: report scope + collisions
//   node ./src/utils/convertToWebp.js --apply     # convert files + rewrite refs

const ROOT = process.cwd();
const IMAGE_ASSETS_DIR = path.join(ROOT, 'image-assets');
const CONTENT_DIR = path.join(ROOT, 'src/content');
const APPLY = process.argv.includes('--apply');

const isVariant = (p) => /-(?:thumb|480|960|1600)\.webp$/i.test(p);
const localToUrl = (local) => `/files/${path.relative(IMAGE_ASSETS_DIR, local).split(path.sep).join('/')}`;

function convert(src, dst, ext) {
  if (ext === 'gif') return sharp(src, { animated: true }).webp().toFile(dst);
  if (ext === 'png') return sharp(src).webp({ lossless: true }).toFile(dst); // lossless: text stays crisp
  return sharp(src).rotate().webp({ quality: 85 }).toFile(dst); // jpeg (bake EXIF)
}

async function main() {
  const files = glob.sync(`${IMAGE_ASSETS_DIR}/**/*.{png,jpg,jpeg,gif,PNG,JPG,JPEG,GIF}`).filter((f) => !isVariant(f));
  console.log(`=== Convert to WebP ===${APPLY ? ' (APPLY)' : ' (dry-run)'}\n${files.length} raster originals\n`);

  const renameMap = new Map(); // oldUrl → newUrl, only for successfully-targeted files
  let converted = 0, collision = 0, origBytes = 0, webpBytes = 0;
  for (const src of files) {
    const p = path.parse(src);
    const ext = p.ext.slice(1).toLowerCase();
    const dst = path.join(p.dir, `${p.name}.webp`);
    if (fs.existsSync(dst)) { // a different webp already owns this stem → don't clobber, don't rewrite
      collision++;
      console.log(`  COLLISION  ${path.relative(ROOT, src)}  (${p.name}.webp exists)`);
      continue;
    }
    if (APPLY) {
      try {
        await convert(src, dst, ext);
      } catch (e) {
        console.log(`  FAIL  ${path.relative(ROOT, src)}: ${e.message}`);
        continue; // skip this file (don't rewrite its ref); re-run picks it up
      }
      webpBytes += fs.statSync(dst).size;
    }
    origBytes += fs.statSync(src).size;
    renameMap.set(localToUrl(src), localToUrl(dst));
    converted++;
  }

  // Match full, delimiter-bounded /files URLs (no prefix corruption) and map only exact
  // hits that were actually converted (collisions aren't in renameMap → left untouched).
  const URL_RE = /\/files\/[^\s"')]+\.(?:png|jpe?g|gif)/gi;
  let mdxTouched = 0, refs = 0;
  for (const file of glob.sync(`${CONTENT_DIR}/**/*.{md,mdx}`)) {
    const c = fs.readFileSync(file, 'utf-8');
    let changed = false;
    const nc = c.replace(URL_RE, (m) => {
      const nu = renameMap.get(m);
      if (nu) { changed = true; refs++; return nu; }
      return m;
    });
    if (changed) { mdxTouched++; if (APPLY) fs.writeFileSync(file, nc, 'utf-8'); }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  ${APPLY ? 'converted' : 'would convert'}: ${converted}`);
  console.log(`  collisions (skipped — resolve manually): ${collision}`);
  console.log(`  MDX ${APPLY ? 'rewritten' : 'to rewrite'}: ${mdxTouched} files, ${refs} refs`);
  if (APPLY && origBytes) console.log(`  size: ${(origBytes / 1e6).toFixed(0)}MB → ${(webpBytes / 1e6).toFixed(0)}MB (${((1 - webpBytes / origBytes) * 100).toFixed(0)}% smaller)`);
  console.log(`\n  originals NOT deleted (gated). After build-verify: find image-assets -type f \\( -name '*.png' -o -name '*.jpeg' -o -name '*.jpg' -o -name '*.gif' \\) ! -name '*-*.webp' -delete`);
}

main().catch((e) => { console.error(e); process.exit(1); });

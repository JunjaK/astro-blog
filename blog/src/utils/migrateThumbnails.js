import * as fs from 'node:fs';
import * as path from 'node:path';
import { glob } from 'glob';

// P5 migration: retire separate cover thumbnails (`*-thumb.webp`). Rewrites each post's
// frontmatter `thumbnail:` to the RESOLVED ORIGINAL image (which, for most posts, is
// already a body image → dedup). SAFE ORDER (see plan §5): rewrite covers → verify build
// → strip `thumb:true` → retire generateThumbnails → delete `-thumb.webp` LAST.
//
// This script does ONLY the reversible frontmatter rewrite (git-tracked). It NEVER deletes
// files and NEVER touches body `thumb:true` — those are reported as a gated checklist.
//
//   node ./src/utils/migrateThumbnails.js            # dry-run (default): report only
//   node ./src/utils/migrateThumbnails.js --apply     # rewrite frontmatter thumbnails

const ROOT = process.cwd();
const IMAGE_ASSETS_DIR = path.join(ROOT, 'image-assets');
const CONTENT_DIR = path.join(ROOT, 'src/content');
const APPLY = process.argv.includes('--apply');

const THUMB_RE = /^(thumbnail:\s*)(\S+)/m;

// Resolve a `-thumb.webp` cover to its real original on disk. Handles:
//  - normal:      foo-thumb.webp   → foo.png/.jpeg/...
//  - literal trap: blog-create1-thumb.webp → blog-create1-thumb.png (original named -thumb.png)
//  - type trap:   sarkaz-support has .mp4 + .png → prefer image exts (never .mp4/.mov)
// Returns the resolved /files url, or null when no image original exists (blocker).
function resolveOriginal(thumbUrl) {
  if (!thumbUrl.startsWith('/files/') || !thumbUrl.endsWith('-thumb.webp')) return null;
  const rel = thumbUrl.replace(/^\/files\//, '');
  const bases = [rel.replace(/-thumb\.webp$/, ''), rel.replace(/\.webp$/, '')]; // (a) strip -thumb.webp, (b) strip .webp
  const exts = ['.png', '.jpeg', '.jpg', '.webp', '.gif']; // image only
  for (const base of bases) {
    for (const ext of exts) {
      const candRel = base + ext;
      if (candRel === rel) continue; // never resolve to the thumb itself
      if (fs.existsSync(path.join(IMAGE_ASSETS_DIR, candRel))) return `/files/${candRel}`;
    }
  }
  return null;
}

function main() {
  const files = glob.sync(`${CONTENT_DIR}/**/*.{md,mdx}`);
  console.log(`=== Thumbnail Migration ===${APPLY ? ' (APPLY)' : ' (dry-run)'}\nScanning ${files.length} posts\n`);

  let rewrite = 0, already = 0, blocked = 0, noThumb = 0;
  const blockers = [];
  const thumbTrue = [];

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const content = fs.readFileSync(file, 'utf-8');

    // report body `thumb: true` (runtime -thumb.webp derivation — blocks blind deletion)
    if (/\bthumb:\s*true\b/.test(content)) thumbTrue.push(rel);

    const m = content.match(THUMB_RE);
    if (!m) { noThumb++; continue; }
    const cur = m[2];
    if (!cur.endsWith('-thumb.webp')) { already++; continue; } // already an original / external

    const orig = resolveOriginal(cur);
    if (!orig) { blocked++; blockers.push(`${rel}  (${cur})`); continue; }

    rewrite++;
    console.log(`  ${APPLY ? 'REWRITE' : 'would rewrite'}  ${rel}\n      ${cur}\n   →  ${orig}`);
    if (APPLY) fs.writeFileSync(file, content.replace(THUMB_RE, `$1${orig}`), 'utf-8');
  }

  // deletion candidates (report only — never deleted here)
  const thumbFiles = glob.sync(`${IMAGE_ASSETS_DIR}/**/*-thumb.webp`);

  console.log(`\n=== Summary ===`);
  console.log(`  covers ${APPLY ? 'rewritten' : 'to rewrite'}: ${rewrite}`);
  console.log(`  already original/external:  ${already}`);
  console.log(`  no thumbnail field:         ${noThumb}`);
  console.log(`  BLOCKED (no original found): ${blocked}`);
  blockers.forEach((b) => console.log(`      ⚠ ${b}`));

  console.log(`\n=== Gated checklist (NOT done by this script) ===`);
  console.log(`  1. Verify build after rewrite (bun run build).`);
  console.log(`  2. Strip \`thumb: true\` from ${thumbTrue.length} file(s) — runtime derives -thumb.webp there:`);
  thumbTrue.forEach((f) => console.log(`      • ${f}`));
  console.log(`  3. Retire generateThumbnails.js from package.json all-preprocess-md + skills.`);
  console.log(`  4. grep -r '\\-thumb\\.webp' src/  → expect 0, THEN delete ${thumbFiles.length} -thumb.webp files.`);
}

main();

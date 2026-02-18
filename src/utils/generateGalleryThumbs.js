import * as fs from 'node:fs';
import * as path from 'node:path';
import { glob } from 'glob';
import sharp from 'sharp';

const ROOT = process.cwd();
const IMAGE_ASSETS_DIR = path.join(ROOT, 'image-assets');
const CONTENT_DIR = path.join(ROOT, 'src/content');

const FLAGS = {
  dryRun: process.argv.includes('--dry-run'),
  force: process.argv.includes('--force'),
};

const THUMB_SIZE = 192; // 4x retina for 48px display

/**
 * Extract image src values from gallerySections export in MDX files.
 * Uses regex — no JS eval needed.
 */
function extractGallerySrcUrls(content) {
  const sectionMatch = content.match(/export\s+const\s+gallerySections\s*=\s*\[[\s\S]*?\n\];/);
  if (!sectionMatch) return [];

  const block = sectionMatch[0];
  const srcRegex = /src:\s*["']([^"']+)["']/g;
  const urls = [];
  let match;
  while ((match = srcRegex.exec(block)) !== null) {
    // Only include image URLs (not videos)
    if (/\.(webp|jpg|jpeg|png|gif)$/i.test(match[1])) {
      urls.push(match[1]);
    }
  }
  return urls;
}

function urlToLocalPath(url) {
  if (!url.startsWith('/files/')) return null;
  return path.join(IMAGE_ASSETS_DIR, url.replace(/^\/files\//, ''));
}

function getThumbPath(originalLocalPath) {
  const dir = path.dirname(originalLocalPath);
  const filename = path.basename(originalLocalPath);
  const thumbDir = path.join(dir, 'thumbnail');
  return path.join(thumbDir, filename);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

async function main() {
  console.log('=== Gallery Thumbnail Generator ===');
  if (FLAGS.dryRun) console.log('  (DRY RUN — no files will be written)\n');
  if (FLAGS.force) console.log('  (--force: regenerating all thumbnails)\n');

  const mdxFiles = glob.sync(`${CONTENT_DIR}/**/diary/**/*.mdx`);
  console.log(`Found ${mdxFiles.length} diary MDX files\n`);

  let totalFound = 0;
  let generated = 0;
  let skipped = 0;
  let totalOrigSize = 0;
  let totalThumbSize = 0;

  for (const file of mdxFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const urls = extractGallerySrcUrls(content);
    if (urls.length === 0) continue;

    const relFile = path.relative(ROOT, file);
    console.log(`${relFile} — ${urls.length} gallery image(s)`);
    totalFound += urls.length;

    for (const url of urls) {
      const localPath = urlToLocalPath(url);
      if (!localPath || !fs.existsSync(localPath)) {
        console.log(`  SKIP (not found): ${url}`);
        skipped++;
        continue;
      }

      const thumbPath = getThumbPath(localPath);

      // Skip if thumbnail is newer than original (unless --force)
      if (!FLAGS.force && fs.existsSync(thumbPath)) {
        const origMtime = fs.statSync(localPath).mtimeMs;
        const thumbMtime = fs.statSync(thumbPath).mtimeMs;
        if (thumbMtime >= origMtime) {
          skipped++;
          continue;
        }
      }

      if (FLAGS.dryRun) {
        console.log(`  WOULD generate: ${path.relative(ROOT, thumbPath)}`);
        continue;
      }

      // Ensure thumbnail directory exists
      const thumbDir = path.dirname(thumbPath);
      fs.mkdirSync(thumbDir, { recursive: true });

      await sharp(localPath)
        .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover' })
        .webp({ quality: 75 })
        .toFile(thumbPath);

      const origSize = fs.statSync(localPath).size;
      const thumbSize = fs.statSync(thumbPath).size;
      totalOrigSize += origSize;
      totalThumbSize += thumbSize;
      generated++;

      console.log(`  GEN  ${path.relative(ROOT, thumbPath)} (${formatBytes(origSize)} → ${formatBytes(thumbSize)})`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`  Total gallery images: ${totalFound}`);
  console.log(`  Generated: ${generated}`);
  console.log(`  Skipped (up to date): ${skipped}`);
  if (totalOrigSize > 0) {
    const reduction = ((1 - totalThumbSize / totalOrigSize) * 100).toFixed(1);
    console.log(`  Original size total: ${formatBytes(totalOrigSize)}`);
    console.log(`  Thumbnail size total: ${formatBytes(totalThumbSize)}`);
    console.log(`  Reduction: ${reduction}%`);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});

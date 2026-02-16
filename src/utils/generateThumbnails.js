import * as fs from 'node:fs';
import * as path from 'node:path';
import { glob } from 'glob';
import sharp from 'sharp';

const ROOT = process.cwd();
const IMAGE_ASSETS_DIR = path.join(ROOT, 'image-assets');
const BACKUP_THUMB_DIR = path.join(ROOT, 'image-assets-backup/thumbnail');
const CONTENT_DIR = path.join(ROOT, 'src/content');

const FLAGS = {
  dryRun: process.argv.includes('--dry-run'),
  noUpdateMdx: process.argv.includes('--no-update-mdx'),
  force: process.argv.includes('--force'),
};

// Size presets per collection
const PRESETS = {
  blog: { width: 256, height: 256, fit: 'cover' },
  project: { width: 800, fit: 'inside' },
  playground: { width: 800, fit: 'inside' },
};

function getCollection(filePath) {
  const rel = path.relative(CONTENT_DIR, filePath);
  const first = rel.split(path.sep)[0];
  if (first === 'blog' || first === 'project' || first === 'playground') return first;
  return null;
}

function urlToLocalPath(url) {
  // /files/blog/... -> image-assets/blog/...
  // /files/project/... -> image-assets/project/...
  // /files/playground/... -> image-assets/playground/...
  if (!url.startsWith('/files/')) return null;
  const relative = url.replace(/^\/files\//, '');
  return path.join(IMAGE_ASSETS_DIR, relative);
}

function localPathToUrl(localPath) {
  const relative = path.relative(IMAGE_ASSETS_DIR, localPath);
  return `/files/${relative.split(path.sep).join('/')}`;
}

function getThumbPath(originalPath) {
  const parsed = path.parse(originalPath);
  // Avoid double-thumb: if name already ends with -thumb, just change extension
  const stem = parsed.name.endsWith('-thumb') ? parsed.name : `${parsed.name}-thumb`;
  return path.join(parsed.dir, `${stem}.webp`);
}

function extractThumbnail(content) {
  const match = content.match(/^thumbnail:\s*(\S+)/m);
  return match ? match[1].trim() : null;
}

// Given a -thumb.webp path, find the original source file
function findOriginalSource(thumbLocalPath) {
  const parsed = path.parse(thumbLocalPath);
  // Remove -thumb suffix to get original stem
  const origStem = parsed.name.replace(/-thumb$/, '');
  const dir = parsed.dir;
  const extensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
  for (const ext of extensions) {
    const candidate = path.join(dir, `${origStem}${ext}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

async function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const thumbUrl = extractThumbnail(content);
  if (!thumbUrl) return null;

  const alreadyThumb = thumbUrl.endsWith('-thumb.webp');

  // Already points to a -thumb.webp and not forcing regeneration
  if (alreadyThumb && !FLAGS.force) {
    return null;
  }

  let localPath = urlToLocalPath(thumbUrl);
  if (!localPath) {
    console.log(`  SKIP (non-local URL): ${thumbUrl}`);
    return null;
  }

  let thumbLocalPath;
  if (alreadyThumb) {
    // Frontmatter already points to thumb — find the original source to regenerate from
    thumbLocalPath = localPath;
    localPath = findOriginalSource(thumbLocalPath);
    if (!localPath) {
      console.log(`  SKIP (original source not found for): ${thumbUrl}`);
      return null;
    }
  } else {
    if (!fs.existsSync(localPath)) {
      console.log(`  SKIP (file not found): ${localPath}`);
      return null;
    }
    thumbLocalPath = getThumbPath(localPath);
  }

  const thumbUrl_ = localPathToUrl(thumbLocalPath);
  const collection = getCollection(filePath);
  const preset = PRESETS[collection] || PRESETS.blog;

  // Skip if thumb already exists and is newer than original (unless --force)
  if (!FLAGS.force && fs.existsSync(thumbLocalPath)) {
    const origStat = fs.statSync(localPath);
    const thumbStat = fs.statSync(thumbLocalPath);
    if (thumbStat.mtimeMs >= origStat.mtimeMs) {
      // Thumb is up to date, but still update MDX if needed
      if (!FLAGS.noUpdateMdx && !content.includes(thumbUrl_)) {
        return { filePath, thumbUrl: thumbUrl_, content, skipGenerate: true };
      }
      return null;
    }
  }

  return { filePath, localPath, thumbLocalPath, thumbUrl: thumbUrl_, content, preset, collection };
}

async function generateThumb(entry) {
  if (entry.skipGenerate) return entry;

  const { localPath, thumbLocalPath, preset } = entry;

  const sharpInstance = sharp(localPath);
  const resizeOptions = { width: preset.width, fit: preset.fit };
  if (preset.height) resizeOptions.height = preset.height;

  await sharpInstance
    .resize(resizeOptions)
    .webp({ quality: 80 })
    .toFile(thumbLocalPath);

  const origSize = fs.statSync(localPath).size;
  const thumbSize = fs.statSync(thumbLocalPath).size;
  entry.origSize = origSize;
  entry.thumbSize = thumbSize;
  return entry;
}

function copyToBackup(thumbLocalPath) {
  const relative = path.relative(IMAGE_ASSETS_DIR, thumbLocalPath);
  const backupPath = path.join(BACKUP_THUMB_DIR, relative);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(thumbLocalPath, backupPath);
  return backupPath;
}

function updateMdx(entry) {
  const { filePath, thumbUrl, content } = entry;
  const oldThumbMatch = content.match(/^(thumbnail:\s*)(\S+)/m);
  if (!oldThumbMatch) return;

  const oldLine = oldThumbMatch[0];
  const newLine = `${oldThumbMatch[1]}${thumbUrl}`;
  if (oldLine === newLine) return;

  const updated = content.replace(oldLine, newLine);
  fs.writeFileSync(filePath, updated, 'utf-8');
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

async function main() {
  console.log('=== Thumbnail Generator ===');
  if (FLAGS.dryRun) console.log('  (DRY RUN - no files will be modified)\n');
  if (FLAGS.noUpdateMdx) console.log('  (--no-update-mdx: MDX files will not be updated)\n');
  if (FLAGS.force) console.log('  (--force: regenerating all thumbnails)\n');

  const mdFiles = glob.sync(`${CONTENT_DIR}/**/*.{md,mdx}`);
  console.log(`Found ${mdFiles.length} markdown files\n`);

  const entries = [];
  for (const file of mdFiles) {
    const entry = await processFile(file);
    if (entry) entries.push(entry);
  }

  if (entries.length === 0) {
    console.log('No thumbnails to generate. All up to date.');
    return;
  }

  console.log(`Processing ${entries.length} thumbnail(s):\n`);

  let totalOrigSize = 0;
  let totalThumbSize = 0;
  let generated = 0;
  let mdxUpdated = 0;

  for (const entry of entries) {
    const relMdx = path.relative(ROOT, entry.filePath);
    const collection = entry.collection || getCollection(entry.filePath);
    const preset = entry.preset || PRESETS[collection] || PRESETS.blog;
    const sizeLabel = preset.height
      ? `${preset.width}x${preset.height} cover`
      : `${preset.width}px max-width`;

    if (FLAGS.dryRun) {
      console.log(`  ${relMdx}`);
      console.log(`    → ${entry.thumbUrl} (${sizeLabel})`);
      if (entry.skipGenerate) console.log(`    (thumb exists, MDX update only)`);
      continue;
    }

    // Generate thumbnail
    if (!entry.skipGenerate) {
      await generateThumb(entry);
      generated++;
      totalOrigSize += entry.origSize || 0;
      totalThumbSize += entry.thumbSize || 0;
      console.log(`  GEN  ${path.relative(ROOT, entry.thumbLocalPath)} (${formatBytes(entry.origSize)} → ${formatBytes(entry.thumbSize)})`);
    }

    // Copy to local backup for dev server
    if (entry.thumbLocalPath && fs.existsSync(entry.thumbLocalPath)) {
      const backupPath = copyToBackup(entry.thumbLocalPath);
      console.log(`  BAK  ${path.relative(ROOT, backupPath)}`);
    }

    // Update MDX frontmatter
    if (!FLAGS.noUpdateMdx) {
      updateMdx(entry);
      mdxUpdated++;
      console.log(`  MDX  ${relMdx}`);
    }
  }

  if (!FLAGS.dryRun) {
    console.log('\n=== Summary ===');
    console.log(`  Thumbnails generated: ${generated}`);
    console.log(`  MDX files updated: ${mdxUpdated}`);
    if (totalOrigSize > 0) {
      const reduction = ((1 - totalThumbSize / totalOrigSize) * 100).toFixed(1);
      console.log(`  Total original size: ${formatBytes(totalOrigSize)}`);
      console.log(`  Total thumb size: ${formatBytes(totalThumbSize)}`);
      console.log(`  Reduction: ${reduction}%`);
    }
  } else {
    console.log(`\n${entries.length} thumbnail(s) would be processed. Run without --dry-run to execute.`);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});

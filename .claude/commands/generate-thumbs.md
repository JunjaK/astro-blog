---
name: generate-thumbs
description: Generate downscaled WebP thumbnails for blog/project/playground content
user_invocable: true
---

# Generate Thumbnails

Generates downscaled WebP thumbnails from original images referenced in MDX frontmatter `thumbnail:` fields.

## Size Presets

| Collection | Size | Method |
|------------|------|--------|
| blog | 256x256 | Square crop (cover) |
| project | 400px max width | Aspect ratio preserved |
| playground | 400px max width | Aspect ratio preserved |

## Workflow

1. Run dry-run first to preview changes:
   ```bash
   bun run generate-thumbs:dry
   ```

2. Show the dry-run output to the user and confirm before proceeding.

3. If confirmed, run the actual generation:
   ```bash
   bun run generate-thumbs
   ```

4. Report the results:
   - Number of thumbnails generated
   - Number of MDX files updated
   - Total size reduction

## Flags

- `--dry-run` — Preview only, no file changes
- `--no-update-mdx` — Generate images but don't update MDX frontmatter
- `--force` — Regenerate all thumbnails even if up to date

## How It Works

- Scans `src/content/**/*.{md,mdx}` for `thumbnail:` frontmatter
- Maps `/files/...` URLs to `image-assets/...` local paths
- Uses sharp to downscale → `{stem}-thumb.webp` in same directory
- Updates MDX frontmatter `thumbnail:` to point to the new thumb
- Idempotent: skips files already pointing to `-thumb.webp`, uses mtime comparison

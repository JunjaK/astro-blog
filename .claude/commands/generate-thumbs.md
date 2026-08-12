---
name: generate-thumbs
description: [DEPRECATED, legacy image-assets only] Generate downscaled WebP thumbnails for blog/project/playground content
user_invocable: true
---

# Generate Thumbnails

> **DEPRECATED — 레거시 자산 전용.** 새 이미지는 에디터에 첨부하면 그 자리에서
> `/files/media` 로 업로드된다 (rsync·커밋 불필요). 이 커맨드는 `blog/image-assets/` 를
> 전제로 하며, 그 디렉터리는 기존 글이 참조하는 과거 자산으로 동결됐다. 새 이미지를
> 거기에 넣지 말 것. 정리는 `/prune-media`.

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

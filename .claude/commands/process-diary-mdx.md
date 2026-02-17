---
name: process-diary-mdx
description: Full diary MDX processing pipeline - HEIC conversion, path normalization, DiarySection restructuring, and Typora sync
user_invocable: true
---

# Process Diary MDX

Takes a raw Typora-exported diary MDX file and processes it end-to-end:
1. HEIC → WebP conversion
2. Image path normalization (relative → server `/files/` paths)
3. DiarySection component restructuring
4. Typora source sync

## Arguments

- `$ARGUMENTS` — Target MDX file path (e.g. `src/content/blog/diary/25-01-tokyo/01_01-20.mdx`)

If no argument provided, ask the user which MDX file to process.

## Step 1: Determine paths

Derive from the MDX file path `src/content/blog/diary/{series}/{file}.mdx`:

- **Server prefix**: `/files/blog/diary/{series}/assets/`
- **Local image dir**: `image-assets/blog/diary/{series}/assets/`
- **Typora path derivation**:
  - Default: `{year}` = `20` + first 2 chars of `{series}` (e.g. `25-01-tokyo` → `2025`)
  - Typora source dir: `/Users/jun/Library/CloudStorage/OneDrive-개인/문서/typoraDoc/Trip/{year}/{series}/`
  - Typora md file: `{file}.md` in the Typora source dir
  - Typora assets dir: `<Typora source dir>/assets/`
  - **Special case**: `japan-around-trip` → `/Users/jun/Library/CloudStorage/OneDrive-개인/문서/typoraDoc/Trip/전국일주 일기(2024.11.28 ~ 12.24)/`

## Step 2: Find and convert HEIC files

1. **Grep** the MDX for `.heic` references. Extract unique filenames.
2. **Locate source files** via `mdfind -name "FILENAME.heic"` (macOS Spotlight).
   - Common locations: OneDrive (`/Users/jun/Library/CloudStorage/OneDrive-개인/사진/카메라 앨범/`), `/Users/jun/Pictures/`
3. **Create output dir**: `mkdir -p image-assets/blog/diary/{series}/assets`
4. **Copy originals** to staging: `image-assets/to_convert_webp/`
5. **Convert HEIC → WebP**:
   ```bash
   .venv/bin/python scripts/python/convert_heic_to_webp.py image-assets/to_convert_webp/ "image-assets/blog/diary/{series}/assets/" --quality 80
   ```
6. **Clean staging**: `rm image-assets/to_convert_webp/*.heic`

## Step 3: Copy non-HEIC assets

Copy any existing `.webp`, `.png`, `.jpg`, `.MOV`, `.mp4` files referenced in the MDX from:
- The Typora `assets/` directory (for `./assets/*` references)
- The camera album directory (for video files)

→ to `image-assets/blog/diary/{series}/assets/`

## Step 4: Update MDX paths

### 4a. Thumbnail frontmatter
- HEIC thumbnail links → `/files/blog/diary/{series}/assets/{filename}.webp`
- `./assets/image.ext` → `/files/blog/diary/{series}/assets/image.ext`

### 4b. HEIC links → WebP images
- `[filename.heic](any/path/to/filename.heic)` → server path (these become DiarySection image entries)

### 4c. Body image/video paths
- `![alt](./assets/image.ext)` → `![alt](/files/blog/diary/{series}/assets/image.ext)`
- `<video src="url-encoded-path">` → `<video src="/files/blog/diary/{series}/assets/{filename}" ...>`

## Step 5: Restructure MDX with DiarySection

Ask the user: **"Which heading marks the start of DiarySection content?"** (default: `## 일정` or its sub-headings)

### Structure rules:
- Content **before** the boundary heading stays as plain markdown (route maps, visit lists, trip purpose)
- Content **from** the boundary heading onwards gets wrapped in `<DiaryGallery>` + `<DiarySection>` components
- Each `### sub-heading` under the boundary becomes its own `<DiarySection client:visible images={[...]}>`
- Import statement at top: `import { DiaryGallery, DiarySection } from '@/components/Blog/DiaryGallery';`

### Image grouping:
- Images appearing between two `###` sub-headings belong to that section's `images` array
- First image in each section = hero (full viewport), rest = gallery grid
- Image format: `{ src: "/files/.../filename.webp", alt: "description" }`
- Assign meaningful Korean `alt` text based on surrounding context
- Remove `[toc]` if present

### DiarySection JSX rules (MDX compatibility):
- All JSX open/close tags (`<DiaryGallery>`, `<DiarySection>`, `</DiarySection>`, `</DiaryGallery>`) must be at **column 0** (no indentation)
- Blank line between JSX tags and markdown content
- `<video>` tags use `className` (not `class`) and include `controls`, `mx-auto my-4 max-w-full rounded-xl`

## Step 6: Update Typora source

1. **Copy converted WebPs** to Typora assets dir
2. **Update HEIC links** → `![filename](./assets/filename.webp)` (relative paths)
3. **Leave existing** `./assets/*.webp`, `./assets/*.png` as-is
4. **Update video** tags to use relative `./assets/` paths

## Step 7: Report

- Number of HEIC files converted to WebP
- Number of non-HEIC assets copied
- Number of DiarySection components created
- Number of paths updated in MDX and Typora source
- Remind user to run `/publish-images` when server is available

## Notes

- Conversion uses Python (Pillow + pillow-heif) via `.venv`.
- WebP quality 80 for photos.
- `sips` on macOS does NOT reliably support WebP output — always use the Python script.
- `image-assets/to_convert_webp/` is staging only, cleaned after conversion.
- `client:visible` must be on each `<DiarySection>`, NOT on `<DiaryGallery>` (Astro island hydration constraint).

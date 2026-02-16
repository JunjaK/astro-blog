---
name: convert-heic
description: Convert HEIC images to WebP, update all MDX image paths and thumbnail frontmatter
user_invocable: true
---

# Convert HEIC to WebP & Update All MDX Paths

Takes an MDX file and does a full pass: HEIC→WebP conversion, image path normalization, and thumbnail frontmatter path update.

## Arguments

- `$ARGUMENTS` — Target MDX file path (e.g. `src/content/blog/diary/japan-around-trip/27_12-23.mdx`)

If no argument provided, ask the user which MDX file to process.

## Step 1: Determine server path

Derive from the MDX file path:
- `src/content/<rest>/filename.mdx` → server prefix: `/files/<rest>/assets/`
- Local image dir: `image-assets/<rest>/assets/`
- Example: `src/content/blog/diary/japan-around-trip/27_12-23.mdx`
  - Server: `/files/blog/diary/japan-around-trip/assets/`
  - Local: `image-assets/blog/diary/japan-around-trip/assets/`

## Step 2: Find and convert HEIC files

1. **Grep** the MDX for `.heic` references. Extract unique filenames.
2. **Locate source files** via `mdfind -name "FILENAME.heic"` (macOS Spotlight).
   - Common locations: OneDrive (`/Users/jun/Library/CloudStorage/OneDrive-개인/사진/카메라 앨범/`), `/Users/jun/Pictures/`
3. **Copy originals** to staging: `image-assets/to_convert_webp/`
4. **Convert HEIC → WebP** using the Python script:
   ```bash
   .venv/bin/python scripts/python/convert_heic_to_webp.py image-assets/to_convert_webp/ "OUTPUT_DIR/" --quality 80
   ```
   - Requires `.venv` with `Pillow` + `pillow-heif` (see `scripts/python/requirements.txt`)
   - If venv doesn't exist: `mise x -- python -m venv .venv && .venv/bin/pip install -r scripts/python/requirements.txt`

## Step 3: Update ALL paths in MDX

### 3a. HEIC links → WebP images
- `[filename.heic](any/path/to/filename.heic)` → `![filename](/files/<rest>/assets/filename.webp)`

### 3b. Thumbnail frontmatter
- `thumbnail: ./assets/image.png` → `thumbnail: /files/<rest>/assets/image.png`
- `thumbnail: assets/image.png` → `thumbnail: /files/<rest>/assets/image.png`
- Already `/files/...` → leave as-is

### 3c. Body image paths
- `![alt](./assets/image.png)` → `![alt](/files/<rest>/assets/image.png)`
- `![alt](assets/image.png)` → `![alt](/files/<rest>/assets/image.png)`
- Already `/files/...` → leave as-is

## Step 4: Report

- Number of HEIC files converted to WebP
- Number of image/thumbnail paths updated
- Remind user to run `/publish-images` when server is available

## Notes
- Conversion uses Python (Pillow + pillow-heif) via `.venv`. mise manages Python version (see `.mise.toml`).
- WebP quality 80 for photos. Use 90+ for high-detail if needed.
- Browsers do NOT support HEIC natively. WebP has full modern browser support.
- `image-assets/to_convert_webp/` is staging only, can be cleaned after conversion.
- `sips` on macOS does NOT reliably support WebP output — always use the Python script.

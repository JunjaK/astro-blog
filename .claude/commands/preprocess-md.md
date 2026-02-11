---
name: preprocess-md
description: Run markdown preprocessing (image path conversion, unused image cleanup, trailing spaces)
user_invocable: true
---

# Preprocess Markdown

Runs all markdown preprocessing scripts for blog content.

## Steps

1. Execute `bun run all-preprocess-md` which runs these scripts sequentially:
   - `removeUnusedImages.js` — Finds and deletes images in `image-assets/` not referenced by any MDX file
   - `addMdEnter.js` — Adds trailing double spaces to every line in MDX files (ensures markdown line breaks)
   - `convertLoader.js` — Transforms image/video references in `.mdx` files:
     - `![alt](assets/img.png)` → `<ImageLoader src="/files/blog/.../assets/img.png" alt="alt" />`
     - `<video src="assets/vid.mp4"></video>` → `<VideoLoader src="/files/blog/.../assets/vid.mp4" />`
     - `thumbnail: assets/thumb.png` → `thumbnail: /files/blog/.../assets/thumb.png`

2. Report which files were modified

## Path Conversion Logic
- Source pattern: `assets/filename` or `./assets/filename`
- Target pattern: `/files/blog/{category}/{subcategory}/assets/filename`
- Rule: Replace `src/content` prefix with `/files`, use directory path (excluding filename)

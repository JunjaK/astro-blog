---
name: preprocess-md
description: [DEPRECATED, legacy image-assets only] Run markdown preprocessing (image path conversion, unused image cleanup, trailing spaces)
user_invocable: true
---

# Preprocess Markdown

> **DEPRECATED — 레거시 자산 전용.** 새 이미지는 에디터에 첨부하면 그 자리에서
> `/files/media` 로 업로드된다 (rsync·커밋 불필요). 이 커맨드는 `blog/image-assets/` 를
> 전제로 하며, 그 디렉터리는 기존 글이 참조하는 과거 자산으로 동결됐다. 새 이미지를
> 거기에 넣지 말 것. 정리는 `/prune-media`.

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

---
name: publish-images
description: [DEPRECATED, legacy image-assets only] Sync local image-assets to RPi server and run markdown preprocessing
user_invocable: true
---

# Publish Images

> **DEPRECATED — 레거시 자산 전용.** 새 이미지는 에디터에 첨부하면 그 자리에서
> `/files/media` 로 업로드된다 (rsync·커밋 불필요). 이 커맨드는 `blog/image-assets/` 를
> 전제로 하며, 그 디렉터리는 기존 글이 참조하는 과거 자산으로 동결됐다. 새 이미지를
> 거기에 넣지 말 것. 정리는 `/prune-media`.

Syncs local `image-assets/` directory to the Raspberry Pi server via rsync and runs markdown preprocessing.

## Steps

1. **Run markdown preprocessing**: Execute `bun run all-preprocess-md` which runs sequentially:
   - `removeUnusedImages.js` — Deletes images in `image-assets/` not referenced by any MDX file
   - `addMdEnter.js` — Adds trailing double spaces to all lines in MDX files (markdown line breaks)
   - `convertLoader.js` — Converts `![alt](assets/...)` to `<ImageLoader>`, `<video>` to `<VideoLoader>`, and updates `thumbnail:` frontmatter paths

2. **Detect changed files via rsync dry-run**:
   ```bash
   rsync -avz --dry-run image-assets/ raspi:/home/jun/blog-files/ 2>/dev/null | grep -E '^[^.]' | head -50
   ```
   - This quickly compares local vs remote without transferring anything
   - Extract unique top-level subdirectories from the output (e.g., `project/japan-travel1/`, `blog/diary/japan-around-trip/`)
   - Show the user which directories have changes and how many files

3. **Sync images to server** (incremental by default):
   - **Incremental** (default): Only sync changed subdirectories individually
     ```bash
     rsync -avz --progress image-assets/<subdir>/ raspi:/home/jun/blog-files/<subdir>/
     ```
     Run one rsync per changed subdirectory. This avoids scanning the entire file tree.
   - **Full clean** (when user passes `--full` or `--clean` argument): Sync everything with `--delete`
     ```bash
     rsync -avz --progress --delete --exclude=media/ image-assets/ raspi:/home/jun/blog-files/
     ```
     `--exclude=media/` is NOT optional. `/home/jun/blog-files/media/` holds the editor's uploads
     and has no local counterpart, so `--delete` without it wipes every image uploaded through
     the editor. Incremental (the default above) has no `--delete` and is unaffected.
   - If no changes detected in dry-run, skip rsync entirely and inform the user.

4. **Fix permissions on server**: After syncing, fix permissions for all transferred files:
   ```bash
   ssh raspi "find /home/jun/blog-files/ -type f -not -perm 644 -exec chmod 644 {} + && find /home/jun/blog-files/ -type d -not -perm 755 -exec chmod 755 {} +"
   ```
   macOS `openrsync` does not support `--chmod`, so permissions must be fixed server-side.

5. **Report results**: Show which directories were synced, number of files transferred, and elapsed time.

## Notes
- `image-assets/` is in `.gitignore` — cannot use git to detect changes, hence rsync dry-run
- SSH host alias: `raspi` (defined in `~/.ssh/config`, key-based auth)
- Remote path: `/home/jun/blog-files/` (Docker bind mount → nginx `/files/`)
- Large files (videos) may take significant time over network
- Directory timestamp warnings (`failed to set times`) are harmless — files transfer correctly

# Cursor-Native MDX Workflow Design

**Date**: 2026-05-01
**Status**: Draft (awaiting review)
**Replaces**: Typora → MDX hand-converted pipeline

## 1. Goal

Eliminate the friction of writing blog posts in Typora and converting to MDX. Establish a single-editor (Cursor) workflow where:

1. The user writes in `.md` (with native inline image preview).
2. Image paste/drag is one-step (no separate HEIC conversion command).
3. The `.mdx` artifact is generated mechanically — never touched by hand.
4. Existing publish/sync tooling (`/publish-images`, `/generate-thumbs`) is preserved.

## 2. Current Pain Points

| Pain | Cause |
|---|---|
| Two sources of truth (Typora `.md` + project `.mdx`) | Round-trip-unsafe transform pipeline |
| MDX components invisible in Typora preview | Typora can't render `<PolaroidGalleryScrapbook>`, `<DiaryCarousel>`, etc. |
| HEIC discovery via `mdfind` is fragile | Originals scattered across OneDrive / Pictures |
| New `<PolaroidGalleryScrapbook>` not in `/process-diary-mdx` | Pipeline lags behind component changes |
| Manual `.mdx` tweaks risk being clobbered by re-running pipeline | No idempotency guarantee |

## 3. Architecture

### 3.1 Two-File Model

Per post, two files exist:

```
_md_editor/blog/diary/25-01-tokyo/01_01-20.md    ← canonical source (edit here)
src/content/blog/diary/25-01-tokyo/01_01-20.mdx  ← build artifact (DO NOT EDIT)
```

**Strict discipline**: `.mdx` is treated as a generated artifact. Direct edits will be lost on next transform.

**Enforcement**:
1. Banner comment auto-injected at top of every `.mdx`: `{/* AUTO-GENERATED FROM .md - DO NOT EDIT */}`
2. **Both `.md` and `.mdx` are committed to git**. The `.mdx` stays version-controlled because:
   - Existing posts already have committed `.mdx` files; matching that convention reduces churn.
   - PR diffs of generated `.mdx` reveal transform regressions visually.
   - RPi self-hosted CI/CD runs `bun run build` directly without needing a transform step in the pipeline.

The user's commitment is to never edit `.mdx` directly. Banner comment is the reminder; no pre-commit hook is added in v1 (defer until a real incident proves it's needed).

### 3.2 Folder Structure

```
_md_editor/                                  ← NEW
├── blog/
│   ├── diary/
│   │   ├── 25-01-tokyo/
│   │   │   ├── 01_01-20.md
│   │   │   └── 02_01-21.md
│   │   └── japan-around-trip/
│   ├── web/
│   └── game/
├── playground/
└── project/

image-assets/                                ← unchanged (gitignored)
└── blog/diary/25-01-tokyo/assets/

src/content/                                 ← unchanged structure (.mdx is now generated)
└── blog/diary/25-01-tokyo/01_01-20.mdx
```

`_md_editor/` is **committed to git** (so the canonical source is version-controlled). Underscore prefix excludes it from Astro's content collection scanning.

## 4. `.md` Format Specification

### 4.1 Frontmatter

Identical to current MDX frontmatter:

```yaml
---
title: 『25-01 도쿄여행』 1일차 - 몬자야키, 긴자, 우에노
created: 2026-02-17
tags: ['일본', '여행', '도쿄']
category: Diary
thumbnail: ./assets/20250120_063147954_iOS.webp
---
```

The `thumbnail:` uses a relative path starting with `./`. The transform converts to `/files/blog/diary/{series}/{rest}` absolute. The subfolder name is **not hardcoded to `assets/`** — `./assets/X.webp`, `./01-21/X.webp`, `./photos/X.webp` are all valid. The transform only rewrites the `./` prefix to the post's server URL prefix; everything after is preserved.

### 4.2 Body — Plain Markdown First

Standard markdown is preserved verbatim:

- Headings (`##`, `###`)
- Bold/italic
- Lists, blockquotes
- Inline code, code blocks
- Math (`$...$`, `$$...$$`)
- Mermaid diagrams (current `remarkMermaidToHtml` plugin still applies)

### 4.3 Images — Three Forms

**Form 1: Standalone image** (renders as `<ImageLoader>`)

```md
### 루트

![route map](./assets/CleanShot_2026-02-16_23.09.11@2x.png)

### 방문한 곳
```

A single `![]()` between two headings (or at section boundaries) becomes a standalone `<ImageLoader>`.

**Form 2: Auto-grouped gallery** (G1 — default for galleries)

```md
### 츠키시마 몬쟈 스트리트

![모헤지 입구](./assets/img1.webp)
![몬자야키1](./assets/img2.webp)
![몬자야키2](./assets/img3.webp)

친구가 도쿄의 몬자야키를 먹어보고 싶다고 해서...
```

**Two or more consecutive `![]()` images** are grouped into one `<PolaroidGalleryScrapbook>`. "Consecutive" is defined precisely as:

- Image lines may be separated by zero or more blank lines, but **no other content** (paragraph, heading, list item, etc.) appears between them.
- The first non-image content (a paragraph, the next heading, end of file) terminates the group.

Rules:

- `src` ← image path
- `alt` ← markdown alt text
- `title` ← reused from alt (same Korean string)
- `caption` ← omitted (or auto-derived; see §4.5)
- `description` ← omitted

**Form 3: Explicit JSX block** (escape hatch for full control)

When auto-grouping is wrong (e.g., need `description` field, or want non-adjacent images grouped):

```md
### 츠키시마 몬쟈 스트리트

<PolaroidGalleryScrapbook items={[
  {
    src: "./assets/img1.webp",
    title: "모헤지 입구",
    caption: "Moheji Entrance",
    alt: "모헤지 입구",
  },
  {
    src: "./assets/img2.webp",
    title: "몬자야키1",
    caption: "Monja Yaki 1",
    alt: "몬자야키1",
    description: "양념이 특히 인상적",
  },
]} />

친구가 도쿄의...
```

The transform passes JSX blocks through unchanged (only normalizes `./assets/` → `/files/...` inside string literals). The `.md` preview won't render this block — Cursor's CommonMark preview will treat `<PolaroidGalleryScrapbook>` as an unknown HTML element and the inner `items={[...]}` as raw text. The user accepts this trade-off for ambiguous cases.

**Parser choice**: the transform uses `@mdx-js/mdx` (or `mdast-util-mdx` plugin on top of remark) to parse `.md` files. This means the file is parsed as if it were MDX, which is necessary to robustly handle JSX blocks. Side effect: any unintended `{` / `}` in markdown bodies will be interpreted as JSX expressions. If this becomes a problem, escape with `\{` `\}`. Document this gotcha in `CLAUDE.md`.

### 4.4 Videos

```md
<video src="./assets/clip.mp4" poster="./assets/poster.webp" />
```

Transformed to `<VideoLoader src="/files/.../clip.mp4" poster="/files/.../poster.webp" />`.

### 4.5 Caption / Description Handling

`caption` (English short label) and `description` (Korean long-form text) fields are **optional** but commonly used in this user's diary posts.

- **G1 auto-grouping** drops `caption` and `description` (only `src` + `alt` survive). Use only when these fields are not needed.
- **Form 3 explicit JSX** preserves all fields verbatim. **This is the primary pattern for diary posts** with rich per-image metadata (e.g., `02_01-21.mdx` has 10 items with `description` text).
- (Future) LLM-driven caption/description fill could be a separate command, e.g., `bun run blog:enrich <post>`. Out of scope for v1.

### 4.6 TableOfContents

If the user wants a TOC, they can write:

```md
<TableOfContents>
- 루트 및 방문한 곳
- 일정
  - 츠키시마 몬쟈 스트리트
</TableOfContents>
```

The transform passes this through unchanged. Auto-generation from headings is **out of scope** for v1 (YAGNI).

## 5. `.md` → `.mdx` Transform

### 5.1 Trigger Points

**Manual-only**. The user explicitly chose against auto-watcher in `bun dev` — transformation is a deliberate publish-step action, bundled with image rsync to the RPi server.

| Trigger | Behavior |
|---|---|
| `bun run blog:transform` | Transform all `_md_editor/**/*.md` → corresponding `.mdx`. |
| `bun run blog:transform -- <path>` | Transform a single `.md` file. |
| `bun dev` | **Unchanged** — Astro reads existing `.mdx`. User runs `blog:transform` manually after `.md` edits to refresh preview. |
| `bun run build` | **Unchanged** — Astro reads `.mdx` as today. Transform is NOT auto-invoked. |

### 5.2 Transform Rules (in order)

1. **Parse frontmatter**. Normalize `thumbnail:` `./assets/X` → `/files/blog/{...path}/assets/X`.
2. **Inject auto-banner**: `{/* AUTO-GENERATED FROM <relative-md-path> - DO NOT EDIT */}` at top.
3. **Inject required imports** based on what components appear in body:
   - `import { PolaroidGalleryScrapbook } from '@/components/Blog/DiaryGallery/PolaroidGalleryScrapbook.astro';` if any gallery used
   - `import ImageLoader from '@/components/Blog/ImageLoader.astro';`
   - `import VideoLoader from '@/components/Blog/VideoLoader.astro';` (verify name)
   - `import TableOfContents from '@/components/Blog/TableOfContents.astro';` if used
4. **Walk body** with a remark AST:
   - Standalone image (single `![]()` with surrounding non-image content) → `<ImageLoader src="/files/.../X" alt="..." />`
   - 2+ consecutive images → `<PolaroidGalleryScrapbook items={[...]} />`
   - JSX-like blocks (parsed as MDX flow content) → pass through, only normalize `./assets/` → `/files/...` inside `src`/`poster` strings
   - `<video>` HTML element → `<VideoLoader />`
   - All other markdown → preserved verbatim
5. **Path normalization** (final pass): any remaining `./assets/X` → `/files/blog/{series-derived-path}/assets/X`.
6. **Write** to `src/content/blog/{...}/{file}.mdx`.

### 5.3 Path Derivation

From `_md_editor/blog/diary/25-01-tokyo/01_01-20.md`:
- `.mdx` output: `src/content/blog/diary/25-01-tokyo/01_01-20.mdx`
- Asset URL prefix: `/files/blog/diary/25-01-tokyo/assets/`
- Image local dir: `image-assets/blog/diary/25-01-tokyo/assets/`

Replace `_md_editor` ↔ `src/content` ↔ `image-assets` ↔ `/files` based on path segments.

### 5.4 Idempotency

Re-running transform on unchanged `.md` produces byte-identical `.mdx`. Watcher uses content hash (or mtime) to skip no-op writes (avoid spurious Astro hot-reload).

## 6. Image Paste Helper

### 6.1 Goals

When user pastes/drags an image while editing `_md_editor/blog/diary/25-01-tokyo/01_01-20.md`:

1. Determine target asset dir from active file path: `image-assets/blog/diary/25-01-tokyo/assets/`.
2. Save image with a stable filename:
   - From clipboard (PNG screenshot): `paste_YYYYMMDD_HHMMSS.png` (or .webp)
   - From Finder drag: preserve original filename
3. If HEIC, convert to WebP using existing `scripts/python/convert_heic_to_webp.py`.
4. Insert `![alt](./assets/X.webp)` at cursor position with empty alt for user to fill.

### 6.2 Implementation Tiers

**Tier 1 (start here): Cursor built-in + custom destination**

Cursor inherits VS Code's `markdown.copyFiles.destination` setting. Configure in `.vscode/settings.json` (or `.cursor/settings.json` if applicable):

```json
{
  "markdown.copyFiles.destination": {
    "_md_editor/**/*.md": "${documentDirName}/../../../../image-assets/${documentRelativeWorkspaceFolder}/assets/${fileName}"
  }
}
```

Path computation may need workspace-relative trickery. Verify behavior on a test paste before finalizing.

**Tier 2: Wrapper command for HEIC**

Custom keybinding triggers a Node script (`scripts/blog-paste-heic.mjs`) that:
- Reads HEIC from clipboard or argv (file path)
- Calls `convert_heic_to_webp.py` 
- Writes WebP to derived asset dir
- Inserts `![](./assets/{name}.webp)` at cursor (via Cursor command-line invocation or by writing to a marker file the editor watches)

Tier 2 is only needed if Tier 1 can't handle HEIC. Defer until Tier 1 is verified.

### 6.3 What This Replaces

`/process-diary-mdx`'s HEIC discovery via `mdfind` is no longer needed for new posts — user pastes HEIC directly into Cursor. Existing posts in `src/content/...` keep their already-converted WebPs.

## 7. Build Pipeline Integration

### 7.1 New `package.json` Scripts

```jsonc
{
  "scripts": {
    "dev": "astro dev --mode dev",
    "build": "astro build --mode prd",
    "blog:transform": "node scripts/md-to-mdx.mjs"
  }
}
```

- `blog:transform` — single-purpose: `_md_editor/**/*.md` → `.mdx`. No watcher, no integration.
- `dev` / `build` — unchanged.

### 7.2 Two Separate Commands + One Combined Wrapper

Per user decision: keep the two stages separate by default, add a thin orchestrator for one-shot publish.

| Command | Stage | Implementation |
|---|---|---|
| `bun run blog:transform` | `.md` → `.mdx` | npm script in `package.json` |
| `/publish-images` | preprocess + rsync to RPi | **Existing** skill (`.claude/commands/publish-images.md`) |
| `/blog-ship` | both, in sequence | **New** skill: runs `bun run blog:transform`, then follows `/publish-images` workflow |

The user's full publish flow:

1. Edit `_md_editor/.../{file}.md` in Cursor (inline image preview).
2. **Option A** (granular):
   - `bun run blog:transform` — refresh `.mdx`.
   - `/publish-images` — preprocess + rsync.
3. **Option B** (one-shot):
   - `/blog-ship` — does both sequentially. Internal logic = literally chaining the two commands above; no extra magic.
4. `git commit && git push` (triggers blog rebuild on RPi).

`/blog-ship` is a thin shell, not a re-implementation. If `/publish-images` changes, `/blog-ship` automatically inherits because it just delegates.

### 7.3 No Astro Integration

Earlier draft proposed registering a transform-and-watcher as an Astro integration. **Rejected** per user preference: transformation should be a deliberate, user-invoked action, not a hidden side-effect of `bun dev`.

### 7.4 Existing Tooling

| Command | Status |
|---|---|
| `/publish-images` | **Unchanged** |
| `/generate-thumbs` | **Unchanged** |
| `/preprocess-md` | **Mostly retired**. Its job (path conversion, ImageLoader wrapping) is now done by `md-to-mdx`. Trailing-double-space (`addMdEnter`) becomes optional — investigate whether it's still needed for new MDX. |
| `/process-diary-mdx` | **Retired for new posts**. Keep as legacy tool for reverse-migrating existing posts if user chooses. |
| `/convert-heic` | **Retired for new posts**. Image paste handles HEIC. |
| `removeUnusedImages.js` | **Keep**. Still useful as image-assets garbage collection. |

## 8. Migration Strategy

**Starting point**: `src/content/blog/diary/25-01-tokyo/02_01-21.mdx` is the **first post in the new workflow** (per user decision).

This post is mid-edit (`M` in git status), uses the new `<PolaroidGalleryScrapbook>` pattern, and has rich `description`/`caption` per item — ideal candidate to validate the Form 3 (explicit JSX) path.

### Reverse-port procedure for `02_01-21.mdx` → `_md_editor/blog/diary/25-01-tokyo/02_01-21.md`:

1. Copy MDX content to new `.md` file.
2. Strip `import` statements (transform will re-inject).
3. Strip the `export const dayTwoItems = [...]` block; inline its content directly into the `<PolaroidGalleryScrapbook items={[...]} />` JSX in body.
4. Rewrite all `/files/blog/diary/25-01-tokyo/01-21/X.webp` → `./01-21/X.webp` (server path → relative).
5. Rewrite frontmatter `thumbnail:` similarly.
6. Run `bun run blog:transform`.
7. **Verify**: `diff` the regenerated `.mdx` against the original. Differences should be limited to: banner comment, import order, `export const` removal (now inlined). Other diffs = transform bug to fix.
8. Once happy, commit both `.md` (canonical) and `.mdx` (regenerated).

### Other posts

| Post | Status |
|---|---|
| `01_01-20.mdx` | Leave as-is. Already complete in old form. Do not reverse-port. |
| `japan-around-trip/*` | Leave as-is. Bulk reverse-port out of scope. |
| Future posts | Start directly in `_md_editor/`. |

## 9. Risks & Open Questions

### 9.1 Risks

| Risk | Mitigation |
|---|---|
| User accidentally edits `.mdx` directly | Banner comment + pre-commit hook |
| Auto-grouping picks wrong boundaries (groups what should be standalone, splits what should be one) | Explicit JSX block escape hatch |
| Cursor's `markdown.copyFiles.destination` doesn't support our path scheme | Fall back to Tier 2 (wrapper script) |
| HEIC paste path: clipboard from Apple Photos may convert to PNG before Cursor receives it | If so, no HEIC handling needed for clipboard paste; only for Finder drag |
| `_md_editor/` confuses Astro content collection | Underscore prefix already excludes; verify with empty test post |
| Imports auto-injected don't match actual component paths | Test against current component locations; centralize import map in transform script |

### 9.2 Open Questions (defer to implementation plan)

- **TOC**: keep manual `<TableOfContents>` block, or auto-generate from headings? → manual for v1.
- **Caption auto-fill**: skip, manual via Form 3, or LLM-generated as separate command? → skip for v1.
- **Multiple consecutive images that the user wants as standalone**: how to disambiguate from gallery? → if it happens, use Form 3 wrapping each as `<ImageLoader>`. Tracking issue if this case is common.
- **Live `.mdx` preview during dev**: open `bun dev` browser side panel; user already has this habit.

## 10. Components & Files

### 10.1 Create

- `_md_editor/` directory (empty initially; user populates)
- `scripts/md-to-mdx.mjs` — transform engine (remark-based)
- `scripts/blog-paste-heic.mjs` — HEIC paste helper (Tier 2; only if needed)
- `.claude/commands/blog-ship.md` — combined publish skill (runs `bun run blog:transform` then delegates to `/publish-images`)
- `_docs/cursor-mdx-workflow-design.md` — this doc
- (Generated later) `_docs/cursor-mdx-workflow-impl-plan.md` — implementation plan

### 10.2 Modify

- `package.json` — `dev`, `build`, `blog:transform`, `blog:watch` scripts
- `astro.config.mjs` — register `md-editor-transform` integration
- `.vscode/settings.json` (or `.cursor/settings.json`) — `markdown.copyFiles.destination`
- `tsconfig.json` — `exclude: ["_md_editor/**"]`
- `.gitignore` — ensure `image-assets/` stays gitignored, `_md_editor/` is **not** gitignored
- `CLAUDE.md` — document new workflow

### 10.3 Deprecate (move to `_deprecated/`)

Rather than leaving as in-place legacy with comments, **move retired tools to a dedicated `_deprecated/` folder** at project root for archival reference and easy bulk-deletion later:

```
_deprecated/
├── commands/
│   ├── process-diary-mdx.md     ← was .claude/commands/
│   └── convert-heic.md          ← was .claude/commands/
└── utils/
    └── convertLoader.js          ← was src/utils/ (only if md-to-mdx covers its job)
```

- **Move** (not copy): the original locations should no longer have these files, so the harness stops surfacing them as available skills/commands.
- Add a brief `_deprecated/README.md` explaining: "These were used in the Typora → MDX workflow (pre-2026-05). Replaced by `_md_editor/` flow. Kept for reference; safe to delete after a few months of new-flow stability."
- `addMdEnter.js`, `removeUnusedImages.js`, `convertLoader.js` need individual evaluation:
  - `addMdEnter.js`: only retire if `md-to-mdx` produces correct line-break behavior. Keep otherwise.
  - `removeUnusedImages.js`: **keep**. Useful as `image-assets/` GC regardless of authoring flow.
  - `convertLoader.js`: retire only if `md-to-mdx` covers all its cases (verify against multiple post types).

This keeps the active codebase clean while preserving recoverable history.

## 11. Success Criteria

1. New blog post can be authored entirely in Cursor: no Typora launch.
2. Pasting/dragging an image into a `.md` file results in the image appearing in Cursor's markdown preview within ~1 second.
3. Running `bun run blog:transform` regenerates all `.mdx` files from `_md_editor/.md` sources without manual intervention.
4. Reverse-ported `02_01-21.md` → `02_01-21.mdx` produces output equivalent to the original hand-written `02_01-21.mdx` (modulo banner comment + import order).
5. Generated `.mdx` is byte-identical when the source `.md` is unchanged (idempotency).
6. Other existing posts (`01_01-20`, `japan-around-trip/*`) continue to render correctly without changes.
7. RPi CI/CD pipeline (`bun run build`) succeeds without modification — `.mdx` files are committed and read directly by Astro.

## 12. Implementation Sequence (high-level — detailed plan in separate doc)

1. Build `scripts/md-to-mdx.mjs` transform with G1 + Form 3 + flexible path normalization (`./{anysubdir}/X` → `/files/blog/{...}/{anysubdir}/X`)
2. Add `blog:transform` script to `package.json`
3. Configure Cursor `markdown.copyFiles.destination` for `_md_editor/**/*.md`; verify drag/paste behavior with PNG, JPG, HEIC
4. (If clipboard/Finder paste of HEIC doesn't auto-convert) Build `scripts/blog-paste-heic.mjs` wrapper
5. **Reverse-port `02_01-21.mdx`** to `_md_editor/blog/diary/25-01-tokyo/02_01-21.md`; run transform; diff against original; iterate transform until output matches
6. Create `.claude/commands/blog-ship.md` skill (transform + delegate to `/publish-images`)
7. Move retired tools to `_deprecated/` with README
8. Update `CLAUDE.md` and project memory with new workflow
9. Author one new post (e.g., 03_01-22) end-to-end in the new flow as proof

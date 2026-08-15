# Astro Blog - jun-devlog

Personal developer blog built with Astro 7, featuring multi-framework islands (React 19, Vue 3.5, Svelte 5).

**Site:** https://www.jun-devlog.win
**Node:** 24 (mise) | **Package Manager:** bun

> ⚠️ **Repo layout (2026-06: monorepo split).** The blog now lives under **`blog/`** and the
> writing app under **`editor/`**. Shared, Claude-owned context stays at root: `_docs/`, `_note/`,
> `.claude/`, `CLAUDE.md`, `.github/`, `.mise.toml`. **All blog paths in the sections below are now
> relative to `blog/`** (e.g. `src/` → `blog/src/`, run `bun dev` from `blog/`). The `editor/` app is a
> Vite+React+TipTap SPA served by a Hono backend (`/editor` + `/editor-api`); see
> `_docs/active/.../blog-editor-app-plan.md`. Deploys are branch-based: **`prd/blog`** (blog),
> **`prd/editor`** (editor).

## Commands

```bash
# blog: run from blog/  ·  editor: run from editor/
bun dev               # Dev server (--mode dev) — Astro 7 runs it as a daemon;
                      #   stop/inspect with `astro dev stop|status|logs`

bun run build         # Production build (--mode prd)
bun run preview       # Preview built site
bun run all-preprocess-md  # Run all markdown preprocessors (removeUnused → addMdEnter → convertLoader)
```

## Documentation

- All design plans and architecture docs go in `_docs/` at project root
- Before implementing a feature, check `_docs/` for existing plans
- After planning a feature, save the plan to `_docs/<feature-name>-plan.md`

## Project Structure

```
# ROOT: _docs/  _note/  .claude/  CLAUDE.md  .github/  .mise.toml   (shared, Claude-owned)
# editor/                # React+Vite+TipTap SPA + Hono server (/editor, /editor-api) — milestone work
blog/                    # ← everything below is under blog/
src/
├── assets/styles/
│   ├── global.css          # Tailwind 4 entry (@import "tailwindcss", CSS variables, base styles)
│   ├── index.scss          # SCSS aggregator (imports page-specific styles)
│   ├── variables.js        # 400+ vwSize tokens (px1~px400 → min(Xvw, Yrem))
│   └── pages/              # Page-specific SCSS (about, blog, home, projects)
├── components/
│   ├── About/              # About page components (React) - timelines, tech stack
│   ├── Blog/               # Blog components (React + Astro) - articles, search, TOC, comments
│   ├── home/               # Homepage components (React) - intro, icon cloud, terminal
│   ├── layouts/            # Navigation, footer, theme toggle (React + Astro)
│   ├── MetaAnalytics/      # GA, Clarity, meta tags (Astro)
│   ├── Playground/         # Interactive demos (React/Vue/Svelte)
│   ├── Project/            # Portfolio components (React + Astro)
│   └── ui/                 # 40+ UI components (nyxbui/shadcn-based, Radix primitives)
├── content/
│   ├── blog/{web,game,diary}/  # Blog posts (.md/.mdx)
│   ├── project/                # Portfolio entries (.mdx)
│   ├── playground/             # Interactive demo entries (.mdx)
│   └── config.ts               # Astro content collection schemas (zod)
├── layouts/                # Astro layout wrappers (baseLayout, mdLayout, projectLayout)
├── lib/utils.ts            # ny() = clsx + tailwind-merge
├── pages/                  # File-based routing (see Routes below)
├── plugins/remarkMermaidToHtml.mjs  # Custom remark plugin for mermaid diagrams
├── store/                  # Nanostores (blog.ts: category/tag, system.ts: theme)
├── types/commonType.ts     # Shared TypeScript interfaces
├── utils/                  # Config loader, tech icons, word count, markdown preprocessors
└── config.yml              # Site metadata, analytics, social links, comment system config
```

## Routes

| Route | File | Description |
|-------|------|-------------|
| `/` | `pages/index.astro` | Homepage |
| `/about` | `pages/about.astro` | About page |
| `/blog` | `pages/blog.astro` | Blog listing (search, filter) |
| `/blog/[...slug]` | `pages/blog/[...slug].astro` | Blog post detail |
| `/project` | `pages/project.astro` | Project portfolio |
| `/project/[...slug]` | `pages/project/[...slug].astro` | Project detail |
| `/playground` | `pages/playground.astro` | Interactive demos |
| `/playground/[...slug]` | `pages/playground/[...slug].astro` | Demo detail |

## Path Aliases (blog/tsconfig.json)

- `@/*` → `./src/*`
- `~/*` → `./src/*`
- `#/*` → `./*`

## Architecture

### Multi-Framework Islands
- **React** (primary): All interactive UI - blog search, navigation, animations, forms
- **Vue**: uplot charts, some utilities
- **Svelte**: Lightweight demos in playground
- **Astro**: Layouts, static content, media loaders, meta tags

Hydration directives: `client:visible`, `client:idle`, `client:load`

### State Management (Nanostores)
- `store/blog.ts` — `$category`, `$tag` atoms for blog filtering
- `store/system.ts` — `$theme` atom with localStorage persistence
- Bindings: `@nanostores/react`, `@nanostores/vue`

### Styling
- **Tailwind CSS 4** via `@tailwindcss/vite` plugin (NOT `@astrojs/tailwind`)
- **Backward compat**: `@config "../../../tailwind.config.mjs"` in global.css
- **CSS variables**: HSL-based shadcn theme tokens (--background, --foreground, --primary, etc.)
- **Custom tokens**: `variables.js` exports `vwSize` (px1~px400) for responsive sizing via `min(Xvw, Yrem)`
- **Animations**: tw-animate-css + custom keyframes (rippling, shimmer-slide, shiny-text)
- **SCSS**: Page-specific styles in `assets/styles/pages/`
- **Dark mode**: CSS class strategy (`.dark` selector), toggled via nanostores

### UI Components (`components/ui/`)
- Based on **nyxbui** (shadcn-ui fork) — config in `nyxbui.json`
- Radix UI primitives for accessibility
- CVA (class-variance-authority) for variants
- Framer Motion for animations
- Lucide + Iconify for icons

### Content & Markdown
- Astro 7 defaults to the `satteri` markdown processor; this repo pins the remark/rehype
  pipeline via `markdown.processor: unified({...})` from `@astrojs/markdown-remark` (MDX inherits it)
- MDX support via `@astrojs/mdx`
- Code blocks: `astro-expressive-code` with kanagawa-dragon/catppuccin-latte themes
- Math: `remark-math` + `rehype-katex`
- Diagrams: Custom `remarkMermaidToHtml` plugin
- Comments: Giscus (GitHub-backed)

### Content Collections (src/content/config.ts)
```
blog:    { title, category, created, tags?, thumbnail?, updated? }
project: { title, duration, techStacks?, thumbnail?, description? }
playground: { title, duration, techStacks?, thumbnail?, description? }
```

## Deployment (branch-based, self-hosted RPi runner)
- **blog** → push `prd/blog` (`.github/workflows/main.yml`, paths `blog/**`): `bun run build` in `blog/` → `blog/dist` → Docker/Nginx on :4321
- **editor** → push `prd/editor` (`.github/workflows/editor.yml`, paths `editor/**`): Docker (Bun build + Hono) on :4322
- Both also support `workflow_dispatch`. `master` does NOT deploy (no trigger). New-branch path-filter gotcha → use `gh workflow run <wf> --ref prd/xxx`.
- editor public routing: Cloudflare Tunnel hostnames `www.jun-devlog.win/editor` + `/editor-api` → RPi :4322, ordered ABOVE the blog catch-all (first-match-wins)

## Key Dependencies

| Category | Packages |
|----------|----------|
| Core | astro 7 (Vite 8 / Rust compiler), react 19, vue 3.5, svelte 5 |
| Styling | tailwindcss 4, tw-animate-css, sass, tailwind-merge, CVA |
| UI | radix-ui/*, framer-motion, embla-carousel, vaul, cmdk |
| Content | @astrojs/mdx, expressive-code, katex, mermaid, giscus |
| State | nanostores |
| Data Viz | d3, uplot, @minpluto/zorn |
| Validation | zod 4, react-hook-form, @hookform/resolvers |
| Utils | dayjs, fuse.js, es-toolkit, rxjs, uuid |

## Image Assets & Deployment

**New images go through the editor, not `image-assets/`.** Attaching an image in the editor
uploads it immediately to `/files/media/<content-hash>.webp` (+ `-480/-960/-1600` variants,
EXIF/GPS stripped, HEIC converted server-side). Nothing to rsync, nothing to commit.

- **Server path**: `/home/jun/blog-files/` on RPi (Docker bind mount → nginx `/files/`)
  - `media/` — editor uploads. The only place new images land
  - `blog/`, `project/`, `playground/`, `daily/` — legacy assets published from `image-assets/`
- **SSH access**: `ssh raspi` (key-based auth via `~/.ssh/config`)
- **Cleanup**: `/prune-media` — reports `/files/media` files no reference points at (dry-run,
  moves to a trash dir, never unlinks). `bun run prune:media` for the local `.media`

### `blog/image-assets/` — legacy path, still the only one for hand-authored MDX

Two authoring routes exist, and they use different image paths:

| You write the post… | Images go… | How |
|---|---|---|
| in the editor (`/editor`) | `/files/media/<hash>.webp` | attach → uploaded immediately, nothing to do |
| as an MDX file by hand | `/files/<collection>/…` | put them in `image-assets/`, then rsync |

So `image-assets/` is **not retired** — it is what hand-written posts (playground entries, project
pages, anything authored outside the editor) still use. What changed is that it is no longer the
default: if the post is being written in the editor, do not put images here.

Publishing a hand-authored post's images (scope the rsync to the new files — a full sync reports
~6900 legacy originals the server never needed):

```bash
cd blog
bun run node ./src/utils/convertToWebp.js --apply          # png/jpeg → webp (dry-run first)
bun run node ./src/utils/generateVariants.js --match <slug>  # 480/960/1600 + dim manifest
rsync -avz --include='<slug>*' --exclude='*' image-assets/<collection>/ raspi:/home/jun/blog-files/<collection>/
```

`generateVariants` walks *references in content*, so variants only appear after the MDX points at
the images. Commit the resulting `src/data/imageManifest.json` — `image-assets/` itself is
gitignored, so the images travel by rsync only.

The older commands (`/publish-images`, `/preprocess-md`, `/generate-thumbs`, `/convert-heic`,
`/process-diary-mdx`) are marked deprecated: they assume the pre-editor workflow where *every*
post's images lived here. They still work for legacy bulk operations.

Two gotchas if you ever do run them:

- `/publish-images --full` uses `rsync --delete` against `/home/jun/blog-files/`, which now also
  holds `media/`. Without `--exclude=media/` it deletes every editor upload. Incremental (default)
  is unaffected.
- Local `image-assets/` holds raw originals (png/jpeg/MOV) the server never needed; a full sync
  reports ~6900 files to transfer. That is expected, not drift.

## E2E Testing

- **Framework**: Playwright (`@playwright/test`)
- **Config**: `playwright.config.ts` (chromium + mobile-chrome projects)
- **Test files**: `e2e/*.noauth.spec.ts` (no auth), `e2e/*.spec.ts` (auth)
- **All outputs live under `e2e/`** (gitignored):
  - `e2e/screenshots/` — debug screenshots
  - `e2e/etc/` — console logs, misc debug artifacts
  - `e2e/test-results/` — Playwright test artifacts (traces, diffs)
  - `e2e/report/` — Playwright HTML report
- **Never** leave screenshots or debug files in the project root

## Notes

- `@minpluto/zorn` requires custom registry: `.npmrc` has `@minpluto:registry=https://js.registry.sudovanilla.org/`
- SCSS mixed-decls warnings are suppressed via custom logger in astro.config.mjs
- zod v4 is used as direct dependency; Astro ecosystem packages internally use their own zod v3
- Image service is `passthroughImageService()` (no build-time optimization)

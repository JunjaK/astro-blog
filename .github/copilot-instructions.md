# Copilot Instructions for astro-blog

These rules help AI coding agents work productively in this repo. Keep changes minimal, match existing style, and cite concrete files/paths.

## Architecture
- Framework: Astro 5 with islands (React/Svelte/Vue) + Tailwind CSS.
- Content: Astro Content Collections in `src/content` with schemas in `src/content/config.ts` for `blog`, `project`, `playground`.
- Routing:
  - Lists: `src/pages/blog.astro`, `project.astro`, `playground.astro` (use `getCollection()` and custom sorting).
  - Details: `[...slug].astro` under `src/pages/blog/` and `src/pages/project/` render MDX via layout components.
- Layouts: `src/layouts/mdLayout.astro`, `projectLayout.astro`, `baseLayout.astro` compose UI, metadata, scripts, and comments (Giscus).
- Styling: Tailwind with custom CSS/SCSS in `src/assets/styles/*`. Tailwind config extends tokens from `src/assets/styles/variables.js` via `vwSize`.
- State: Lightweight UI state via Nanostores in `src/store/*` (e.g., `$theme`, `$category`, `$tag`).

## Markdown/MDX processing
- Markdown config: see `astro.config.mjs`. Uses `remark-math` + `rehype-katex` and a custom plugin `src/plugins/remarkMermaidToHtml.mjs` that converts code blocks with lang `mermaid` to raw HTML.
- Mermaid runtime: Blog and Project detail pages initialize mermaid on the client, re-running on theme changes via a `theme-set` event listener in the page scripts.
- Image/Video helpers: Prefer components under `src/components/Blog/*`:
  - `ImageLoader.astro` uses `getBasePathWithUrl()` for correct base URL (dev injects prod base domain).
  - `VideoLoader.astro` wraps Zorn player with a unique `PlayerName` id.

## Project scripts (pnpm)
- `pnpm dev`: `astro dev --mode dev` (note `MODE=dev` affects `getBasePathWithUrl`).
- `pnpm build`: `astro build --mode prd` (production). `pnpm build-dev` builds with `--mode dev`.
- Content utilities (run consciously, they mutate files):
  - `pnpm conv-loader`: Rewrites MDX images/videos and frontmatter `thumbnail` to use `/files/.../assets` prefixes. Only updates `.mdx` files.
  - `pnpm remove-unused`: Deletes images under `./blog-assets` not referenced from `./src/content/blog/**/*.{md,mdx}`.
  - `pnpm add-md-enter`: Appends two spaces to the end of every line in blog MD/MDX (forces Markdown line breaks).
  - `pnpm all-preprocess-md`: Runs the three utilities in sequence.

## Content conventions
- Frontmatter schemas:
  - Blog: `{ title, category, thumbnail?, created (Date), tags?, updated? }`.
  - Project/Playground: `{ title, thumbnail?, duration ("YYYY-MM ~ YYYY-MM"), techStacks?, description? }`.
- Slugs and paths: Content lives under `src/content/{blog,project,playground}` and routes map to `/blog/{slug}`, `/project/{slug}`.
- Sorting:
  - Blog: `created` descending via `dayjs` in `getStaticPaths()`/list page.
  - Project/Playground: Sort by the start date parsed from `duration`.

## Rendering patterns
- Use layouts for pages:
  - Blog detail: `<MdLayout post={post.data} nav={{prev,next}} url={`/blog/${post.slug}`}>` then `<Content />`.
  - Project detail: `<ProjectLayout post={post.data} url={`/project/${post.slug}`}>` then `<Content />`.
- TOC: `TableOfContents.astro` expects an HTML UL structure; it converts it to anchor links and generates slugs that support English/Korean/Japanese/Chinese ranges.
- Theme: `mdLayout.astro` manages theme persistence in `localStorage` and toggles `document.documentElement.classList('dark')`; dispatch custom `theme-set` events for mermaid re-render.

## Integrations and Vite
- `astro.config.mjs` integrations: React, Svelte (runes enabled via `svelte.config.js`), Vue, Tailwind (no base styles), Sitemap, Expressive Code (themes `kanagawa-dragon` and `catppuccin-latte` with plugins: collapsible sections, line numbers, color chips), MDX.
- Images: `image.service` is `passthroughImageService` (no Astro image optimization).
- Vite: SSR marks `react-use` as `noExternal` and included in optimizeDeps.

## Tailwind usage
- Classes use `ny()` util (`src/lib/utils.ts`) for clsx + tailwind-merge when needed.
- Design tokens: use `vwSize` keys (e.g., `text-px16`, `p-px24`) defined in `src/assets/styles/variables.js`.

## Authoring tips for agents
- Prefer existing UI components under `src/components` before adding new ones; match file organization by feature (Blog, Project, etc.).
- When modifying blog/project MDX, ensure images/videos use `ImageLoader`/`VideoLoader` or run `pnpm conv-loader`.
- Be careful with `getBasePathWithUrl`: in dev it prepends `https://www.jun-devlog.win`; supply absolute site paths like `/files/...`.
- Keep code client-side only where needed; most pages render statically and hydrate islands via `client:*` directives.

## Runbook
- Install and run:
  ```sh
  pnpm i
  pnpm dev
  ```
- Build preview:
  ```sh
  pnpm build
  pnpm preview
  ```

# Astro Blog - jun-devlog

Personal developer blog built with Astro 5, featuring multi-framework islands (React 19, Vue 3.5, Svelte 5).

**Site:** https://www.jun-devlog.win
**Node:** 24 (mise) | **Package Manager:** bun

## Commands

```bash
bun dev               # Dev server (--mode dev)
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
_docs/                  # Design plans & architecture docs
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

## Path Aliases (tsconfig.json)

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

## Deployment
- **CI/CD**: GitHub Actions on push to `master` (self-hosted runner on Raspberry Pi 4)
- **Tooling**: mise (node 24 + bun) → `bun run build` → Docker image → container restart
- **Docker**: Ubuntu/Nginx image, serves static dist/ on port 4321

## Key Dependencies

| Category | Packages |
|----------|----------|
| Core | astro 5, react 19, vue 3.5, svelte 5 |
| Styling | tailwindcss 4, tw-animate-css, sass, tailwind-merge, CVA |
| UI | radix-ui/*, framer-motion, embla-carousel, vaul, cmdk |
| Content | @astrojs/mdx, expressive-code, katex, mermaid, giscus |
| State | nanostores |
| Data Viz | d3, uplot, @minpluto/zorn |
| Validation | zod 4, react-hook-form, @hookform/resolvers |
| Utils | dayjs, fuse.js, es-toolkit, rxjs, uuid |

## Image Assets & Deployment

- **Local storage**: `image-assets/` at project root (not in `src/content/`)
- **Server path**: `/home/jun/blog-files/` on RPi (Docker bind mount → nginx `/files/`)
- **SSH access**: `ssh raspi` (key-based auth via `~/.ssh/config`)
- **Skills**: `/publish-images` (rsync + preprocess), `/preprocess-md` (preprocess only)

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
- `react-use` needs `ssr.noExternal` + `optimizeDeps.include` in Vite config
- SCSS mixed-decls warnings are suppressed via custom logger in astro.config.mjs
- zod v4 is used as direct dependency; Astro ecosystem packages internally use their own zod v3
- Image service is `passthroughImageService()` (no build-time optimization)

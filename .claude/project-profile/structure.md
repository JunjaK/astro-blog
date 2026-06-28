# Project Structure

## Directory Layout
```
_docs/                       # Design plans & architecture docs (check before implementing)
image-assets/                # Local image storage (synced to RPi, NOT in src/)
e2e/                         # Playwright + agent-browser tests (outputs gitignored)
scripts/                     # Build scripts (bundle-icons.mjs)
src/
├── assets/
│   ├── images/
│   └── styles/              # global.css (Tailwind entry), index.scss, variables.js, pages/*.scss
├── components/
│   ├── About/               # About page (React) — timelines, tech stack
│   ├── Blog/                # Blog (React + Astro) — articles, search, TOC, comments, DiaryGallery
│   ├── home/                # Homepage (React)
│   ├── layouts/             # Nav, footer, theme toggle (React + Astro)
│   ├── MetaAnalytics/       # GA, Clarity, meta tags (Astro)
│   ├── Playground/          # Interactive demos (React/Vue/Svelte)
│   ├── Project/             # Portfolio (React + Astro)
│   └── ui/                  # 41 UI components (nyxbui/shadcn, Radix, CVA)
├── content/
│   ├── blog/{web,game,diary}/  # Blog posts (.md/.mdx)
│   ├── project/                # Portfolio entries (.mdx)
│   ├── playground/             # Demo entries (.mdx)
│   └── etc/                    # Misc content
├── layouts/                # Astro layout wrappers (baseLayout, mdLayout, projectLayout)
├── lib/utils.ts            # ny() = clsx + tailwind-merge
├── pages/                  # File-based routing (see Routing)
├── plugins/                # remarkMermaidToHtml.mjs, remarkLyricsBlock.mjs
├── store/                  # Nanostores (system.ts: theme, polaroid.ts: lightbox)
├── types/commonType.ts     # Shared TypeScript interfaces
├── utils/                  # Config loader, markdown preprocessors, word count, __tests__/
└── content.config.ts       # Astro content collection schemas (zod)
```

## Routing Pattern
- Type: **file-based** (Astro)
- Pages location: `src/pages/`
- Dynamic routes: `[...slug]` (rest params) — e.g. `blog/[...slug].astro`
- Routes: `/` `/about` `/blog` `/blog/[...slug]` `/project` `/project/[...slug]` `/playground` `/playground/[...slug]` `/404` `/rss.xml`
- Special: `pages/rss.xml.ts` (endpoint), `pages/etc/` (misc)

## Module Organization
- Page logic: thin `.astro` route → components under `src/components/<Area>/`
- Shared components: `src/components/` (grouped by page area + `ui/`)
- Utilities: `src/utils/` (build/preprocess scripts), `src/lib/utils.ts` (runtime `ny()`)
- Types: `src/types/commonType.ts`; component-local `types.ts` (e.g. DiaryGallery/types)
- Content schemas: `src/content.config.ts` (note: filename is `content.config.ts`, NOT `content/config.ts`)

## Naming Conventions
- Files: components `PascalCase.tsx` (e.g. `TechStack.tsx`); utils/stores `camelCase.ts` / `kebab-case`; ui components `kebab-case.tsx` (shadcn convention)
- Components: PascalCase, named exports (`export function TechStack()`)
- Stores: `<name>.ts` exporting `$`-prefixed atoms (`$theme`, `$polaroidLightbox`)
- Tests: `*.noauth.spec.ts` (Playwright, no auth), `*.spec.ts` (auth), `*.ab.test.ts` (agent-browser/Vitest)

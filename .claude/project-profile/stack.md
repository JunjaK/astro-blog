# Tech Stack

## Runtime
- Language: TypeScript (strict, `astro/tsconfigs/strict`)
- Runtime: Node 24 (via mise; `.mise.toml`)
- Package manager: **Bun**
- Detection: `bun.lock` lockfile present at repo root

## Framework
- Framework: **Astro 6.3.6** (multi-framework islands)
  - React 19 (`@astrojs/react`) — primary interactive UI
  - Vue 3.5 (`@astrojs/vue`) — charts/utilities
  - Svelte 5 (`@astrojs/svelte`) — lightweight playground demos
- UI library: **nyxbui** (shadcn-ui fork) on Radix UI primitives (`src/components/ui/`, 41 components)
- CSS: **Tailwind CSS 4** via `@tailwindcss/vite` (NOT `@astrojs/tailwind`) + SCSS for page styles

## Key Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| astro | 6.3.6 | Static site generator / islands |
| react / react-dom | ^19.2 | Primary island framework |
| vue | ^3.5 | Charts (uplot), utilities |
| svelte | ^5.50 | Playground demos |
| tailwindcss | ^4.1 | Styling (via @tailwindcss/vite) |
| nanostores | ^1.1 | Cross-island state (atoms) |
| zod | ^4.3 | Content collection schemas |
| @astrojs/mdx | 5.0.6 | MDX content |
| astro-expressive-code | ^0.41 | Code block rendering |
| astro-pagefind | ^1.8 | Static search index |
| katex / rehype-katex / remark-math | — | Math rendering |
| mermaid | ^11.12 | Diagrams (custom remark plugin) |
| framer-motion / motion | ^12.34 | Animations |
| three / @react-three/fiber / @react-three/drei / ogl | — | 3D / WebGL playground |
| d3 / uplot / @minpluto/zorn | — | Data viz |
| @giscus/react | ^3.1 | Comments |
| react-hook-form / @hookform/resolvers | — | Forms |
| es-toolkit / dayjs / rxjs / uuid | — | Utilities |

## Build (use Bun — run from `blog/`)
- Dev: `bun dev` (= `astro dev --mode dev`)
- Build: `bun run build` (= `astro build --mode prd`)
- Preview: `bun run preview`
- Install: `bun install` (CI: `bun install --frozen-lockfile`)
- Markdown preprocess: `bun run all-preprocess-md` (thumbs → removeUnused → addMdEnter → convertLoader)

## Build & Verify — AUTHORITATIVE commands
> No `typecheck`/`lint` npm scripts are defined. Use the tools directly.
- Type-check (authoritative): `bunx astro check` (Astro-aware; also checks `.astro`). Plain `tsc --noEmit` works for `.ts/.tsx` but skips `.astro`.
  - Vacuity-checked: NO — not yet run during profile generation. Run once before gating.
  - Pre-existing error baseline: UNKNOWN — establish on first run; gate on net-new.
- Lint (authoritative): `bunx eslint .` — config `eslint.config.js` (`@antfu/eslint-config`, astro+react+ts). Baseline: UNKNOWN.
- Test (authoritative): `bunx playwright test` (E2E) + `bun run test:e2e:ab` (agent-browser via Vitest). Confirmed test files exist (5 Playwright specs + 1 `.ab.test.ts`).

## Registry / install gotchas
- `@minpluto/zorn` needs custom registry in `.npmrc`: `@minpluto:registry=https://js.registry.sudovanilla.org/`
- zod v4 is a direct dep; Astro ecosystem internally uses zod v3 — do NOT force a global override (breaks `@astrojs/sitemap`).
- `@parcel/watcher` and `unrs-resolver` are in `trustedDependencies` (bun blocks their postinstall by default).

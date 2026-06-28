# UI Components

## Component Library
- Name: **nyxbui** (a shadcn-ui fork) — config in `nyxbui.json`; CLI `shadcn` ^3.8 is a devDependency
- Location: `src/components/ui/` (41 components)
- Primitives: **Radix UI** (`@radix-ui/react-*` — dialog, dropdown-menu, select, tabs, scroll-area, avatar, collapsible, label, separator, slot, etc.)
- Variants: **CVA** (`class-variance-authority`)
- Class merge helper: **`ny()`** in `src/lib/utils.ts` (= `clsx` + `tailwind-merge`) — use this, not raw `clsx`
- Import pattern: manual, per-file — `import { Card, CardContent } from '@/components/ui/card'`

## Animation / Interaction
- `framer-motion` / `motion` (^12.34) — `AnimatePresence`, `motion.*`
- `tw-animate-css` + custom keyframes (rippling, shimmer-slide, shiny-text)
- `embla-carousel-react`, `vaul` (drawer), `cmdk` (command palette)
- 3D/WebGL: `three` + `@react-three/fiber` + `@react-three/drei`, `ogl` (playground only)

## Icons
- Libraries: **Iconify** (`@iconify/react`, `@iconify/vue`) with bundled icon JSON sets
- Installed sets: `material-symbols`, `mingcute`, `mynaui`, `qlementine-icons`, `svg-spinners`, `tabler`
- Also `lucide-react` (^0.469)
- Global CLAUDE.md priority: **material-symbols > mdi > others** (icones.js.org)
- Custom icon bundling: `scripts/bundle-icons.mjs` (`bun run bundle-icons`)

## Design Tokens
- Colors: HSL-based shadcn CSS variables (`--background`, `--foreground`, `--primary`, …) in `src/assets/styles/global.css`
- Dark mode: `.dark` class strategy (toggled via `$theme` nanostore)
- Responsive sizing: `src/assets/styles/variables.js` exports `vwSize` tokens `px1`–`px400` → `min(Xvw, Yrem)`
- Tailwind 4 entry: `global.css` (`@import "tailwindcss"`), with `@config "../../../tailwind.config.mjs"` for backward compat
- Page-specific SCSS: `src/assets/styles/pages/` (aggregated by `index.scss`)
- Fonts: Fontsource — Noto Sans KR (variable), Gothic A1, M PLUS 1p, Roboto

## Common Patterns
- Each interactive island needs its own `client:*` directive (`client:visible` / `client:idle` / `client:load`). Children of a hydrated component render as static `<astro-slot>` and do NOT hydrate — wrap nested interactivity as its own island.
- Buttons MUST have visible bg/border (global rule): `default`/`outline`/`secondary`/`destructive`; `ghost` for icon-only.
- `.article-entry img` global CSS forces `height: auto` — overrides Tailwind height utils on `<img>` inside article content (use `background-image`/inline style to bypass).

## Content/Markdown Rendering
- MDX via `@astrojs/mdx`; code blocks via `astro-expressive-code` (themes: kanagawa-dragon / catppuccin-latte) with collapsible-sections, line-numbers, color-chips plugins
- Math: `remark-math` + `rehype-katex`; Diagrams: custom `remarkMermaidToHtml`; Lyrics: custom `remarkLyricsBlock`
- MDX gotcha: JSX tags must be at column 0 (un-indented) after markdown lists, or the parser treats them as list continuation

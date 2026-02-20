# Codebase Improvement Analysis

> Analyzed: 2026-02-20
> Scope: Astro 5.x feature adoption, React 19 features, code quality, Starlight comparison
> Base: Codebase originally built Feb 2025, library versions updated Feb 2026 without adopting new framework features

---

## Table of Contents

1. [Unused Astro 5.x Features](#1-unused-astro-5x-features)
2. [Unused React 19 Features](#2-unused-react-19-features)
3. [Code Quality Issues](#3-code-quality-issues)
4. [Starlight Comparison](#4-starlight-comparison)
5. [Prioritized Recommendations](#5-prioritized-recommendations)

---

## 1. Unused Astro 5.x Features

### 1.1 Content Layer API (v5.0) — HIGH IMPACT

**Current state:** `src/content/config.ts` uses the legacy `type: 'content'` API. Code still references `post.slug` (deprecated in Astro 5; replaced by `id`).

**What Content Layer provides:**
- 5x faster Markdown builds, 2x faster MDX, 25-50% memory reduction
- `id` replaces deprecated `slug`
- `loader`-based architecture supports custom sources (filesystem, CMS, API)
- Required for Astro 6 (which removes legacy collections entirely)

**Migration pattern:**
```ts
// Legacy (current)
const blog = defineCollection({ type: 'content', schema: z.object({...}) })

// Astro 5 Content Layer
import { glob } from 'astro/loaders'
const blog = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/blog' }),
  schema: z.object({...})
})
```

**Files to modify:**
- `src/content/config.ts` — collection definitions
- `src/pages/blog/[...slug].astro` — `post.slug` → `post.id`, `getStaticPaths` changes
- `src/pages/project/[...slug].astro` — same
- `src/pages/playground/[...slug].astro` — same
- `src/pages/blog.astro` — `getCollection` return type changes
- `src/components/Blog/Articles.tsx` — prop types may change

### 1.2 Responsive Images (v5.10) — HIGH IMPACT

**Current state:** `passthroughImageService()` in `astro.config.mjs`. All images use raw `<img>` tags via `ImageLoader.tsx` (which is an identity wrapper — returns `src` unchanged).

**What Responsive Images provide:**
- Automatic `srcset` and `sizes` generation
- Automatic `width`/`height` to prevent CLS
- `loading="lazy"` + `decoding="async"` by default
- `layout="constrained" | "full-width" | "fixed"` modes

**Consideration:** Images are hosted externally on RPi (`/files/`). Need to evaluate whether `<Image>` works with external URLs or if a custom image service adapter is needed.

**Files involved:**
- `astro.config.mjs` — image service configuration
- `src/components/Blog/ImageLoader.tsx` — replace with `<Image>` or enhance
- `src/components/Blog/ImageLoader.astro` — same
- MDX content files — generated `<ImageLoader>` tags from `convertLoader.js`

### 1.3 SVG Components (v5.7) — LOW EFFORT

SVG files importable as Astro components with customizable props (width, height, fill). Minor quality-of-life improvement for any inline SVGs.

### 1.4 Fonts API (v5.7, experimental) — MEDIUM IMPACT

Auto-optimizes web fonts (preload links, fallbacks). Currently loading 3 Google Fonts (Gothic A1, M Plus 1p, Roboto) via `@fontsource` packages in layout files. Fonts API could automate preload/fallback handling.

### 1.5 Configuration Imports (v5.7) — LOW IMPACT

`astro:config/client` and `astro:config/server` virtual modules for type-safe config access. Could replace `src/utils/config.ts` YAML loader for site metadata.

---

## 2. Unused React 19 Features

### 2.1 Assessment: Limited Applicability

React 19's headline features (Server Components, Actions, `use()`) are designed for server-rendered React apps. In Astro's islands architecture, most have limited value:

| Feature | Applicability | Notes |
|---------|--------------|-------|
| `use()` hook | Low | Data comes from Astro frontmatter props, not client-side promises |
| `useOptimistic` | Low | Could show optimistic search results, but Fuse.js is already fast |
| `useActionState` + Form Actions | Low | `react-hook-form` + Zod is more ergonomic for field-level validation |
| Server Components | None | Astro handles server rendering; React islands are client-only |

**Conclusion:** Current React usage patterns are appropriate. No urgent React 19 migration needed.

---

## 3. Code Quality Issues

### 3.1 Triple Duplication — Mermaid Script

~85 identical lines of Mermaid initialization code exist in three files:
- `src/pages/blog/[...slug].astro`
- `src/pages/project/[...slug].astro`
- `src/pages/playground/[...slug].astro`

**Fix:** Extract to a shared `MermaidInit.astro` component.

### 3.2 Triple Duplication — Theme Init Script

The `<script is:inline>` block that reads `localStorage.theme` and applies `.dark` class is identical across all three layouts:
- `src/layouts/baseLayout.astro`
- `src/layouts/mdLayout.astro`
- `src/layouts/projectLayout.astro`

**Fix:** Extract to a shared `ThemeInit.astro` component.

### 3.3 Overlapping Theme Systems

Three mechanisms coexist:

1. **`.dark` CSS class** (Tailwind 4 / shadcn tokens) — the correct approach
2. **`data-theme="dark"` attribute** (legacy SCSS variables in `global.css` under `[data-theme="dark"]:root`) — old system
3. **`next-themes` package** in `package.json` — completely unused, never imported

The inline script in layouts and the nanostore in `ModeToggle.tsx` both manage theme state independently, creating potential for divergence and a flash of wrong theme.

**Fix:** Unify on `.dark` class only. Remove `data-theme` attribute usage. Remove `next-themes` dependency.

### 3.4 Dead Code

| Item | Location | Issue |
|------|----------|-------|
| `$category`, `$tag` nanostores | `src/store/blog.ts` | Defined and exported, never consumed anywhere. Blog filtering uses local React state in `Articles.tsx` |
| `next-themes` package | `package.json` | Listed as dependency, never imported |
| `getBasePathWithUrl()` | `src/utils/` | Identity function — returns input unchanged |
| `unplugin-icons` types | `tsconfig.json` `types` array | Package not installed in `package.json` |

### 3.5 Hardcoded Values

| Item | Location | Issue |
|------|----------|-------|
| Blog categories `['Web', 'Diary', 'Game']` | `src/components/Blog/CategoryTags.tsx` | Should derive from collection data at build time |
| Giscus theme `"noborder_dark"` | `src/components/Blog/GiscusComp.tsx` | Always dark regardless of site theme |
| Template placeholders | `src/config.yml` | `author: D-Sketon`, `url: https://example.com` from original template |

### 3.6 Navigation Hydration Flash

`Navigation` component uses `client:idle`. Active tab state is computed inside `useEffect` (client-side only). Result: no tab appears active until React hydrates. On Three.js-heavy pages, the browser may not become "idle" for several seconds.

**Fix options:**
- Switch to `client:load` for Navigation
- Or render active state server-side via Astro props and pass to React

### 3.7 Fragile Duration Parsing

`project.astro` and `playground.astro` sort entries by parsing the `duration` string field (`"2023-01 ~ 2024-06"`) via `split(' ~ ')[0]` — no validation, will break silently on unexpected formats.

---

## 4. Starlight Comparison

> Starlight is a documentation-focused theme, not a blog theme. Direct 1:1 comparison is not fair, but several architectural patterns are worth adopting.

### 4.1 Search: Pagefind vs Fuse.js — RECOMMEND SWITCHING

| Aspect | Current (Fuse.js) | Starlight (Pagefind) |
|--------|-------------------|---------------------|
| Index size | All post data shipped as JSON props to client | Static index at build time (~1% of content) |
| Bundle impact | Fuse.js (24kB gzip) + full content in HTML | Pagefind WASM (~50kB) + tiny on-demand chunks |
| Search quality | Fuzzy matching, weight-tuned | Full-text with relevance ranking |
| Configuration | Manual setup | Zero-config after build |
| Content scope | Titles + body text | All rendered HTML |
| Scalability | HTML payload grows linearly with post count | Index chunks loaded on demand |

**Key problem:** Current approach ships every blog post's full body text to the client as React props. As content grows, the `/blog` page HTML payload will grow unboundedly.

### 4.2 Features Starlight Has That Are Missing Here

| Feature | Starlight | Current Implementation |
|---------|-----------|----------------------|
| TOC with active heading | Built-in with IntersectionObserver | Static list, no active highlighting |
| Dark mode | Built-in, SSR-safe, no flash | Triple system with hydration flash |
| i18n | Built-in routing + UI translations | Not implemented |
| Breadcrumbs | Built-in | Not implemented |
| Edit page link | Built-in (`editUrl`) | Not implemented |
| Last updated date | Auto from git history | Manual `updated` frontmatter field |
| Skip-to-content link | Built-in | Not implemented |
| WAI-ARIA navigation | Full compliance | Minimal (only what Radix provides) |

### 4.3 This Project's Strengths Over Starlight

- Sophisticated gallery system (DiaryGallery: CSS3D, WebGL scatter, carousel ring)
- Three.js / WebGL support
- Category/tag-based blog filtering
- Giscus comments integration
- Flexible creative/portfolio layout
- Multi-framework islands (React + Vue + Svelte)

---

## 5. Prioritized Recommendations

### Tier 1 — High Impact, Moderate Effort

| # | Task | Rationale |
|---|------|-----------|
| 1 | **Migrate to Content Layer API** | Faster builds, `slug` → `id`, mandatory for Astro 6 (which removes legacy collections) |
| 2 | **Replace Fuse.js with Pagefind** | Eliminate shipping all post bodies to client; scales with content growth |
| 3 | **Add IntersectionObserver to TOC** | Active heading highlighting is standard expected UX for blog posts |

### Tier 2 — Medium Impact, Low Effort

| # | Task | Rationale |
|---|------|-----------|
| 4 | **Extract duplicated scripts** | MermaidInit.astro + ThemeInit.astro — removes ~200 lines of duplication |
| 5 | **Remove dead code** | `next-themes`, unused nanostores, `getBasePathWithUrl`, stale `unplugin-icons` types |
| 6 | **Fix Giscus theme sync** | Subscribe to nanostore `$theme` to match site theme |
| 7 | **Derive categories from collection data** | `[...new Set(posts.map(p => p.data.category))]` instead of hardcoding |

### Tier 3 — Nice to Have

| # | Task | Rationale |
|---|------|-----------|
| 8 | **Unify theme system** | Drop `data-theme` attribute, use `.dark` class only |
| 9 | **Add skip-to-content link** | Basic accessibility |
| 10 | **Evaluate `<Image>` component** | Even with external images, width/height prevents CLS |
| 11 | **Extend Pagefind to playground/project** | Consistent search across all content types |

### Astro 6 Readiness Checklist

- [x] Node 22+ (CI uses Node 24)
- [x] Zod 4 (already a direct dependency)
- [ ] Content Layer API migration (Tier 1, #1) — **blocks Astro 6 upgrade**
- [ ] Replace `post.slug` with `post.id` throughout
- [ ] Remove any `Astro.glob()` usage (if any)
- [ ] Audit `<ViewTransitions />` → already using `<ClientRouter>` (correct)

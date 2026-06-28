# Project Profile

> Generated: 2026-06-28
> Last updated: 2026-06-28
> Profile-Generated-At: 29d8a97

## Quick Summary
- **Stack**: Astro 6 (multi-framework islands: React 19 / Vue 3.5 / Svelte 5) + TypeScript + nyxbui (shadcn/Radix)
- **Package manager**: Bun (Node 24 via mise)
- **Test framework**: Playwright (E2E) + Vitest 4 (agent-browser)
- **State management**: Nanostores (atoms)
- **API layer**: ⏭️ None — static SSG, content collections + Pagefind + Giscus
- **CI/CD**: GitHub Actions → build (ubuntu) + deploy (self-hosted RPi, Docker/Nginx)

## Profile Files

Relevance: REQUIRED (always read) > HIGH (read if related) > MEDIUM (optional) > SKIPPED (not applicable)

Status tokens: `✅` scanned-from-code · `⏭️` Skipped (not applicable) · `🌱` Seeded.

| File | Relevance | Status | Contents |
|------|-----------|--------|----------|
| [stack.md](./stack.md) | REQUIRED | ✅ | Runtime, framework, dependencies, build |
| [structure.md](./structure.md) | REQUIRED | ✅ | Directory layout, routing, naming |
| [code-style.md](./code-style.md) | HIGH | ✅ | Formatting, imports, naming patterns |
| [api-layer.md](./api-layer.md) | HIGH | ⏭️ | Skipped — static site, no backend API |
| [state-management.md](./state-management.md) | MEDIUM | ✅ | Nanostores atoms, reactivity rules |
| [testing.md](./testing.md) | HIGH | ✅ | Playwright + Vitest, commands, patterns |
| [ui-components.md](./ui-components.md) | MEDIUM | ✅ | nyxbui/Radix, Iconify, design tokens |
| [deployment.md](./deployment.md) | MEDIUM | ✅ | GitHub Actions, RPi Docker, SSG output |

## Key Conventions for Agents

1. **Bun, not npm/pnpm** — `bun dev`, `bun run build`, `bun install --frozen-lockfile`. Node 24 via mise.
2. **Multi-framework islands** — React is primary; every interactive component needs its own `client:*` directive. Children of a hydrated island render as static `<astro-slot>` and do NOT hydrate.
3. **Cross-island state = Nanostores** — `$`-prefixed atoms in `src/store/`, mutated via exported functions (`setTheme`). Subscribe with `useStore()`. NOT Pinia/Zustand/Redux.
4. **Tailwind 4 via `@tailwindcss/vite`** (not `@astrojs/tailwind`); merge classes with `ny()` from `@/lib/utils.ts`; dark mode = `.dark` class.
5. **UI from `src/components/ui/`** (nyxbui/shadcn on Radix + CVA); icons via Iconify (material-symbols first) + lucide. Buttons must have visible bg/border.
6. **Style**: antfu eslint config — 2-space, single quotes, semicolons, arrow-parens always. Named exports, `function` keyword for components, type-only imports first. Aliases `@/` `~/` → `src/`, `#/` → root. Import paths may include `.ts`/`.tsx`.
7. **Content** = MDX/Markdown in `src/content/{blog,project,playground}`, validated by zod in `src/content.config.ts` (note filename). No `any`/`unknown`.
8. **Tests** = Playwright `e2e/*.noauth.spec.ts` + Vitest `*.ab.test.ts`; ALL test artifacts stay under `e2e/` (gitignored), never project root. `client:visible` islands need scroll + hydration wait.
9. **Verify** (no npm scripts): `bunx astro check` (types), `bunx eslint .` (lint), `bunx playwright test` (E2E). Establish baselines before gating on net-new errors.
10. **Docs** → `_docs/` (check before implementing, save plans after). i18n/Korean text uses corner brackets `「」`.

## Caveats / Drift vs CLAUDE.md
- CLAUDE.md says Astro 5 in one spot and Astro 6 in another — **actual: Astro 6.3.6**.
- CLAUDE.md references `store/blog.ts` and `content/config.ts` — neither exists. Actual stores: `system.ts`, `polaroid.ts`; actual schema file: `content.config.ts`.

## Agent Loading Guide
- **All agents**: Read this `index.md` (REQUIRED)
- **Read additional files when**: relevance is REQUIRED/HIGH for your role, your task touches that domain, and status is ✅ (skip ⏭️ api-layer.md).

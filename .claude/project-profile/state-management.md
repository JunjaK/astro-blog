# State Management

## Library
- Name: **Nanostores** (`nanostores` ^1.1)
- Bindings: `@nanostores/react`, `@nanostores/vue` (cross-framework island sharing)
- Store types: plain `atom()` stores with module-level mutator functions (no Pinia/Zustand/Redux)

## Why nanostores
Islands from different frameworks (React/Vue/Svelte) hydrate independently. Nanostores is framework-agnostic, so a single atom can be shared across islands without a provider tree — critical because Astro island children render as static `<astro-slot>` and don't share React context.

## Store Patterns
Stores live in `src/store/`, one concern per file, exporting `$`-prefixed atoms plus named mutator functions.

### Pattern: atom + mutator functions
- Scope: app-wide (module singleton), persists for page lifetime
- File location: `src/store/<name>.ts`
- Examples:
  - `src/store/system.ts` — `$theme = atom('dark')` + `setTheme(theme)` (syncs `localStorage`, respects `prefers-color-scheme`)
  - `src/store/polaroid.ts` — `$polaroidLightbox = atom<PolaroidLightboxState>({...})` + `openPolaroidLightbox` / `closePolaroidLightbox` / `setPolaroidLightboxIndex`

Object atoms are updated immutably: read with `.get()`, write a spread copy with `.set({ ...current, ... })`.

## Reactivity Rules
- React: subscribe with `useStore($atom)` from `@nanostores/react`
- Vue: subscribe with `useStore($atom)` from `@nanostores/vue`
- Mutate only via exported functions (e.g. `setTheme`), never `.set()` ad-hoc from components
- Theme is persisted to `localStorage`; dark mode is a `.dark` class strategy on `<html>`

## Cross-Store Dependencies
- None observed. Stores are independent single-concern atoms.
- Typed object state uses a `type` alias co-located in the store file or imported from a component `types.ts` (e.g. `PolaroidImage` from `@/components/Blog/DiaryGallery/types`).

> Note: older CLAUDE.md text mentions `store/blog.ts` (`$category`, `$tag`) — that file does NOT currently exist. Current stores are `system.ts` and `polaroid.ts`.

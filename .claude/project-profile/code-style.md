# Code Style

## Formatting
- Tool: **ESLint** via `@antfu/eslint-config` (`eslint.config.js`) — includes stylistic rules + Prettier-backed formatters for css/html/markdown
- Semicolons: **yes**
- Quotes: **single**
- Indent: **2 spaces**
- Arrow parens: **always** (`'style/arrow-parens': ['error', 'always']`)

## Import Patterns
- Aliases: `@/*` and `~/*` → `./src/*`; `#/*` → repo root (`tsconfig.json`)
- Extensions: import paths often include `.ts`/`.tsx` (`allowImportingTsExtensions: true`) — e.g. `@/store/system.ts`, `@/types/commonType.ts`
- Style: **named imports** preferred; `import type { X }` for type-only imports (placed first)
- Ordering: auto-sorted by antfu config (type imports → external → internal); do not hand-order
- ui components imported from `@/components/ui/<name>` (barrel-free, per-file)

## Naming
- Variables / functions: camelCase
- Components: PascalCase (declared with `function` keyword, not arrow consts)
- Types / Interfaces: PascalCase (`type` preferred — `consistent-type-definitions` is off, but `type X = {}` is used, e.g. `PolaroidLightboxState`)
- Nanostore atoms: `$`-prefixed (`$theme`, `$polaroidLightbox`)
- Constants: camelCase / SCREAMING_SNAKE as fits
- Files: see structure.md

## Relaxed Rules (from eslint.config.js)
- `no-console`, `no-unused-vars`, `unused-imports/*` → **warn** (not error)
- `node/prefer-global/process` → off (so bare `process.env` is allowed)
- `ts/no-namespace`, `ts/ban-ts-comment`, `ts/no-use-before-define` → off

## Code Ordering (React components)
Observed pattern (e.g. `TechStack.tsx`):
1. Store subscriptions (`useStore($atom)`)
2. Local state (`useState`)
3. Effects (`useEffect`)
4. Derived/helper functions
5. JSX return

Aligns with the global CLAUDE.md ordering rule (hooks → stores → data → local state → effects → handlers → JSX).

## TypeScript
- `astro/tsconfigs/strict` base; `jsx: react-jsx`, `jsxImportSource: react`
- Global CLAUDE.md: **no `any`, no `unknown`** — concrete/derived types; explicit param types, inferred returns

# Testing

## Frameworks
| Type | Framework | Config | Location |
|------|-----------|--------|----------|
| E2E | **Playwright** (`@playwright/test` ^1.58) | `playwright.config.ts` | `e2e/*.spec.ts` |
| Agentic/browser | **Vitest 4** (drives agent-browser) | `vitest.e2e.config.ts` | `e2e/*.ab.test.ts` |
| Unit | Vitest 4 (available; minimal use) | — (no dedicated config) | `src/utils/__tests__/` |

There is no component unit-test harness (no React Testing Library setup). Verification is primarily E2E + build.

## Test Commands
- E2E (Playwright): `bunx playwright test`
- Single project: `bunx playwright test --project=chromium` (or `mobile-chrome`)
- Agent-browser (Vitest): `bun run test:e2e:ab` (= `vitest run --config vitest.e2e.config.ts`)
- HTML report: opens from `e2e/report/`

## Playwright Config (`playwright.config.ts`)
- `testDir: ./e2e`, `outputDir: ./e2e/test-results`
- Projects: **chromium** (Desktop Chrome) + **mobile-chrome** (Pixel 5)
- `fullyParallel: true`; CI: `retries: 2`, `workers: 1`, `forbidOnly: true`
- `baseURL: http://localhost:4321`; `webServer: bun dev` (`reuseExistingServer: true`)

## Vitest E2E Config (`vitest.e2e.config.ts`)
- `include: e2e/**/*.ab.test.ts`, `pool: forks`, `maxConcurrency: 1`, `testTimeout: 60s`

## Patterns
- File naming: `*.noauth.spec.ts` (no auth — the norm here), `*.spec.ts` (auth), `*.ab.test.ts` (agent-browser)
- Existing specs: `home`, `blog-music`, `diary-gallery`, `tokyo-diary-scrapbook`, `live2d-widget` (all `.noauth.spec.ts`)
- `client:visible` islands: in tests call `scrollIntoViewIfNeeded()` + `waitForTimeout(~2000)` to let hydration complete before asserting
- All outputs under `e2e/` (gitignored): `e2e/screenshots/`, `e2e/etc/`, `e2e/test-results/`, `e2e/report/` — NEVER leave debug files in project root

## Coverage
- No coverage target configured.

## Agentic Testing Adapter
- Surface: **web**
- Driver: **playwright-mcp** (or the existing agent-browser `.ab.test.ts` harness)
- Emitter house-style: **e2e-testing** (Playwright, `*.noauth.spec.ts` in `e2e/`)
- Concurrency: **serial-shared-browser** (CI workers=1; Vitest e2e maxConcurrency=1)
- Generated spec dir: **`e2e/`**

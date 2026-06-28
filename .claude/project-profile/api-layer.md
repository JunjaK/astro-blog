# API Layer

⏭️ **Skipped — not applicable.**

This is a **static Astro blog (SSG)** with no backend API integration. There is no HTTP client (axios/fetch wrapper), no generated client, no auth layer, and no runtime request/response handling.

Data sources instead:
- **Content collections** — Markdown/MDX under `src/content/{blog,project,playground,etc}`, validated by zod schemas in `src/content.config.ts` via Astro's `glob()` loader.
- **Search** — `astro-pagefind` builds a static search index at build time (no API).
- **Comments** — Giscus (`@giscus/react`), GitHub-backed, client-side widget (external service, no app API).
- **Site config** — `src/utils/config.ts` + `src/config.yml`.

If a backend/API is ever added, re-run `/team-init --update` to populate this file (client, generated-vs-manual, auth, error handling) per the contract-sync gate.

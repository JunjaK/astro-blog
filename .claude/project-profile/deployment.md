# Deployment

## CI/CD
- Platform: **GitHub Actions** (`.github/workflows/main.yml`, name "Astro Blog")
- Trigger: `push` to `master`
- Two jobs:
  1. **build** (`ubuntu-latest`): checkout → setup mise (`jdx/mise-action`) → cache bun deps (key `gh-bun-${hashFiles('bun.lock')}`) → `bun install --frozen-lockfile` (only on cache miss) → `bun run build` → upload `dist` artifact (1-day retention)
  2. **deploy** (`self-hosted`, needs build): sparse-checkout `Dockerfile`+`nginx.conf` → download `dist` → `docker build -t astro-blog .` (BuildKit) → stop/rm old container → `docker run -d -v /home/jun/blog-files:/home/files -p 4321:80 astro-blog` → delete artifact

## Hosting
- Self-hosted GitHub Actions runner on **Raspberry Pi 4** (performance matters — keep build lean)
- Container: Ubuntu/Nginx image serving static `dist/` on port 4321 (host) → 80 (container)
- Image files bind-mount: host `/home/jun/blog-files` → container `/home/files` → nginx `/files/`
- SSH access to RPi: `ssh raspi` (key-based via `~/.ssh/config`)

## Environments
| Env | Branch | URL/Config |
|-----|--------|------------|
| Production | `master` | https://www.jun-devlog.win |
| Local dev | any | `bun dev` → http://localhost:4321 (`--mode dev`) |

## Environment Variables
- Build modes via Astro `--mode`: `dev` (`bun dev`, `bun run build-dev`) / `prd` (`bun run build`)
- Access pattern: `import.meta.env.*` (Astro/Vite); bare `process.env` allowed (eslint `node/prefer-global/process` off)
- Site metadata/config: `src/config.yml` (+ `src/utils/config.ts` loader)

## Build Output
- Command: `bun run build` (`astro build --mode prd`)
- Output dir: `dist/`
- Type: **SSG** (static site; `passthroughImageService()` — no build-time image optimization)

## Image Asset Publishing (separate from CI)
- **Current path**: editor attach → immediate upload to `/files/media/<hash>.webp` (+ variants).
  No rsync, no commit. Cleanup via `/prune-media`.
- **Hand-authored MDX** (playground / project pages written as files, not in the editor):
  `blog/image-assets/<collection>/` → convertToWebp → generateVariants --match <slug> →
  rsync scoped to the new files. Commit `src/data/imageManifest.json`; the images are gitignored.
- Commands (`/publish-images`, `/preprocess-md`, `/generate-thumbs`, `/convert-heic`,
  `/process-diary-mdx`) are deprecated — they assume the pre-editor bulk workflow.
- `/publish-images --full` needs `--exclude=media/` or it deletes every editor upload.

# Editor = React SPA (Vite build) + Hono server (Bun), one container.
# Mirrors the blog's proven docker-on-self-hosted-runner deploy pattern.
FROM oven/bun:1

ENV TZ="Asia/Seoul"
WORKDIR /app

# Install deps (cached on lockfile)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build SPA
COPY . .
RUN bun run build

EXPOSE 4322
CMD ["bun", "run", "server/index.ts"]

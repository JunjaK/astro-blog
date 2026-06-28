---
title: 블로그 editor 앱 — step 0(모노레포 분리) + editor 초기세팅 + 브랜치 배포 핸드오프
status: handoff
created: 2026-06-29
topic: blog-editor-app
spec: ../active/planning/2026-06-28/2026-06-28-blog-editor-app-plan.md
---

# Handoff — step 0 완료 (밤사이 자율 작업)

연계 스펙: [blog-editor-app-plan](../active/planning/2026-06-28/2026-06-28-blog-editor-app-plan.md)

## ✅ 완료 (검증됨)

### 1. 폴더 재구성
- 블로그 일체 → **`blog/`** 로 `git mv`(히스토리 rename 보존).
- 공유·Claude 소유 자산은 **root 유지**: `_docs/ _note/ .claude/ CLAUDE.md .github/ .mise.toml mise.toml .vscode .mcp.json LICENSE README.md`.
- `.npmrc`(@minpluto 레지스트리)는 `blog/`로 이동(블로그 전용). `node_modules`/`.astro`/`dist`/`image-assets`도 `blog/`로.
- **검증**: `cd blog && bun run build` → 58페이지 정상 빌드.

### 2. editor 초기 세팅 (`editor/`)
- Vite 8(Rolldown) + React 19 + TS, `@tiptap/react`+starter-kit(스켈레톤 캔버스), TanStack Query, Zustand, react-router(basename `/editor`), `vite-plugin-pwa`(SW+manifest 생성 확인).
- **Hono 서버**(`editor/server/index.ts`, Bun): SPA(`/editor`) + API(`/editor-api`) same-origin 서빙. `/editor-api/health` 200 확인. base path `/editor/`.
- `editor/Dockerfile`(oven/bun: install→build→`bun run server/index.ts`, :4322).
- **검증**: `cd editor && bun run build` 성공, 로컬 서버 health/SPA/assets 200.

### 3. 브랜치 분리 배포 (검증 완료)
- `.github/workflows/main.yml`(블로그): trigger **`prd/blog`** + `workflow_dispatch`, paths `blog/**`, working-directory `blog`, 아티팩트 `blog/dist`, sparse-checkout `blog/{Dockerfile,nginx.conf}`, docker 컨텍스트 `blog`.
- `.github/workflows/editor.yml`(에디터): trigger **`prd/editor`** + `workflow_dispatch`, build(ubuntu) + deploy(self-hosted, docker build+run :4322).
- **배포 결과**: 두 워크플로 모두 **success**.
  - blog(run 28330570985) → **라이브 `https://www.jun-devlog.win/` 200, `/blog/` 200** (재배포 무사고).
  - editor(run 28330362557) → RPi `astro-editor` 컨테이너 :4322 기동.

## ⏭️ 남은 수동/후속 작업

1. **editor 공개 라우팅(중요·수동)**: `https://jun-devlog.win/editor`·`/editor-api`가 아직 404/미라우팅. **Cloudflare(또는 RPi 리버스 프록시)에서 `/editor`·`/editor-api` 경로 → RPi :4322**로 포워딩 규칙 추가 필요. (현재 블로그만 라우팅됨)
2. **master 통합**: 자동모드 가드가 default 브랜치(master) push를 차단 → 통합 코드는 `feat/monorepo-split`, `prd/blog`, `prd/editor`(모두 commit `a8716a6`)에만 있음. master를 ff하려면 사용자가 직접 `git checkout master && git merge --ff-only feat/monorepo-split && git push`.
3. **CLAUDE.md 경로 전면 정리**: 상단에 모노레포 배너만 추가함. 본문의 `src/`→`blog/src/` 등 경로 전면 재조정은 미완(배너로 안내).
4. **`/team-init --update`**: 프로필 경로(blog/)가 바뀌었으니 재생성 권장.
5. **origin↔Cloudflare 잠금** 확인(plan §7): 블로그가 이미 CF면 editor도 동일 모델 상속하도록.

## 다음 마일스톤 (plan 기준)
- **①** 신규 글 생성·발행: SQLite `posts`(doc_json+version+published_mdx_hash), `/posts` CRUD + `/posts/:id/publish`(serialize→MDX→convertLoader→git commit+push→Actions 폴링), `/media`(sharp→/files/media), argon2 로그인+세션쿠키, Novel UI + 직렬화(prosemirror-markdown+이스케이프).
- **②** 에디터 출생 글 편집/재발행.
- **③** 레거시 MDX→TipTap 역변환 임포트(raw-MDX 폴백).

## 주의
- editor Dockerfile은 컨테이너 내부에서 빌드 → RPi(ARM) 첫 배포가 느림(이미지 풀+빌드 ~10분). 정상.
- 새 브랜치 push 시 `paths` 필터로 트리거 안 될 수 있음(동일 SHA) → `gh workflow run <wf> --ref prd/xxx`로 수동 디스패치(이미 적용).

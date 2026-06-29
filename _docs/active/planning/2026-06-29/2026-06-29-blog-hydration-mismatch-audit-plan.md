---
title: 블로그 SSR↔CSR 하이드레이션 불일치(#418) 감사 + 수정
status: planning
created: 2026-06-29
updated: 2026-06-29
topic: blog-hydration-mismatch-audit
orchestration: STANDARD
team: Leader + Architect A (FE)  # BE N/A (static SSG), Infra/UIUX optional-low
mode: team-brainstorm (planning only)
---

# 블로그 SSR↔CSR 하이드레이션 불일치(#418) 감사 + 수정 — 플랜

[View Plan Diagram](./2026-06-29-blog-hydration-mismatch-audit-plan.visual.html)

## 배경 / 트리거
운영 라이브 페이지 `https://www.jun-devlog.win/blog/diary/25-01-tokyo/02_01-21` 콘솔에 **React #418**(하이드레이션 불일치, `args[]=HTML`). tegaki(astro 어댑터)는 정상 — #418은 별개의 잠재 island 버그. 캐시 이슈(별건, `nginx.conf` no-cache로 이미 처리)와 무관.

## 사용자 결정 (확정)
1. **범위 = 모든 블로그 글 라우트** (web/game/diary). playground 제외, editor 제외(CSR-only Vite SPA → 하이드레이션 불일치 비해당).
2. **공격성 = 런타임으로 증명된 불일치 수정 + render-path 비결정 패턴 선제 하드닝**, effect-deferred 안전건(`light-rays.tsx` 등)은 제외.
3. **가드 = CI 게이트**: Playwright 라우트 sweep 스펙이 하이드레이션 콘솔 에러 시 빌드 실패. (ESLint 룰 없음.)
4. **시퀀싱 = 라이브 #418 핫픽스 먼저**(루트커즈+배포) → 그 후 전체 sweep/감사/하드닝 배치.
5. 탐지 = 런타임 sweep(권위) + 정적 grep(위치 특정). `suppressHydrationWarning`은 명백히 무해한 경우만(Footer 연도).
6. **`BlogFrontmatter.fromNow()` = 아예 제거, 항상 `YYYY-MM-DD`** (음수 diff, 깜빡임 없음 — 가장 게으른 정답).

## 핵심 발견 (FE 아키텍트 — 리서치 결과로 Leader 랭킹 재구성)
`mdLayout.astro`가 마운트하는 모든 React island를 정적 분석한 결과, **그 옛 도쿄 글의 #418은 정적으로 유죄 판정 불가** — 명백한 레이아웃 island 대부분 무죄:

| Island | 그 글에서 무죄인 이유 |
|--------|----------------------|
| `Footer.tsx:7` `getFullYear()` | SSR(빌드)↔클라 동일 연도(연말 경계 제외). 무해. |
| `GiscusComp` `$theme` | `atom('dark')` 정적 기본값(localStorage 영속 아님). SSR/첫 클라 모두 `dark`. localStorage는 effect. |
| `BlogFrontmatter:22` `fromNow()` | 도쿄=2025-01 생성 → `diff>31` → **결정적 `YYYY-MM-DD` 분기** 탐. (fromNow 비결정은 31일 이내 글에서만 발화) |
| `ScrollProgress/Navigation/PolaroidLightbox/BlogNav` | 결정적 마크업, window 읽기는 effect/handler. 안전. |
| `ThemeInit.astro` | 인라인 스크립트로 `<html>.dark` 클래스만 변경 — React island SSR 마크업 아님. |

→ **그래서 런타임 캡처가 ground truth.** 남은 유력 용의자: (a) MDX 렌더 `<slot/>`의 **구조적 `<div>`-in-`<p>` 재배치**, (b) 정적으로 안 보이는 텍스트/공백/로케일 불일치. **Phase 0에서 dev 빌드 component stack을 캡처해 결정** — 미리 픽스 확정 금지.

별개로 `BlogFrontmatter.fromNow()`는 31일 이내 글에서 **진짜 잠재 #418** → 결정 6에 따라 제거.

---

## Phase 0 — 라이브 #418 핫픽스 (순차, 전체를 게이트)

### 캡처 방법 (오케스트레이터의 라이브 Playwright MCP 사용)
1. **dev 빌드로 비압축 에러 확보**: `bun dev`(`astro dev --mode dev`) → React dev 번들이 전체 메시지 + **component stack**(읽을 수 있는 컴포넌트명) 출력. `bun run preview`는 prod/압축 → 진단 불가. `playwright.config.ts`의 `webServer`가 이미 `bun dev`라 하니스가 자동 상속.
2. `http://localhost:4321/blog/diary/25-01-tokyo/02_01-21` 이동.
3. 콘솔 전체(error+warning) + React 오버레이 텍스트 캡처. dev 번들은 `Warning: Text content did not match. Server:"X" Client:"Y"` + `at BlogFrontmatter`/`at Footer` 같은 **스택**으로 범인 island를 직접 지목.
4. 전체 스크롤(`client:visible` island가 뷰 진입 시 하이드레이트) + ~2s settle.
5. 정확한 `Server:`/`Client:` 텍스트 쌍 + 스택 최상단 컴포넌트 기록.

### 용의자 랭킹 + 픽스 형태
| 순위 | 용의자 | 유죄 시 픽스 |
|------|--------|--------------|
| 1 | **MDX `<div>`-in-`<p>`** (스크랩북 콘텐츠; MEMORY: 들여쓰기/문단 내 블록 → 브라우저 재배치) | 해당 JSX/HTML 블록을 **column 0** + 전후 빈 줄(문서화된 규칙)로 이동, 또는 명시 블록 컨테이너. React 변경 없음. |
| 2 | dev 스택이 지목한 island의 텍스트/공백/로케일 불일치 | §4의 카테고리별 픽스를 지목된 컴포넌트에만 적용. |
| 3 | Footer 연도(빌드/조회 연말 경계) | 연도 span에 `suppressHydrationWarning`. |

**dev 빌드 스택이 컴포넌트를 지목하기 전엔 핫픽스 작성 금지.** 캡처된 불일치를 해소하는 최소 diff → 동일 캡처 재실행으로 #418 0건 확인 → sweep 진행.

---

## Phase 1 (탐지 하니스) — `blog/e2e/hydration-sweep.noauth.spec.ts`

### 라우트 열거 (의존성 0)
sitemap 의존 금지(dev에서 미생성 가능). 콘텐츠 컬렉션에서 글롭:
- `blog/src/content/blog/**/*.{md,mdx}` → `blog/src/content/blog/` 프리픽스+확장자 제거 → `/blog/` 접두 → 라우트 id (Astro `[...slug]` = `entry.id` 매핑).
- 필터: `web/ game/ diary/` 유지. `playground/`·editor 제외.

### 라우트별 어서션
```ts
for (route × {chromium, mobile-chrome}):
  const errors = []
  page.on('console', m => { if (m.type()==='error') errors.push(m.text()) })
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(route, { waitUntil: 'load' })
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(2000)            // 하이드레이션 settle (MEMORY)
  const hyd = errors.filter(t => /#(418|421|422|423|425)|Hydration failed|did not match|hydrat/i.test(t))
  expect(hyd, `${route}: ${hyd.join('\n')}`).toEqual([])
```
- 두 프로젝트(chromium+mobile-chrome) 자동 적용(config 변경 없음).
- 비압축 에러는 `webServer: bun dev` 상속.
- `for(route) test(route, ...)`로 라우트별 독립 테스트.
- 아티팩트 `outputDir: ./e2e/test-results`(gitignored) 상속.

---

## 정적 triage (grep 분류)
규칙: **render-path = 위험**(렌더 중 읽혀 JSX/마크업 도달) · **effect/handler/ref-init/canvas = 안전**.

### in-scope (블로그 글 render path)
| File:line | Hit | 분류 | 조치 |
|-----------|-----|------|------|
| `Blog/BlogFrontmatter.tsx:16-22` | `dayjs().fromNow()` → `<p>{created}</p>` | **위험(증명)** — 31일 이내 글 불일치 | **fromNow 제거, 항상 YYYY-MM-DD** (결정 6) |
| `layouts/Footer.tsx:7` | `new Date().getFullYear()` | 위험(무해) | `suppressHydrationWarning` |
| `home/Flickering.tsx:5` | `useState(()=>typeof window?...:1200)` | **false positive 유력** — width는 effect/`canvasSize`(둘 다 `{0,0}` 시작)로만, SSR 마크업 미도달. 홈(블로그 글 아님). | sweep이 유죄 판정 시에만 |
| `ui/flickering-grid.tsx:34/51/61/72` | typeof window/Math.random | 안전(effect/canvas) | 없음 |
| `Blog/GiscusComp.tsx`, `PolaroidLightbox.tsx:23`, `ImageLoader.tsx`, `ModeToggle.tsx`, `icon-cloud.tsx:47`, `animated-theme-toggler`, `ripple-button:41`, `light-rays.tsx` | localStorage/window/Date/random | 안전(effect/handler/ref) | 없음 |

**in-scope 실질 하드닝 = 정확히 2파일**(`BlogFrontmatter`, `Footer`) + Phase 0가 잡는 것.

### out-of-scope (playground — 제외, 향후 패스 메모)
`Playground/DiarySection3D/*`(module-level `isMobile` 등), `D3Test`, `Uplot` — 실제 위험이나 제외 라우트. 지금 건드리지 않음.

---

## 수정 패턴
**A. (사용 안 함) two-pass mounted-flag** — fromNow는 결정 6에 따라 두 번째 페인트 교체 대신 **분기 자체 삭제**:
```tsx
// 기존 fromNow 분기 제거 → 항상 절대날짜
const created = dayjs(frontmatter.created).format('YYYY-MM-DD');
```
SSR/클라 동일, 깜빡임 없음, diff 음수.

**B. 구조적 `<div>`-in-`<p>` (MDX)**: 모든 JSX/HTML 블록 태그를 **column 0** + 전후 빈 줄(MEMORY 규칙). 콘텐츠 파일 수정, 컴포넌트 무변경.

**C. 무해 → `suppressHydrationWarning` (Footer)**:
```tsx
<span suppressHydrationWarning>{currentYaer}</span>
```
연도처럼 명백히 무해한 경우만. 진짜 불일치 은폐 금지.

---

## CI 게이트 (`.github/workflows`)
배포는 브랜치 기반(`prd/blog`, self-hosted RPi). sweep을 **build job 게이트**로(실패 → Docker 이미지 X → 배포 X):
- 트리거: `prd/blog` push + 해당 PR.
- 스텝(mise→bun): `bun install` → `bunx playwright install --with-deps chromium` → `bunx playwright test hydration-sweep`(webServer가 `bun dev` 자동 기동→비압축). 기존 이미지빌드/배포 스텝을 이 job 성공 뒤로.
- RPi 성능: `workers:1` 이미 설정. 풀 매트릭스가 느리면 CI는 chromium-only 패스트패스(기본은 둘 다, 벽시간 문제 시에만).
- 실패 시 `e2e/report` 아티팩트 업로드.

---

## 파일/디자이너 배정 추정 (향후 /team-run)
**~2 디자이너, 순차(Phase 0가 게이트):**
- **Designer 1 (Phase 0, 최우선 순차)**: 라이브 도쿄 #418 루트커즈+핫픽스. 파일: 런타임 캡처로 결정 — 도쿄 MDX 콘텐츠(구조적) 및/또는 지목된 island 1개. 전체 블록.
- **Designer 2 (Phase 0 후, 내부 병렬)**:
  - `blog/e2e/hydration-sweep.noauth.spec.ts`(신규) + 라우트-열거 글롭 헬퍼
  - `.github/workflows/*` 게이트 배선
  - 하드닝: `BlogFrontmatter.tsx`(fromNow 제거), `Footer.tsx`(suppressHydrationWarning)
- 독립성: 하니스+하드닝 디스조인트(충돌 없음). 전체 ~4파일+1워크플로우. Phase 0 픽스가 크면 2명 분할.
- 검증: `bunx astro check`, `bunx eslint .`, `bunx playwright test`(chromium+mobile-chrome).

---

## 리스크 / 열린 질문
1. **라이브 범인 정적 미확인** (최대 리스크). 완화: Phase 0 dev 빌드 component-stack 캡처 필수·결정적. dev=0건인데 prod=#418이면 압축 전용/`ClientRouter`(astro:transitions) swap 타이밍 의심 → `bun run preview`에서도 캡처.
2. **ClientRouter / view transitions** (`transition:persist` Navigation/Footer): 영속 island 데싱크 가능. sweep은 라우트별 fresh `goto`라 transition 유발 불일치 **누락 가능** → v1 아닌 후속 권장.
3. **Flickering 랭킹 충돌**: FE는 false positive로 평가, Leader는 HIGH. 런타임 sweep으로 판정 — 유죄 시에만 수정.
4. **dev↔prod 발산**: sweep은 `bun dev`. `--mode prd` 빌드에서만 나는 불일치는 게이트 통과 가능(알려진 한계).
5. **RPi 라우트 수 스케일**: 풀 매트릭스 느리면 chromium-only fallback.

## 팀 구성
- **Architect A (FE)**: YES — island/SSR 픽스 + MDX 구조 분석.
- **Architect B (BE)**: NO — static SSG, 백엔드/DB 없음.
- **Architect C (Infra/Sec)**: optional-low — CI 게이트 몇 줄, 보안 아키텍트 불필요.
- **UI/UX Master**: optional-low — fromNow 제거로 시각 변화 없음(깜빡임도 제거됨).
- **Designers ~2, Testers 1. Orchestration: STANDARD.**

## 다음 단계
`/team-run "블로그 하이드레이션 #418 감사+수정 (이 플랜 기준)"` 으로 실행.

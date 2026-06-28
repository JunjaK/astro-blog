---
title: 블로그 글쓰기 전용 웹앱 (Notion-style Editor + RPi 발행 백엔드)
status: planning
created: 2026-06-28
updated: 2026-06-29
topic: blog-editor-app
mode: brainstorm (team-brainstorm)
orchestration: STANDARD
team: Leader + Architect-FE + Architect-BE + Architect-Infra + UI/UX Master
---

# 블로그 글쓰기 전용 웹앱 — Team Brainstorm Plan

> [View Plan Diagram](./2026-06-28-blog-editor-app-plan.visual.html)

## 1. 목표 (한 줄)

오너 전용 **Notion 스타일 에디터**로 블로그 글을 작성. **DB(RPi)가 콘텐츠 편집 SoT**(TipTap JSON 보유), **git/MDX는 그 발행 투영**. 글 1개=DB row 1개이고 **`DB ≠ MDX`이면 draft(미발행 변경)**. "발행"하면 DB를 MDX로 export → 이미지는 `/files/`, MDX는 git → **기존 CI/CD가 비동기 재빌드·배포**, 완료 시 에디터에 표시 → 둘이 다시 같아짐. 블로그는 **SSG 유지**.

## 2. 확정된 사용자 결정 (재논의 안 함)

1. **에디터**: **React 확정** — **Vite+(viteplus.dev) 툴체인** + React 19 + **@tiptap/react**(Novel/novel.sh UI 부트스트랩) + TanStack Query + Zustand + **shadcn/ui 정본**(+ Magic UI 절제) + `vite-plugin-pwa`. **Vite+는 alpha이나 1인 전용이라 감수** — 단 **`editor/`에만, 블로그 파이프라인 제외, 버전 핀, 막히면 plain Vite 폴백**(Vite 래퍼). nyxbui 대신 shadcn 정본(유지 안정성), 토큰은 블로그와 호환.
2. **발행**: RPi에 작은 발행 백엔드(Hono on Bun) 추가 — **React SPA도 직접 서빙**(same-origin).
3. **이미지**: RPi `/home/jun/blog-files/` → nginx `/files/` (`/files/media/<hash>` 평면, git 비커밋).
4. **다기기/PWA**: 노트북·PC·폰(설치형 **PWA**, 모바일 대응) 모두 접근, **동시 접속** 지원(낙관적 버전 가드, D9). 인증=httpOnly 쿠키 세션.
5. **레거시 편집**: 기존 글도 앱에서 수정 → **MDX→TipTap 역변환 임포트 포함**(raw-MDX-블록 폴백, 별도 마일스톤).
6. **배치**: 단일 repo 대칭 **`blog/` + `editor/`**(워크스페이스 아님, 각자 독립). blog→`blog/` 이동은 **검증된 step 0**(CI/Docker 마이그레이션) 후 editor 착수.

## 3. Leader 조정 — 아키텍트 충돌 해소 (의사결정 로그)

| ID | 충돌 | 최종 결정 | 근거 |
|----|------|-----------|------|
| **D1** | 노출 모델 (다기기·모바일 PWA·셀룰러) | **공개 + 앱 로그인, Cloudflare 프록시 뒤**(도메인 이미 CF). 라우팅 `jun-devlog.win/editor`(SPA)·`/editor-api`(Hono) **same-origin**. **CF가 TLS·DDoS·엣지 rate-limit·WAF 커버** → 앱단 하드닝은 **경량**: ①로그인(argon2id+세션쿠키) ②입력 하드닝(C2, CF 무관·필수) ③**origin을 CF로 잠금**(CF Tunnel 또는 방화벽 CF-IP allowlist, 우회 차단) | 사용자 선택(CF가 perimeter 대부분 처리 → 과한 앱 하드닝 불필요). 개인 도구·제한된 blast radius. TOTP·잠금·DoS 정교화는 드롭/옵션(원하면 CF Access 한 줄, 이미 CF라 무료) |
| **D2** | 이미지 경로 변환을 FE가? BE 재구현? | **기존 `convertLoader.js`를 백엔드가 실행** (절대 `/files/` 경로도 `<ImageLoader>`로 감싸도록 소폭 확장) | 이미 단위테스트된 로직. 재구현은 drift 위험. FE는 `![alt](/files/media/<hash>.webp)` 마크다운만 방출 → 컴포넌트 결합 회피 |
| **D3** | 이미지 저장: staging→최종 이동 vs 단일경로 | **한 번 업로드 → 절대 안 옮김.** 삽입 시 `/files/` 평면 저장소(`/files/media/<hash>.webp`)에 올리고 draft·published가 같은 URL 사용 | 사용자 요청(초안/발행 일관 처리). staging→최종 **이동 단계 삭제 → "이미지 이동 성공·commit 실패" 부분실패 모드 소멸**. 카테고리/슬러그 변경에 경로 비의존. 서버 초안과 일관(기기 전환 시 이미지도 서버에). 트레이드오프: 기존 per-디렉터리 co-location 관례 포기(기존 글은 유지) |
| **D4** | 발행글·레거시 글 편집 | **둘 다 v1 목표**. 에디터 출생 글=DB의 TipTap JSON 로드(역파서 불필요). **레거시 손글 글=MDX→TipTap 역변환 임포트**(사용자: 기존 글도 수정 원함) — **핵심 설계: "raw-MDX 블록" 폴백**(아는 노드만 변환, 모르는 것=원문 보존·재발행 시 무변경). **별도 마일스톤**으로 분리(핵심 생성/편집 흐름 후) | D8 모델로 편집 성립. 레거시 임포트는 ImageLoader·mermaid·KaTeX·DiaryCarousel·임의 JSX 때문에 완전 충실 불가 → raw-블록 폴백으로 "무손실 by 폴백" 달성. v1 최대 리스크 |
| **D5** | 인증 (공개 서비스 로그인, 경량) | **DB 계정**(SQLite `users`, 비번 **argon2id** = `Bun.password` 기본, 의존성 0) → 로그인 시 **서버측 세션 토큰**(랜덤, DB `sessions`+만료) → **httpOnly+Secure+SameSite=Strict 쿠키**. **JWT-in-localStorage 금지.** Hono가 `/editor`·`/editor-api` same-origin(CORS 없음)+기본거부 미들웨어. rate-limit은 **CF 엣지**에 위임. (선택) CF Access 또는 TOTP. 비밀키(deploy key 등)는 Hono에만 | 사용자: 일반 서비스 로그인 + "과하게 하지마". CF가 brute-force/DoS 엣지 처리 → 앱은 로그인+세션+CSRF(SameSite)만. 다기기=쿠키 per device(다중 세션 OK) |
| **D6** | 재빌드 완료 감지 불가? | **발행=비동기**. 백엔드가 GitHub Actions API를 `head_sha`로 폴링, 에디터는 `GET /posts/:jobId` 폴링 → 완료 시 별도 표시 | 사용자 요청(비동기 + 완료 표시). UI/UX #3 해소. 가짜 진행바 금지, 정직한 비결정 상태 표시 |
| **D7** | 저장 위치 & 클라 캐시 | **RPi DB(SQLite, bun:sqlite)** 단일 저장소. **IndexedDB·로컬 캐시 안 씀** — 에디터가 DB에 직접 자동저장, 저장 실패 시 에러 표시 + 재시도(버퍼 없음) | 사용자 결정(IndexedDB 미사용, RPi에 DB). N100은 LAN 전용→CI 접근 불가라 발행글 부적합. 단일사용자엔 Postgres보다 SQLite가 YAGNI 정답. 편집 중엔 항상 온라인 전제라 직접 쓰기로 충분(오프라인 비요구) |
| **D8** | DB와 git/MDX의 관계 (사용자 모델) | **DB = 콘텐츠 편집 SoT(TipTap JSON 보유), git/MDX = 발행 투영.** 글 1개 = DB row 1개. **상태는 파생**: MDX 없음→새 초안 / `serialize(DB)≠현재 MDX`→수정됨(draft) / 같음→동기화됨. **발행 = DB를 MDX로 export+commit+재빌드** → 둘이 같아짐. 외부에서 git MDX 직접 수정 시 `published_mdx_hash` 비교로 "외부 수정됨" 감지·덮어쓰기 전 경고 | 사용자 모델("MDX와 DB가 다르면 draft, draft면 발행해서 업데이트"). draft·발행글편집을 **하나의 개념(미발행 diff)으로 통합**. 역파서 회피(편집은 DB JSON 로드). published_mdx_hash 캐시로 효율적 상태 파생 |
| **D9** | 동시 접속 충돌 | **낙관적 버전 가드**: post row에 `version`, `PUT`에 클라 로드 버전 포함 → 변했으면 **409 "다른 기기에서 수정됨"** + 새로고침/머지 안내. 실시간 공동편집(Yjs)은 Later | 사용자: 다기기 동시 접속. 같은 글 동시 편집 시 last-write-wins 사고 방지. 1인 다기기엔 CRDT 과함 — 버전 가드로 충분. 다른 글·다중 세션은 무충돌 |
| **D10** | repo 배치 | **단일 repo, 대칭 `blog/` + `editor/`**(워크스페이스 아님, 각자 독립 프로젝트). 블로그를 `blog/`로 `git mv` → **step 0 마이그레이션**: `main.yml`(working-directory·아티팩트·캐시키·sparse-checkout·Docker 컨텍스트), `.mise.toml`·`.npmrc`·project-profile 경로 재작성 + **배포 end-to-end 재검증**. path-filter로 폴더별 트리거 분리. publish-api는 `../blog/src/utils/convertLoader.js` 재사용 | 사용자 선택(scope 시각적 분리로 장기 유지보수 명료). 대가=작동 중 배포 파이프라인 마이그레이션 → **editor 작업 전 검증된 step 0로 선행**(main.yml 깨지면 블로그 배포 중단) |

## 4. 아키텍처 개요

```
노트북 · PC · 폰(PWA) ─ HTTPS 공개 ─┐                        ┌──────── GitHub ────────┐
  React SPA(@tiptap/react, shadcn)   │ editor.jun-devlog.win   │  master push           │
   · DB에 직접 자동저장(낙관적 버전) │ (리버스 프록시+쿠키)    │  → GitHub Actions       │
   · 이미지 삽입 즉시 → /files/media  │                        │   job1(ubuntu): build  │
   · canvas = 발행 미리보기           │                        └───────────┬─────────────┘
        │ (SPA는 Hono가 서빙)         ▼                                    │ self-hosted
        ▼                      ┌──── RPi 4 ────────────────────────┐        ▼
┌─ RPi: editor/ = React 빌드 + Hono on Bun (systemd) ─┐  git push  │ job2: docker build+run │
│  로그인(argon2id)→세션쿠키 · rate-limit · TOTP?     │ ─────────▶ │  -v blog-files:/files   │
│  POST /media  → sharp → /files/media (이동 없음)    │            │  nginx :4321 (공개블로그)│
│  GET·PUT /posts/:id → 작업본(TipTap JSON), 버전가드 │            └─────────────────────────┘
│  POST /posts/:id/publish → MDX export+convertLoader │
│                → git commit+push (deploy key)       │
│  GET /publish/:jobId → Actions API 폴링 (비동기)     │
│  SQLite(blog.db): posts(doc_json+published_hash)·job│
└─────────────────────────────────────────────────────┘
```

핵심 불변식: **DB(RPi SQLite)=콘텐츠 편집 SoT(TipTap JSON) · git/MDX=발행 투영(SSG 빌드 소스) · `DB≠MDX`=draft · 이미지=`/files/media`(한 번 업로드·이동 없음·런타임 bind-mount)**. 신규/수정 글은 재빌드 필요(MDX→HTML), 이미지는 재빌드 없이 즉시 서빙. 발행은 **비동기** — 커밋 즉시 "반영 중" 표시 후 Actions 완료 시 라이브 통지. editor(React SPA)는 **Hono가 same-origin 서빙** → 쿠키 인증, CORS 없음. **노출=공개 HTTPS**(기존 블로그 인그레스 재사용, editor 서브도메인) + 앱 로그인 + 하드닝(D1/D5).

## 5. Frontend Plan (요약)

**스택(React 확정)**: **Vite + React 19 + TS** SPA(`ssr off`), **`vite-plugin-pwa`**(설치형 PWA, 모바일). 에디터 **@tiptap/react**(Novel UI 부트스트랩, 스키마 직접 소유). **TanStack Query**(서버 상태=posts/media/publish) + **Zustand**(에디터 로컬 UI). 라우팅 TanStack Router(또는 React Router). UI **shadcn/ui 정본 + Radix**(블로그와 토큰 공유) + **Magic UI 절제**(포인트만). **Hono가 빌드 산출물 서빙**(same-origin, 쿠키 인증). 툴체인 **Vite+(alpha, editor 한정·블로그 제외·plain Vite 폴백)**. (React 우위는 좁고 특정적 — 블로그 React/shadcn 컴포넌트·토큰 재사용 + 미리보기 충실도 + 하우스 react-patterns. 에디터 본체 TipTap은 양쪽 동일.)

**v1 블록**(전부 블로그 렌더러와 1:1 매핑): H1~H3, 굵게/기울임/인라인코드, 목록, 인용, 링크, 구분선, 코드블록(언어), **mermaid(=코드블록)**, **수식 KaTeX**, 이미지(삽입→WebP), 기본 동영상, **raw-MDX 블록**(레거시 폴백·미지원 JSX 보존). **컷**: callout(블로그 컴포넌트 미확인), 테이블/토글, DiaryCarousel 갤러리 작성, HEIC 브라우저 디코드.

**직렬화(최난제)**: `prosemirror-markdown`의 `MarkdownSerializer` + 커스텀 노드 직렬화. **MDX 이스케이프 필수** — 본문 산문의 bare `<`, `{`, `}`는 CommonMark엔 합법이나 MDX/Astro 빌드를 깨뜨림 → 코드 외 텍스트에서 `&lt;`/`&#123;`/`&#125;`로 이스케이프. 드래프트는 **TipTap JSON**(무손실)을 SoT로 저장, MDX는 발행 시 단방향 산출물.

**저장(서버 단일 저장소, D7·D8)**: 콘텐츠 SoT는 **RPi SQLite**. 에디터는 자동저장(디바운스 ~0.8–1.2s + 10s 안전 + `visibilitychange` flush)으로 `PUT /posts/:id`(작업본). `docJSON`(TipTap JSON, 무손실), `frontmatter`, 참조 이미지 URL 목록 보관. **IndexedDB·로컬 캐시 안 씀** — DB에 직접 쓰고, 저장 실패 시 에러 표시 + 재시도(편집 중 내용은 에디터 자체 상태에 유지되니 다음 변경/재시도에 재전송). 트레이드오프: 오프라인 작성 비요구(tailnet/LAN 전제). **편집=발행글 포함**: 에디터 출생 글은 DB의 `docJSON`을 로드해 수정(MDX 역파싱 불필요).

**이미지 수명(D3 — 이동 없음)**: 붙여넣기/드롭 → 클라 canvas로 WebP 변환·다운스케일(~1600px) → **삽입 즉시 `POST /media`** → 백엔드 sharp 재인코딩+썸네일 → `/files/media/<hash>.webp` 안정 URL 반환 → 이미지 노드가 그 **절대 URL 보유**. 초안·발행 MDX가 **같은 URL** 사용, swap/move 없음. 직렬화 시 `![alt](/files/media/<hash>.webp)` 방출(백엔드 convertLoader가 `<ImageLoader>`로 래핑). 동영상도 동일(삽입 즉시 업로드).

**경로/상태**: 라우트 `/login`, `/`→`/posts`(글 목록=상태 대시보드), `/editor/:id`. 서버 상태=**TanStack Query**(posts/media/publish, mutation·낙관적·**409 충돌 처리**). 로컬 UI=**Zustand**(슬래시 열림·선택 등 최소). 인증 가드는 라우터 loader/guard에서 `GET /auth/me` 프로브.

**FE 리스크**: ① 한글 IME — 커스텀 키핸들러가 조합 깨뜨림(슬래시/입력규칙). `isComposing` 중 `preventDefault` 금지 + 실제 한글 E2E. ② MDX 직렬화 충실도(최상위) — 이스케이프 + 스냅샷 테스트 + 백엔드 dry-run 컴파일 게이트. ③ 삽입-즉시-업로드라 **네트워크 의존**↑ — 업로드 실패 시 재시도/보류 UI, 낙관적 미리보기는 object URL로 즉시 표시 후 URL 확정.

## 6. Backend Plan (요약)

**스택**: **Hono on Bun**, systemd 서비스(`editor-api.service`, user `jun`), tailnet/`127.0.0.1:8787` 바인드. **React SPA 빌드 산출물도 직접 서빙**(same-origin → 쿠키 인증, CORS·Nitro 불필요). 위치 `editor/`(단일 repo 서브폴더). 디스크 상태: 블로그 git 체크아웃(발행용) + `blog.db`(SQLite: posts·job). convertLoader 등은 `../src/utils/`를 상대경로 재사용.

**발행 메커니즘 = Option A(git commit+push)**: 백엔드가 MDX를 작성·커밋·푸시 → 기존 Actions가 재빌드·배포. CI 재사용, 단일 소스. **전처리기는 CI가 아닌 백엔드에서 실행**(이미지가 git에 없으므로 ubuntu 빌더가 접근 불가): 썸네일은 `/media` 업로드 시 sharp가 생성, `convertLoader`(절대 `/files/` 경로도 `<ImageLoader>`로 래핑하도록 확장)는 백엔드가 작성한 MDX에 실행 → CI는 변환 끝난 MDX를 그냥 빌드.

**데이터 모델(SQLite `posts` 테이블)**: `id, category, slug, doc_json(TipTap), frontmatter, version(낙관적 잠금), published_mdx_hash(null=미발행), published_commit, source('editor'|'legacy'), created_at, updated_at`. **상태는 파생**(저장 안 함): `published_mdx_hash IS NULL`→새 초안 / `hash(serialize(doc_json,frontmatter)) ≠ published_mdx_hash`→수정됨(draft) / 같음→동기화됨. 발행 시 git의 현재 MDX 해시도 비교 → 외부 수정 감지. **`version`은 매 PUT마다 증가**, 클라 버전과 불일치 시 409(D9 다기기 충돌). 레거시 글은 `source='legacy'`로 시드(본문 미러), `/posts/import`로 역변환해 `'editor'` 승격하면 앱 편집 가능.

**API**(쿠키 세션 필요, `/health`·`/auth/*`·SPA 정적 제외) — 글 1개 = 1 row, '초안'은 별도 엔티티가 아니라 파생 상태:
| Method | Path | 용도 |
|--------|------|------|
| GET | `/` (및 정적) | React SPA 서빙 |
| POST | `/auth/login` · GET `/auth/me` | httpOnly 쿠키 세션 로그인 / 가드 프로브 |
| GET | `/health` | 라이브니스(무인증) |
| GET | `/categories` | 블로그 카테고리 목록 |
| GET | `/posts` | 전체 글 목록 + 파생 상태(동기화됨/수정됨/새 초안/외부수정) |
| POST | `/posts` | 새 글(row) 생성 — slug 중복 검사 포함 |
| GET | `/posts/:id` | 작업본 로드(`doc_json`)— 편집 진입 |
| PUT | `/posts/:id` | 작업본 자동저장 — **`version` 동봉, 불일치 시 409**(D9 충돌) |
| DELETE | `/posts/:id` | row 삭제(+옵션: 발행된 MDX 제거 커밋) |
| POST | `/posts/:id/publish` | DB→MDX export+convertLoader+commit+push, `published_mdx_hash` 갱신 → `{jobId}` |
| POST | `/posts/import` | **레거시 MDX→TipTap 역변환**(아는 노드 변환 + raw-MDX 블록 폴백) → `source='editor'` 승격. 별도 마일스톤 |
| GET | `/publish/:jobId` | 발행 잡 상태 폴링(Actions API 기반, 비동기) |
| POST | `/media` | 멀티파트, sharp→WebP+썸네일 → `/files/media/<hash>` 안정 URL 반환 (삽입 즉시) |
| POST | `/mdx/dry-run` | 파싱 전용 검증(발행 전) |

(마일스톤 순서: ① 신규 생성·발행 → ② 에디터 출생 글 편집/재발행 → ③ 레거시 `/posts/import` 역변환(raw-MDX 폴백))

**발행 트랜잭션**(`POST /posts/:id/publish`, 멱등·재시도 가능): idempotencyKey 검사 → **외부수정 가드**(현재 git MDX 해시 ≠ `published_commit` 시점이면 경고/확인) → zod 검증(content.config.ts 미러)+슬러그 정규식+카테고리 존재+본문 참조 이미지가 `/files/media`에 실재 → `serialize(doc_json)`→MDX 조립+convertLoader 래핑 → `git pull --rebase`→add→commit→push → `published_mdx_hash`/`published_commit` 갱신 → Actions API 폴링으로 `building`/`live`/`failed`. **이미지 이동 단계 없음**(이미 `/files/media`) → "이동 성공·push 실패" 부분실패 소멸. **잔여 실패모드**: push 실패 = DB row·이미지 유지(무해, 재시도); non-fast-forward = rebase 재시도(백엔드가 유일 자동 writer); 잘못된 MDX = CI 빌드 실패 → **구 사이트 유지(안전)** + `ciRunUrl` 노출. **GC**: 어떤 row도 참조 않는 `/files/media` 자산 = DB 참조 카운트 기반 cron 정리.

**git 자격증명**: repo-scoped **deploy key**(또는 fine-grained PAT `contents:write`) `600`, bot 커밋 아이덴티티, `known_hosts` 핀.

**BE 리스크**: ① RPi sharp의 HEIC 디코드(libheif) 불확실 → 부팅 시 `sharp.format.heif` 프로브, 없으면 `heic-convert` 폴백 또는 `422`. ② ARM sharp CPU/RAM 스파이크 → 동시성 1–2 큐 + 크기/개수 캡 + systemd `MemoryMax`. ③ 디스크 누수(미참조 `/files/media` 자산) → DB 참조 카운트 기반 cron GC. ④ 삽입-즉시-업로드라 버려진 초안의 이미지가 늘 수 있음 → 초안 삭제 시 참조 해제 + GC.

## 7. Infra & Security Plan (경량 — 사용자: "과하게 하지마")

**노출**: 공개 + 앱 로그인, **Cloudflare 뒤**(`jun-devlog.win/editor`·`/editor-api`, same-origin). CF가 **TLS·DDoS·rate-limit·WAF·origin 은닉**을 다 처리 → 앱단 보안은 최소만. **블로그가 이미 CF로 노출 중이라 editor는 같은 노출 모델을 상속**(새 설정 사실상 0).

**유지하는 것 — "추가 보안"이 아니라 그냥 코드를 맞게 쓰는 것 (비용 0):**
1. **로그인/세션(D5)**: argon2id(`Bun.password`) + httpOnly 세션 쿠키 + 기본거부 미들웨어. (= 기능 자체)
2. **파일/git 코드를 올바르게**: slug/category=allowlist 정규식, `path.resolve` 컨테인먼트(content 밖 쓰기 차단), **셸 금지**(`execFile`/배열인자). 이건 오버엔지니어링이 아니라 버그 안 내는 것.
3. **EXIF/GPS**: sharp는 **기본적으로 메타데이터 제거** → 그냥 `withMetadata()` 안 부르면 됨(다이어리 GPS 유출 방지). `.rotate()`로 방향만 굽기. 비용 0.
4. **빌드 안전망(공짜)**: 잘못된 MDX → CI 빌드 실패 → **구 사이트 유지**(배포는 build 성공 게이트).

**전부 드롭(과함)**: TOTP/2FA, brute-force 잠금, 자체 HTTPS, fail2ban, systemd 샌드박싱 정교화, CSP, 템플릿 vendoring, sandboxed-iframe MDX 미리보기(애초에 canvas=TipTap이라 별도 MDX 런타임 미리보기 안 씀; 단독 신뢰 작성자라 XSS는 로그인으로 충분). → CF + 위 4개로 끝.

**확인만**(코드 전): 이미지 ingest에 원본 passthrough 분기 없음(GPS) — 그 외 블로커 없음.

## 8. UI/UX Plan (요약)

**테마(scene sentence)**: "오너가 저녁에 데스크톱에서 30–90분 한국어 장문을 쓰는, 가끔 태블릿" → **캔버스 기본 = 따뜻한 라이트(paper)**, 명시적 라이트/다크 토글(블로그 선호 미러). "글쓰기=다크" 반사 거부. 색은 **절제** — 틴티드 뉴트럴 + 블로그 `--primary` 액센트 ≤10%(발행 버튼·활성·포커스·저장 점만). 상태색(amber=미업로드/quota, red=오류, green=성공)은 의미 전용. `oklch` 토큰, 순흑백 금지.

**차별점**: 캔버스 = **발행 결과의 WYSIWYG 리허설**(같은 한글 본문 폰트·헤딩 스케일·코드 테마·measure). + **정직한 이미지 동기화 상태**(붙여넣은 이미지는 발행 전까지 `⚠ 미업로드` 배지).

**핵심 제안**:
1. **레이아웃**: 제목은 캔버스 첫 블록(H1, frontmatter `title`+slug 자동파생). 나머지는 **우측 속성 드로어(~320px)** — 신규 초안엔 열려서 `분류` 먼저 요구(음악 필드·URL 게이트), 본문 입력 시작하면 44px 레일로 자동 접힘(검증 칩 표시), `⌘/Ctrl + .`로 재오픈. **음악 필드**는 `category=music`일 때만 인라인 노출.
2. **작성 경험**: 슬래시 메뉴(한/영 키워드 동시: `/코드`·`/code`), 버블 메뉴, 좌측 거터 `+`/`⠿` 핸들, 이미지 드롭→object-URL 즉시 미리보기+`⚠ 미업로드`+alt 필드, 코드블록 언어 피커, 수식 라이브 KaTeX 미리보기, mermaid 분할 블록(소스/렌더 + 파싱오류 메시지).
3. **자동저장**: 제목 옆 조용한 상태텍스트(`변경됨`→`저장 중…`→`「방금 저장됨」`), 저장 토스트 금지. 중단된 발행 복구 배너(이미지 N/M 업로드됨·커밋 안 됨).
4. **발행 흐름(분리)**: **커밋 전 = 모달**(validating→uploading→posting, 취소 안전, 이미지별 재시도) / **커밋 후 = 백그라운드 칩**(`사이트 재빌드 중… 약 2–5분`, 닫고 계속 작업/새 글 가능). RPi 빌드는 **비결정 + 시간추정**(가짜 진행바 금지), 라이브 URL 200 확인 옵션. 썸네일도 동기화 셋의 1급 멤버.
5. **글 목록 = 상태 대시보드**: `/posts`에 글마다 파생 상태 배지(`동기화됨`/`수정됨`/`새 초안`/`⚠ 외부수정`). "수정됨"=발행 필요. 레거시 글은 `외부 편집` 배지(앱 편집 비활성). (이미지가 서버에 있으니 IndexedDB quota UI는 불필요)

**접근성(WCAG 2.2)**: 대비 ≥4.5, 터치타깃 ≥44pt, 포커스링 2px, 색 단독정보 금지, reduced-motion, 슬래시=`role="listbox"`+`aria-activedescendant`, 버블=roving tabindex+`aria-pressed`, 발행모달=`role="dialog"`+포커스트랩+`aria-live`. **모든 버튼 가시 배경/테두리**(text-only 금지), 우측정렬 primary. `data-testid` `{page}-{element}-{action}`.

## 9. 컴포넌트/파일 맵 (Designer 분배 후보)

**배치(D10)**: 단일 repo. **blog는 root 유지**, **`editor/` 서브폴더에 React SPA + Hono 백엔드를 한 단위**로. 블로그 워크플로에 `editor/**` path-filter 추가(editor-only 커밋이 블로그 재빌드 안 하게).

**`editor/` — React SPA (Vite, 전부 신규)**
- `src/routes/{login, posts/index, editor/$id}.tsx` (TanStack Router) — thin, 로직은 훅으로
- `src/components/{EditorCanvas, SlashMenu, FrontmatterForm, PublishDialog, PostCard(상태배지), AutosaveIndicator}.tsx` + `nodeviews/{ImageNodeView, RawMdxBlock}.tsx`
- `src/lib/{api.ts(TanStack Query 훅: posts/media/publish), serializeMdx.ts(직렬화+이스케이프), deserializeMdx.ts(레거시 역변환+raw폴백), imageNormalize.ts, frontmatterSchema.ts(zod 미러)}` (IndexedDB 없음)
- `src/stores/{editorUi}.ts`(Zustand 최소) · `src/tiptap/extensions/` · shadcn `components/ui/`
- `vite.config.ts`(+`vite-plugin-pwa`), `manifest`(PWA)

**`editor/` — Hono 백엔드 (Bun, RPi)**
- `server/index.ts`(Hono: SPA 정적 + API), `routes/{auth, posts, media, publish, categories, import}.ts`, `lib/{git, sharp, mdx(serialize+convertLoader 재사용 ../src/utils), slug, paths, hash}.ts`, `db.ts`(bun:sqlite — posts·jobs), `migrations/`(시드: 기존 글→`source='legacy'`), `editor-api.service`(systemd)

## 10. v1 범위 컷 (가차없이)

**마일스톤 ①(핵심)**: React SPA(설치형 PWA, 모바일) + Hono(서빙+API); 신규 글 작성 + **에디터 출생 글 재편집/재발행**; frontmatter(음악 조건부); 핵심 블록+코드(언어)+수식+mermaid+이미지(삽입 즉시 `/files/media`)+기본 동영상+**raw-MDX 블록**; **서버(RPi SQLite) 단일 저장**+자동저장(IndexedDB 없음); 글 목록=상태 대시보드(`DB≠MDX`→수정됨); **다기기 동시접속 버전 가드(409)**; 외부수정 가드; 분리형 **비동기** 발행(검증→dry-run→커밋→detached 재빌드→완료 표시); 쿠키 인증(argon2id+세션); 단방향 TipTap-JSON→MDX(이스케이프). **Cloudflare 공개(`jun-devlog.win/editor`·`/editor-api`) + 앱 로그인, origin은 CF로 잠금.**

**마일스톤 ②**: **레거시 손글 글 역변환 임포트**(`/posts/import`, MDX→TipTap + raw-MDX 폴백) → 기존 글도 앱에서 편집/재발행.

**Later**: 브라우저 HEIC; callout(렌더러 확인 후); 테이블/토글/드래그정렬; DiaryCarousel 갤러리 작성; 빌드로그 스트리밍; 썸네일 크롭 UI; 실시간 공동편집(Yjs); workflow_run 웹훅; Vite+ 채택(beta 후).

## 11. 오픈 결정 (/team-run 전 사용자 확정 필요)

**✅ 전부 확정 — 남은 결정 없음.** 블로그 SSG 유지 · **스택=React**(Vite+ alpha·editor 한정 + @tiptap/react·**Novel 베이스** + TanStack Query + Zustand + **shadcn 정본**+Magic UI 절제 + PWA) · Hono가 `/editor`·`/editor-api` 서빙·쿠키 인증(D5) · **DB(RPi SQLite)=편집 SoT(TipTap JSON), git/MDX=발행 투영, `DB≠MDX`=draft**(D8) · IndexedDB/캐시 없음(D7) · 이미지=`/files/media` 평면·이동 없음(D3) · 발행=비동기+완료 표시(D6) · **레거시 포함 편집**(역변환, 마일스톤②, D4) · 동시접속 버전 가드(D9) · **단일 repo 대칭 `blog/`+`editor/`**(D10) · **노출=Cloudflare 공개 + 앱 로그인, 보안 경량**(D1, §7).

**착수 순서**: **step 0**(blog→`blog/` 이동 + CI/Docker 마이그레이션 검증) → **마일스톤①**(신규 생성·발행) → **②**(에디터 출생 글 편집) → **③**(레거시 역변환 임포트).

## 12. 미해결/확인 필요

- 블로그에 **Callout MDX 컴포넌트** 존재 여부(있으면 v1 블록에 추가 검토).
- RPi sharp의 **HEIC 디코드** 가용성(부팅 프로브로 런타임 확인).
- 카테고리 enum 실제값: content에는 `daily/diary/game/music/web` 디렉터리 존재(CLAUDE.md의 `web|game|diary`와 불일치 — 실제 디렉터리 기준으로 확정).

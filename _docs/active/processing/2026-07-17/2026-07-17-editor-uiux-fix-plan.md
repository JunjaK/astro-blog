# editor UI/UX 수리 + 글 생성/발행 구현 — Team Plan

> Status: Processing
> Created: 2026-07-17 · Base: `fix/blog-hydration-418` @ `b1a7b4c` · Orchestration: **STANDARD**
> Mode: team-run (Leader + Arch A/B/C + UIUX-Master + Designer ×4 + Tester ×2)
> Scope: **editor 앱 전용** (`editor/`). blog 앱 out of scope.

## Task Description
> (원문) "editor 만든거 ui/ux 너무 구린데 검토 후 수정방안 모색"
> 1. 버튼 크기 비일관 · 2. 생성/수정 제대로 안됨(기능 버그, 근본원인) · 3. 페이지네이션 없음 · 4. 기타 UI/UX 스윕.

사용자 게이트 결과(확정, 재논의 금지):
- **Q1 = A**: 글 생성 full 구현 (`POST /posts` + 발행까지). 발행 스코프 = "로컬 파일 쓰기 + git은 사용자 손"(persona 하드게이트 정합).
- **Q2**: "생성/수정 안됨"은 데이터 버그가 아니라 **UX 플로우 불만** — SakesPage 상단 인라인 편집폼 → **라우트 기반 편집 뷰**로 재설계.
- **Q3**: 페이지네이션 = **클라이언트 「더 보기」 슬라이스**(30/page).
- 추가 지시: UI는 **impeccable 스킬 방법론**으로 처리 (Phase 2 UIUX-Master가 로드).

## Scope Analysis
- **Frontend**: button.tsx 탭타깃 floor 내장 + 매직스트링 4곳 제거 / `usePager`·`Pager` 신규 / SakesPage 라우트 편집 뷰 재설계(`routes/sakes/*` 분해) / EditorPage 생성 배선·수정 onError·발행 버튼 / PostsPage 빈·에러 상태·행 통일 / DbBadge 토큰화 / a11y·testid.
- **Backend**: 신규 `server/posts.ts`(기존 GET×3+PUT 이동 + `POST /posts` + `POST /publish/:id`). DB 스키마 변경 **없음**.
- **Infra/Security**: **YES** — 사용자 입력 slug가 파일 경로(`BLOG_CONTENT/category/slug.mdx`)로 쓰임 → path-traversal. Architect C Phase 1 소환.
- **UI/UX**: **YES** — 태스크 본질. UIUX-Master + impeccable.

## Team Composition
- **Designers: 4** (트리거: 파일 6+ · 독립 모듈 · 라우트 재설계로 신규 파일 다수; 상호의존은 병합 순서로 흡수)
- **Testers: 2** (트리거: unit[신규 `posts.test.ts`] + integration/E2E[생성·수정·발행·페이지네이션·탭타깃 런타임])
- **Architect A (FE): YES** · **Architect B (BE): YES** · **Architect C (infra/sec): YES (Phase 1 경로처리 리뷰 + Phase 5 항상)** · **UI/UX Master: YES (impeccable)**
- **Orchestration: STANDARD** (ultracode 런타임 신호 없음 · `CLAUDE_HARNESS_ULTRACODE` 미설정 → 표준 `Agent()`/`TeamCreate`)

## 근본원인 확정 (Phase 1 조사, file:line)
- **글 생성 미구현(3레이어)**: `EditorPage.tsx:36` 저장 버튼 `disabled`+onClick 없음 / `server/index.ts` `POST /posts` 라우트 없음 / `lib/api.ts` `createPost` 없음. → 버그 아님, 스텁.
- **글 수정 침묵실패**: `EditorPage.tsx:61-69` save mutation에 `onError` 없음 → 실패 시 무메시지·dirty 잔존("안 됨"으로 체감). `invalidateQueries` 없음.
- **사케 CRUD**: 정적 이상 없음(`SakesPage.tsx:203-246`+`sake.ts`). Q2로 원인 확정 = 인라인폼 UX 불만(데이터 버그 아님).
- **버튼**: 3높이 공존(28/32/44-then-32) — `min-h-11 sm:h-8`(EditorPage 제외 4곳)에서 `min-h`가 `h`를 이겨 `sm:h-8`은 죽은 코드. 주요 `저장`(EditorPage `size="sm"`)이 28px로 최소·모바일 44px 미달.
- **페이지네이션 0**: `PostsPage.tsx:19`(42) / `SakesPage.tsx:346·524·692`(양조장 78 등). 서버 전량반환. 규모 수십~100 → 클라 슬라이스 정답, BE 불필요.

## Plan

### Frontend (Arch A)
- **SakesPage 라우트화**: `/sakes/:kind` 부모 레이아웃 + `:id` 자식 라우트. 편집 = **fixed 전체화면 오버레이**(부모 리스트 미언마운트 → 검색/페이지/스크롤 보존). `routes/sakes/{shared,SakePanel,BrandPanel,BreweryPanel}.tsx`로 분해. **제네릭 훅 금지 — 3벌 명시 유지**(persona: 통일성>추상화, 하지만 여기선 3벌 명시가 SSOT).
- **button.tsx**: ~~base cva~~ → **(Phase 2 보정)** 텍스트 size 4종(`default/xs/sm/lg`)에만 `min-h-11 sm:min-h-0`(모바일 44px floor, 데스크톱 32px 균일). `icon*` 4종은 제외 — 정사각(`size-N`)이 비대칭으로 깨짐(`dialog.tsx:67` close, `calendar.tsx:200` 화살표; WCAG 2.5.8 인접 대체수단 예외로 정당). 매직스트링 `min-h-11 sm:h-8` 4곳 제거(`PostsPage:14`,`SakesPage:252/461/640`) + `size="sm"` prop **8곳 전수 제거**(`EditorPage.tsx:35,36,75,78` 포함 — 누락 시 28px 재발). 신규 size 변형 **금지**.
- **`usePager`/`Pager`**: 30/page, 「더 보기」 증분, 검색 apply/reset·탭 전환 시 **명시 reset**. `useEffect` 금지(이벤트/파생만). 신규 `src/components/Pager.tsx`.
- **EditExisting**: save에 `onError`(사케 `EditorMsg` 인라인 패턴 재사용 — 신규 토스트 의존성 0) + `invalidateQueries(['posts'])`, 저장바 통합 피드백. **「발행」 버튼**(아래 중재 3).
- **NewPost**: 생성 배선 + **slug 입력**(아래 중재 1) + dirty guard(`confirm` + `beforeunload`; `useBlocker`는 BrowserRouter라 불가 — 검증됨).
- **PostsPage**: 빈/에러 상태 분리, 행 전체 `<Link className="row-btn">` 통일(사케 행과 어포던스 일치).
- **DbBadge**: 하드코딩 hex → `--ok*` 토큰 + `.db-badge` 클래스. tablist→tabpanel a11y. `data-testid` 전수(`{page}-{element}-{action}`).
- 주의: editor 클래스 병합은 **`cn`**(blog의 `ny` 아님).

### Backend (Arch B)
- 신규 **`server/posts.ts`** Hono 서브라우터(sake.ts 미러). 기존 `index.ts`의 GET×3+PUT을 **byte-identical 이동** + 신규:
  - **`POST /editor-api/posts`** — 생성. `id = ${category.toLowerCase()}/${slug}`. category allowlist `{daily,diary,game,music,tasting,web}`. slug `^[a-z0-9]+(?:-[a-z0-9]+)*$`(path-traversal 방어 겸용). 중복 → 409. `doc_json` **NULL**(body-as-SoT 현실 미러 — 채우기 금지). 응답 **201 `{id}`**(중재 2).
  - **`POST /editor-api/publish/:id{.+}`** — `matter.stringify` → `BLOG_CONTENT` containment 검증(`path.resolve` 후 prefix 확인) → 파일 쓰기 → `published_mdx_hash` 갱신. **prod(RPi)는 `BLOG_CONTENT` 부재 → 503 "로컬에서만 발행"**. **git 자동화 없음**(persona 하드게이트). plan §6의 무거운 발행기계(deploy key/jobId/폴링) 전부 컷.
- DB 스키마 변경 없음. **`server/posts.test.ts`** 신규(sake.test.ts 패턴, `:memory:`) — slug 검증·중복 409·containment·503 커버.

### 충돌 중재 결과 (Leader 결정, 확정)
1. **slug — 필수(BE안 채택).** 실데이터 제목 CJK 태반 → 서버 파생은 거의 항상 실패하는 죽은 브랜치 → 작성 전 삭제(ponytail rung 1). FE는 slug 입력 + `canSave`에 동일 regex 게이트. 서버는 trust-boundary 방어로 `400 slug_required` 유지(무음 slug 금지, persona 정합).
2. **응답 shape — `201 Created`, body `{id}`.** slug 컬럼=id(풀경로)라 별도 slug 반환 무의미 → 드롭. 201은 생성 시맨틱상 정확·비용 0(FE `req<T>`는 2xx 통과). FE는 `/editor/${id}`로 이동.
3. **발행 버튼 — 이번 PR 포함(scope A 필수).** EditExisting 저장바에 「발행」(`secondary`, 저장과 시각 분리). **저장됨(non-dirty) 상태에서만 활성**(영속된 것만 발행). 503 → 「로컬에서만 발행 가능」 인라인. **D2 스코프에 추가**.
4. **Architect C Phase 1 소환 — YES(BE 권고 수용).** 사용자 입력 slug의 파일경로 write = path-traversal 표면. 리뷰 범위: slug regex + `BLOG_CONTENT` containment + publish 파일쓰기. Phase 5는 규정상 항상.

### Phase 2 UI/UX 리뷰 (impeccable) — 플랜 보정 (확정)
UIUX-Master가 impeccable 방법론(shared design laws + critique/audit 체크리스트)으로 리뷰. Register=product(내부 도구), 기존 다크·컴팩트 디자인 언어 유지, 신규 개성/모션 추가 금지. 판정: 전체 승인 + 아래 보정.

1. **버튼 floor 위치 수정**: base cva ✗ → `default/xs/sm/lg` 4개 size 문자열에만 적용. `icon*` 제외(정사각 깨짐: `dialog.tsx:67`, `calendar.tsx:200`). `size="sm"` **8곳 전수 제거**(매직스트링 4곳 + `EditorPage.tsx:35,36,75,78`).
2. **오버레이 보강 (D3)**: ① body 스크롤락 — 커스텀 div라 base-ui 자동 락 없음: mount/unmount 시 `document.body.style.overflow` 토글 + 오버레이에 `overscroll-behavior: contain`(iOS 스크롤 체이닝 방지). ② 포커스 관리 — mount 시 헤더(`← 목록`)로 포커스 이동, 닫힘 시 클릭했던 행으로 복귀. ③ **Esc 바인딩 금지**(페이지 시맨틱 + `FrontmatterForm.tsx:307` combobox/slash-menu Escape와 충돌). ④ 트랜지션 추가 금지(모션 예산 0, `prefers-reduced-motion` 가드 저장소 전무 — LATER 기록).
3. **Pager 카운트 (D3)**: 패널 헤더 카운트가 전체만 표시(`SakesPage.tsx:251/460/639`) → 검색 적용 시 `사케 (${filtered.length}/${items.length})` 조건부 표시.
4. **OK-green 드리프트 통일 (D1)**: `#7fff9f`(`.badge.ok`, DbBadge) vs `#7fdf9f`(`.sake-editor__msg.ok:366`, `.tasting-ai__savemsg:259`) — 4곳 전부 단일 `--ok`/`--ok-surface` 토큰으로 수렴. DbBadge만 고치면 드리프트 잔존.
5. **PostsPage 빈 상태 (D1→D2)**: SakesPage `ListState`(`:71-84`, loading/error/전체빈/검색빈 4분기)를 **D1이 `src/components/ListState.tsx`로 추출**(신규 파일 — D2∥D3 병렬 충돌 회피, D1 선머지라 안전), D2가 PostsPage에서 소비, D3는 로컬 카피 삭제 후 import.
6. **발행 버튼 배치 (D2)**: `뒤로(outline, 좌측 분리) … 상태텍스트 … 발행(secondary) 저장(default, 우측 끝)` — CLAUDE.md 버튼 정렬 규칙 준수. dirty 시 발행 비활성(중재 3과 정합).
7. **a11y 상세 (D3)**: 탭 버튼에 `id`/`aria-controls`, 패널 래퍼 `<div role="tabpanel" id aria-labelledby tabIndex={0}>`. 화살표 키 로빙 tabindex는 LATER.
8. **[미결 → 승인 게이트]** popstate(브라우저/제스처 뒤로가기) dirty-guard 미차단 갭: `confirm`+`beforeunload`는 앱 내 뒤로·탭닫기만 커버. (A) 갭 인정 + TODO 주석(권장, 단일 사용자 저리스크) vs (B) popstate+pushState 더미스택 가로채기(코드 작으나 back 2회 UX 부작용).
9. **dirty 상태 발행 잠금**: `disabled={dirty || save.isPending}` — 스테일 발행 방지(기존 canSave 게이트 패턴 정합).

### File Assignment (무중복, 완전 disjoint)
| Designer | Files | Scope | Worktree |
|----------|-------|-------|----------|
| **BE** | `server/index.ts`(마운트+라우트 이동), 신규 `server/posts.ts`, 신규 `server/posts.test.ts` | 라우터 분해 + POST /posts + /publish | worktree-be |
| **D1** | `src/components/ui/button.tsx`, `src/styles-custom.css`, `src/components/FrontmatterForm.tsx`(DbBadge 토큰화), 신규 `src/components/Pager.tsx`, 신규 `src/components/ListState.tsx`(SakesPage에서 추출) | 디자인 시스템 기반(선머지) | worktree-d1 |
| **D2** | `src/lib/api.ts`, `src/routes/EditorPage.tsx`, `src/routes/PostsPage.tsx` | 글/편집기 FE + client + 발행 버튼 | worktree-d2 |
| **D3** | `src/App.tsx`, `src/routes/SakesPage.tsx`, 신규 `src/routes/sakes/*.tsx` | 사케 라우트 편집뷰 재설계. App.tsx: `/sakes`→`/sakes/sake` 리다이렉트 + 헤더 NavLink(`App.tsx:33`) 갱신 필수 | worktree-d3 |

- FrontmatterForm/CropDialog 버튼은 D1 button.tsx 변경으로 자동 정합 → 별도 배정 불필요.
- **병합 순서: BE → D1 → (D2 ∥ D3)** (types→backend→frontend 준수. D2/D3은 D1의 `Pager`/`button` floor 소비 → D1 선머지 필수. BE는 server/ 독립이라 언제든 가능하나 순서 선두).
- **worktree 4개**(cap 5 이내).

## Implementation Notes (Phase 3 완료, 2026-07-17)
- 병합 브랜치 **`feat/editor-uiux-overhaul`** (base `b1a7b4c`). 병합 순서 BE(`030c6eb`)→D1(`42bc9a9`)→D2(`dc0a7f7`)∥D3(`d1bb744`), 머지 커밋 `979aef3`까지. 충돌 0.
- **worktree stale-base 함정 재발**: 4개 worktree 전부 master(`d94639b`, 52커밋 뒤)에서 생성됨 — 각 Designer가 `--ff-only`로 자가 교정 (MEMORY workflow-tool-gotchas 패턴, Agent isolation에서도 동일 발생 확인).
- 검증: `bun test` **95 pass/0 fail**(baseline 41 → +BE16 +D1 15 +D2 16 +D3 7), `tsc -b` 0 errors, `bun run build` 성공.
- 주요 편차(전부 정당화 보고됨): D2 `PostApiError` 신설(req<T>가 에러 바디 미노출, AutofillError/SakeRefError 관용구 미러) / D3 NavLink `to="/sakes"` 유지(prefix-match가 전 탭 active 보장 — 플랜 문구보다 플랜 의도 우선) / D3 Edit=Gate+Form 2단(로딩 중 lazy-init 캡처 버그 방지) / D1 `tsconfig.app.json`에 `src/**/*.test.ts` exclude 1줄(기존 server 관례 미러).
- **BE 사고 보고**: posts.test 최초 실행 시 BLOG_CONTENT 기본값이 실제 blog content에 파일 2개 생성 → 즉시 삭제(untracked, git 클린 확인), env를 요청 시점 읽기로 근본 수정.
- **hash-parity 발견(Phase 5 판단 대상)**: `matter.stringify` 재직렬화가 레거시 원본과 바이트 불일치(날짜 ISO화/배열 block style/따옴표) — 레거시 글을 편집기에서 최초 발행 시 포맷-only diff 발생. 에디터-출생 글은 무영향.
- **알려진 코스메틱 갭**: 사케 신규 생성 성공 직후 `key={id}` 리마운트로 「저장됨」 메시지 미노출 가능(기능 정상, 후속 과제).

## Test Results
_(Phase 4에서 채움. 필수: editor 서버 기동 후 생성→목록반영→새로고침 영속 / 수정 실패 onError 노출 / 발행 로컬 파일 write & 503 / 「더 보기」 슬라이스 & 검색 reset / 모바일 44px 탭타깃. **editor dev 서버 --watch 없음 + 재기동 사용자 게이트**(MEMORY: editor-dev-server-stale) → Tester 기동시각 vs mtime 대조.)_

## Security Review

### Phase 1 선-리뷰 (Architect C, 2026-07-17) — CHANGES-REQUIRED(경미 2건, BE Designer 스코프에 반영)
- **판정**: 방어 삼중장치(slug regex + category allowlist + resolve-containment) **충분**. 인코딩 우회(`%2e%2e` 등)는 Hono 디코딩 후 `resolve` 정규화로 containment에서 차단. DB 행 악성 id 불가(POST=검증됨, seed=Glob 상대경로라 `..` 불포함). auth는 미들웨어 등록순(index.ts:46 < 79)상 서브라우터에 상속 — 신규 mount는 line 51 이후 등록만 지키면 됨.
- **필수 1**: publish — 경로 연산 **이전에** DB 행 존재 확인(`if (!row) return 404`). null deref 500 + 미검증 id 경로연산 방지. 경로는 `row.id` 기준.
- **필수 2**: publish — `mkdir` **이전에** `existsSync(BLOG_CONTENT)` 루트 stat → 부재 시 503. recursive mkdir이 루트까지 만들어 phantom 경로에 조용히 write 성공하는 drift 차단(조용한 실패 = persona 하드라인).
- **금지**: publish에서 엄격 id 재검증 regex(`^[a-z]+/[a-z0-9-]+$`) 추가 금지 — 레거시 다단/비ASCII id(`diary/2024/foo` 등) false-positive. containment가 완전한 경계.
- **defer**: JSON payload cap(Bun 기본 128MB 플랫폼 캡 존재), 409 원자화(단일 사용자 race 없음), X-Requested-With 헤더.
- **BE 기능 노트(보안 아님)**: `published_mdx_hash` 포맷은 seed의 full-file raw sha256(16hex)(seed.ts:23)과 **동일 방식**이어야 레거시 글이 발행 후 전부 drifted로 뜨지 않음 — `matter.stringify` 출력과 seed raw 재구성의 바이트 정합 확인(Tester 검증 항목).

_(Phase 5 최종 감사: 규정상 항상 수행 — 구현 diff 대상.)_

## Escalation Log
- 2026-07-17 · Phase 1 cross-review 충돌 4건(slug/응답/발행버튼/ArchC) → Leader 중재 확정(위 §충돌 중재 결과). 재논의 금지.

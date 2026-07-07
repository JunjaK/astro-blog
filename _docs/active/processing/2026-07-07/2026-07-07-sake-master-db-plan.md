---
status: processing
created: 2026-07-07
topic: sake-master-db
base: dc2eb1b (tasting-note SHIP)
team: Leader + Arch-FE + Arch-BE + Arch-C(infra pre-review) + UIUX(Phase 2) + 3 Designers + 2 Testers
mode: /team-run (autonomous)
---

# 사케/양조장 마스터 데이터 + API — 통합 확정 플랜

> Status: Planning
> 용도: **editor 전용 마스터 데이터** (SQLite + /editor-api CRUD). blog는 frontmatter가 SSOT, 빌드 무관, export 없음.
> 원칙: 기존 editor 서버 패턴 정확 미러, 신규 npm 의존성 0, `bun:sqlite`/`bun test` 내장. 판정: FE·BE APPROVE-WITH-CHANGES, Infra CONCERNS(CRITICAL/HIGH 0).

## Task Description (사용자 요구)

"db에 니혼슈/양조장 관련 정보 저장하고 싶음. 관련 api도 필요할듯?" — (1) editor SQLite에 사케/양조장 테이블 + CRUD. (2) autofill DB 우선 → AI 폴백 → 확정 시 저장(AI 원본 직행 저장 금지). (3) 관리 페이지(목록/검색/편집/삭제) + 시음노트 폼 통합(검색-선택).

## 확정 결정 요약 (미결 잔여 포함)

| 항목 | 확정 | 근거 |
|------|------|------|
| **id 생성** | 서버 `randomBytes(6).toString('base64url')` = 8자, `newId()` 헬퍼 | `newSession` 선례 base64url(hex 아님), opaque(이름과 디커플 → brewery_id FK 안정), 컴팩트(긴 UUID 회피). 48bit = 개인도구 충분. FE는 id 생성 안 함. |
| **컬럼 casing** | 도메인 스펙 = camelCase(`tokuteiMeisho/riceType/seimaiBuai/alcohol/nihonshuDo/sando`), 인프라 = snake(`id/brewery_id/name_norm/created_at/updated_at`) | 도메인 컬럼이 frontmatter 계약 자체 → GET row가 remap 0으로 `TastingAutofill`에 스프레드. bun:sqlite는 작성 컬럼명 그대로 키 반환. |
| **이름 정규화** | 서버 소유 `normalizeName(s)=s.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase()`. FE는 정규화 안 함(단일 소스) | NFKC(전각`４５/　`→`45/ `) + collapse + lower(romaji dedup, CJK no-op). |
| **이중 컬럼** | `name`(원문 표시) + `name_norm`(정규형, NOT NULL). 응답에서 name_norm 미노출(반환 전 delete) | Leader 초안 `UNIQUE(...,name)` 자기모순 재정의 — dedup 기준은 정규형. |
| **UNIQUE** | sakes `UNIQUE(brewery_id, name_norm)` · breweries `UNIQUE(name_norm)` | 정규화 dedup. NULL brewery는 SQLite가 distinct 취급 → 양조장 없는 동명 사케 중복 허용(v1, `ponytail:` 주석, 퍼지 병합은 추후). |
| **인덱스** | UNIQUE가 만드는 것만. **`idx_sakes_name` 추가 안 함** | `LIKE '%q%'`는 선행 와일드카드라 인덱스 무용. 소규모 테이블 전수 스캔 무비용. |
| **POST 업서트** | 명시 SELECT(`brewery_id IS ?` NULL-safe) → 있으면 UPDATE(COALESCE augment) 없으면 INSERT. **ON CONFLICT 폐기**(NULL brewery 미발화) | "마스터에 저장"은 부분 확정값 patch → 기존 non-null을 null로 안 덮음. clear는 PUT 전담. |
| **양조장 삭제** | 참조 사케 있으면 **409 `{error:'brewery in use', count}`** 차단, 없으면 200 | 조용한 데이터 손실 금지(persona). UI가 "N개 참조 중" 안내 후 사용자 재귀속/삭제. |
| **brewery 자동생성** | 사케 POST에 `brewery`(이름)만 → 트랜잭션 내 `resolveBreweryId` upsert → brewery_id | "마스터에 저장" 1콜 원자성. autofill은 brewery 이름만 반환. |
| **검색 응답** | 단일 `Sake` 타입(LEFT JOIN brewery 이름 + 서버가 `riceType` JSON.parse → string[]) | 콤보박스+관리페이지 겸용, by-id 재조회 불필요. |
| **서버 LIMIT** | **없음** — 전량 반환(sakes updated_at DESC, breweries name ASC). 콤보박스는 클라 `.slice(0,8)` | 관리 리스트는 전체 필요. 소규모라 무비용. |
| **마스터 저장 name** | **패널 query**(`query.trim()`, title 아님) | title은 프로즈 제목 오염 위험. query가 title에서 seed되고 사용자 refine 반영 = 사케 정체성. 빈 값이면 저장 skip. |
| **타입명** | `SakeInput` 단일(POST/PUT 공용, 시맨틱만 상이). 필드 `?: T \| null` | 동일 shape 두 이름 불요(ponytail). `\| null`로 PUT 명시 clear 안전. |
| **GET /sake/sakes/:id** | 유지(FE 미소비, BE test #1용) | 라우트 9개 유지, 충돌 없음. |
| **DB-픽 경로** | **upsertSake 절대 미호출** (환각 가드 락) | DB=확정 진실 → 직접 set, DbBadge. AI만 리뷰 패널 경유. |

## Scope (지금 vs 추후)

- **지금**: 사케 전용 마스터(`breweries`+`sakes`), `/editor-api/sake/*` CRUD 9라우트, DB-우선 autofill 오케스트레이션, 관리 페이지(`/editor/sakes`), 폼 검색-선택 + 확정 저장.
- **추후(별도 PR)**: 위스키/맥주/기타 마스터(**예약조차 안 함** — 스펙 상이, generic `drink_master` 추상 거부=YAGNI). 퍼지 이름 매칭/병합 툴. blog export(명시적 out — frontmatter SSOT).

---

## Contract (SSOT — api.ts와 sake.ts가 이 표를 동일 문자열로 전사)

### DB 스키마 (`db.ts` 최상위 additive, `IF NOT EXISTS`, ALTER 0 — RPi 부팅 시 db.ts import로 멱등 자동생성)

```sql
CREATE TABLE IF NOT EXISTS breweries (
  id         TEXT PRIMARY KEY,           -- randomBytes(6).base64url (8자)
  name       TEXT NOT NULL,              -- 원문(표시용)
  name_norm  TEXT NOT NULL UNIQUE,       -- normalizeName() — 매칭/dedup, 응답 미노출
  region     TEXT,
  note       TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS sakes (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,           -- 원문(표시용)
  name_norm     TEXT NOT NULL,           -- 매칭/검색 대상
  brewery_id    TEXT,                    -- 논리 FK → breweries.id (PRAGMA 미설정=미강제, 삭제는 앱이 409 차단)
  tokuteiMeisho TEXT,                    -- 特定名称 enum(앱 검증)
  riceType      TEXT,                    -- JSON string[] ; NULL=없음
  seimaiBuai    INTEGER,
  alcohol       REAL,
  nihonshuDo    REAL,
  sando         REAL,
  note          TEXT,
  created_at    TEXT,
  updated_at    TEXT,
  UNIQUE(brewery_id, name_norm)          -- NULL brewery는 distinct = v1 허용(ponytail)
);
-- idx_sakes_name 추가 안 함 (LIKE '%q%' 인덱스 무용)
```

`db.ts` 7행 mkdir 가드를 `if (DB_PATH !== ':memory:') mkdirSync(...)`로 (sake.test.ts in-memory용, prod 실경로엔 inert).

### 타입 (api.ts — D2 정의, BE=SSOT, FE 손 재정의 금지)

```ts
export interface Brewery {
  id: string; name: string; region: string | null; note: string | null;
  created_at: string | null; updated_at: string | null;
}
export interface Sake {                    // GET 응답 (join + parse 완료)
  id: string; name: string;
  brewery: string | null;                  // LEFT JOIN 해석된 양조장 이름(표시용)
  brewery_id: string | null;
  tokuteiMeisho: TokuteiMeisho | null;
  riceType: string[];                      // 서버 JSON.parse; 없으면 []
  seimaiBuai: number | null; alcohol: number | null;
  nihonshuDo: number | null; sando: number | null;
  note: string | null;
  created_at: string | null; updated_at: string | null;
}
export interface SakeInput {               // POST(augment) / PUT(replace) 공용, brewery=이름(서버 id 해석)
  name: string; brewery?: string | null;
  tokuteiMeisho?: TokuteiMeisho | null; riceType?: string[];
  seimaiBuai?: number | null; alcohol?: number | null;
  nihonshuDo?: number | null; sando?: number | null; note?: string | null;
}
export interface BreweryInput { name: string; region?: string | null; note?: string | null }
export class SakeRefError extends Error { count: number; /* 409 body count 노출 */ }
```

`TOKUTEI_MEISHO` 상수(9값, `satisfies readonly TokuteiMeisho[]`)를 **FrontmatterForm L31-33 → api.ts로 이동+export** (SakesPage와 공유). `TokuteiMeisho` union은 기존 SSOT 유지.

### API 라우트 (`app.route('/editor-api/sake', sake)`, default-DENY 자동 인증, 인라인 바인딩 SQL, `{error}`+status)

| # | 라우트 | Method | Req | Res 2xx | 에러 |
|---|--------|--------|-----|---------|------|
| 1 | `/sake/sakes?q=` | GET | q?(정규화 후 LIKE) | `Sake[]`(updated_at DESC) | 401 |
| 2 | `/sake/sakes/:id` | GET | — | `Sake` | 401,404 (FE 미소비, test용) |
| 3 | `/sake/sakes` | POST | `SakeInput` | `{ sake: Sake, created: boolean }` | 400(name 빈값),401 |
| 4 | `/sake/sakes/:id` | PUT | `SakeInput` | `{ ok: true }` | 400,401,404 |
| 5 | `/sake/sakes/:id` | DELETE | — | `{ ok: true }` | 401,404 |
| 6 | `/sake/breweries?q=` | GET | q? | `Brewery[]`(name ASC) | 401 |
| 7 | `/sake/breweries` | POST | `BreweryInput` | `{ brewery: Brewery, created: boolean }` | 400,401 |
| 8 | `/sake/breweries/:id` | PUT | `BreweryInput` | `{ ok: true }` | 400,401,404 |
| 9 | `/sake/breweries/:id` | DELETE | — | `{ ok: true }` | 401,404,**409 `{error:'brewery in use', count}`** |

- 404 판정 = `res.changes === 0` (기존 posts PUT 미러). 401 = 기존 미들웨어 자동.
- POST=augment(COALESCE), PUT=replace(생략/null → clear). **D3의 PUT은 brewery 포함 full body**(조용한 unlink 방지).
- `normalizeName`/`resolveBreweryId`/`JSON.stringify(riceType)` = 서버. GET은 `JSON.parse(riceType)`, `delete name_norm`.

### FE 에러 처리
`400` 폼 인라인 검증 · `404` 리스트 재조회 · `409` 양조장 삭제 blocking("사케 {count}개 참조 중 — 삭제 불가") · `401` 전역 로그인 바운스(`req`) · 콤보박스 검색 실패 = **무음**(빈 드롭다운, 글쓰기 비차단).

---

## server/sake.ts (신규 — D1. Hono 서브라우터. index.ts 비대화 방지 + `app.route` 네이티브 합성)

**index.ts 변경 = 2줄만**: `import { sake } from './sake';` + `app.route('/editor-api/sake', sake);` — **반드시 auth 미들웨어(L44-49) 등록 뒤**(구현 게이트, Hono 등록순 체인).

**헬퍼 (load-bearing — Designer가 정확히 복제):**
```ts
import { randomBytes } from 'node:crypto';
import { Hono } from 'hono';
import { db } from './db';

export const newId = () => randomBytes(6).toString('base64url');       // 8자, newSession 선례
export const normalizeName = (s: string) =>
  s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
// ⚠️ 리터럴 정확히: LIKE 메타문자 이스케이프. 쿼리 `... LIKE ? ESCAPE '\'` + param `%${likeEscape(norm)}%`
export const likeEscape = (s: string) => s.replace(/[\\%_]/g, '\\$&');
const now = () => new Date().toISOString();
```
> **[Arch C M1] `likeEscape` 리터럴은 위 `'\\$&'`가 정답.** 리뷰 사본의 `'\\${...}'` 깨짐은 오케스트레이터 임베딩 artifact(실버그 아님). 주입은 아니나 `_`/`%` 와일드카드 누출 correctness 버그 → D1은 **이 리터럴 그대로**. BE test#3가 회귀 가드.

**brewery 해석 (find-or-create, 필드 업데이트 안 함 — id만 필요):**
```ts
function resolveBreweryId(name: string): string {
  const norm = normalizeName(name);
  const hit = db.query('SELECT id FROM breweries WHERE name_norm = ?').get(norm) as { id: string } | null;
  if (hit) return hit.id;
  const id = newId(); const t = now();
  db.run('INSERT INTO breweries (id,name,name_norm,created_at,updated_at) VALUES (?,?,?,?,?)',
    [id, name.trim(), norm, t, t]);
  return id;
}
```

**sake 조회 (parse 포함, GET·업서트 응답 공용):**
```ts
function getSakeById(id: string): Sake | null {
  const row = db.query(`SELECT s.*, b.name AS brewery FROM sakes s
    LEFT JOIN breweries b ON b.id = s.brewery_id WHERE s.id = ?`).get(id) as any;
  if (!row) return null;
  delete row.name_norm;                                  // 내부 컬럼 미노출
  row.riceType = row.riceType ? JSON.parse(row.riceType) : [];
  return row as Sake;
}
```

**POST 업서트 (트랜잭션 — brewery+sake 원자, COALESCE augment):**
```ts
const upsertSake = db.transaction((b: SakeInput) => {
  const name = b.name.trim();                            // [Arch C M4] 검증은 normalize 후
  const norm = normalizeName(name);                      // 서버가 빈 norm → 400 (whitespace-only 차단)
  const brewery_id = b.brewery ? resolveBreweryId(b.brewery) : null;
  const rice = b.riceType?.length ? JSON.stringify(b.riceType) : null;
  const found = db.query('SELECT id FROM sakes WHERE brewery_id IS ? AND name_norm = ?')
    .get(brewery_id, norm) as { id: string } | null;    // IS = NULL-safe 동치
  if (found) {
    db.run(`UPDATE sakes SET tokuteiMeisho=COALESCE(?,tokuteiMeisho), riceType=COALESCE(?,riceType),
      seimaiBuai=COALESCE(?,seimaiBuai), alcohol=COALESCE(?,alcohol), nihonshuDo=COALESCE(?,nihonshuDo),
      sando=COALESCE(?,sando), note=COALESCE(?,note), updated_at=? WHERE id=?`,
      [b.tokuteiMeisho ?? null, rice, b.seimaiBuai ?? null, b.alcohol ?? null,
       b.nihonshuDo ?? null, b.sando ?? null, b.note ?? null, now(), found.id]);
    return { id: found.id, created: false };
  }
  const id = newId(); const t = now();
  db.run(`INSERT INTO sakes (id,name,name_norm,brewery_id,tokuteiMeisho,riceType,seimaiBuai,alcohol,nihonshuDo,sando,note,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, name, norm, brewery_id, b.tokuteiMeisho ?? null, rice, b.seimaiBuai ?? null,
     b.alcohol ?? null, b.nihonshuDo ?? null, b.sando ?? null, b.note ?? null, t, t]);
  return { id, created: true };
});
```
- **POST /breweries도 동형 upsert**(name_norm SELECT → UPDATE COALESCE(region/note) 또는 INSERT → `{brewery, created}`). 절대 bare INSERT(UNIQUE 위반).
- **PUT = 직접 SET**(각 컬럼 = 제공값 ?? null, 생략 → clear). brewery도 `b.brewery ? resolveBreweryId : null`.
- **DELETE brewery**: `SELECT count(*) FROM sakes WHERE brewery_id=?` > 0 → 409 `{error:'brewery in use', count}`; else DELETE(`res.changes===0`→404).

---

## Autofill 플로우 (DB-우선 = 클라 오케스트레이션, 매칭 = 서버 SQL. `/generate/tasting` 무변경)

```
시음노트 폼 (FrontmatterForm, isTasting && isNihonshu):
1. 검색 콤보박스 입력 → 250ms debounce → api.searchSakes(q) [서버 정규화+LIKE, 클라 slice(0,8)]
2. 후보 픽 → applyDbPick(sake): objective non-null 7키(brewery/tokuteiMeisho/riceType/seimaiBuai/
   alcohol/nihonshuDo/sando)만 set() → DbBadge. 주관(amakara/noutan/flavorTags)·title 미변경.
   [DB=확정 → 리뷰 우회, upsertSake 절대 미호출 = 환각 가드 락]
3. 미스/「AI 자동 채움」 → api.autofillTasting(q) [기존 AI] → 리뷰 패널(「추정」 뱃지) → 체크 확정
4. apply(): checked patch → onApply → onChange. 「마스터에 저장」 체크(AI소스 기본 on) 시:
   name = query.trim() (빈값이면 skip+힌트) → api.upsertSake({name, ...objective∩patch})
   [검수된 patch만 저장 — raw AI 직행 저장 경로 없음]
```

**Provenance 뱃지**: `dbFilled: Set` / `aiFilled: Set` 병렬. `aiBadge(k) = dbFilled.has(k) ? <DbBadge/> : aiFilled.has(k) ? <AiBadge/> : undefined`. 수동 `set()`은 두 셋 모두에서 touched 키 제거. `applyDbPick`은 dbFilled add + aiFilled remove.

`MASTER_KEYS = ['brewery','tokuteiMeisho','riceType','seimaiBuai','alcohol','nihonshuDo','sando']`. 콤보박스는 `role=combobox/listbox/option`(TagInput 검증 패턴 미러), `.slash-menu` 시각언어 재사용.

---

## 관리 페이지 구조 (`/editor/sakes`, 신규 라우트 1줄)

- 단일 라우트 + **세그먼트 토글**(사케/양조장, `role=tablist`, ui/tabs 없어 hand-roll). 별도 :id 라우트/모달 없음.
- 탭별 **검색바 2변수**(`searchInput` 바인딩 + `appliedQuery` 필터소스, Enter/버튼에서만 apply, 리셋은 둘 다 클리어).
- **마스터-디테일 인라인 에디터**: 행 클릭 → 선택 row 로컬 복사(by-id 재조회 없음, 검색이 full row) + `dirty`. "+ 추가" = 빈 폼. 저장 useMutation(new→upsertSake, edit→updateSake) + `invalidateQueries(['sakes'])`. 삭제 `confirm()`→delete.
- 브루어리 삭제 409 → `SakeRefError` catch → blocking 메시지(count).
- 리스트 `ul.post-table` 재사용, 폼 ui 컴포넌트(Input/Select/TagInput) 재사용 → 신규 CSS 최소(토글·검색바·헤더 nav). SakeEditor에 `note` 필드 포함.
- `App.tsx`: `.app-header`에 `/sakes` 네비 링크(가시 스타일) + AuthGuard 그룹에 `<Route path="/sakes">`.

---

## Designer 파일 할당 (3명, 겹침 0)

| D | 파일 | 스코프 | 의존 |
|---|------|--------|------|
| **D1 — Server** | `editor/server/db.ts`(2테이블) · `editor/server/sake.ts`(신규 서브라우터+헬퍼) · `editor/server/index.ts`(**2줄**: import+mount, 미들웨어 뒤) · `editor/server/sake.test.ts`(신규, 8케이스) | 스키마+CRUD+매칭+업서트 트랜잭션 | Contract 표 |
| **D2 — Client 계약 + 폼** | `editor/src/lib/api.ts`(타입+`TOKUTEI_MEISHO` 이동+CRUD 8메서드+`SakeRefError`+`deleteBrewery` 전용 fetch) · `editor/src/components/FrontmatterForm.tsx`(콤보박스+DbBadge+dbFilled+applyDbPick+마스터저장) | api 계약 + 폼 오케스트레이션. **FrontmatterForm 단독 소유** | Contract 표 |
| **D3 — 관리 페이지** | `editor/src/routes/SakesPage.tsx`(신규) · `editor/src/App.tsx`(라우트+nav) · `editor/src/styles-custom.css`(토글/검색바/nav) | 관리 UI | **D2 api.ts 타입+`TOKUTEI_MEISHO`** |

**겹침 0**: db.ts/sake.ts/index.ts/sake.test.ts(D1) · api.ts/FrontmatterForm.tsx(D2) · SakesPage.tsx/App.tsx/styles-custom.css(D3). 중복 없음.
**병합 순서**: D1 ∥ D2(둘 다 Contract 전사, 컴파일 독립) → D3(D2 export 소비). 런타임 통합(D2 폼↔D1 라우트)은 Phase 4.
**워크트리 함정(지난 런)**: 각 Designer에 base SHA `dc2eb1b` 명시 + `git reset` 지시, 병합 전 merge-base 검증. 로컬 4322 stale → 라이브 검증은 기동시각 vs mtime 대조, 재기동은 사용자 게이트.

---

## Test Results (Phase 4 기입) — BE 8케이스 (`bun test server/sake.test.ts`, `DB_PATH=':memory:'` + dynamic import, auth 우회 직접 구동)

1. **CRUD 왕복**: POST 생성 → GET 목록 존재 → GET :id 일치 → PUT 반영 → DELETE → GET 404.
2. **정규화 매칭**: POST `"獺祭　４５"`(전각) 후 POST `"獺祭 45"` → `created:false`, count=1.
3. **LIKE % 이스케이프**: `"a_b"`/`"axb"` → `searchSakes("a_b")`는 `a_b`만. `"50%off"` → `searchSakes("50%")` 매칭.
4. **업서트 COALESCE**: POST(seimaiBuai=50) → POST 동일키(alcohol=15, seimaiBuai 생략) → 한 행, seimaiBuai=50 보존 + alcohol=15.
5. **양조장 삭제 정책**: brewery+참조 사케 → DELETE=409(count=1). 사케 삭제 후 DELETE=200.
6. **brewery 자동생성**: POST sake(brewery 이름만) → breweries 행 + brewery_id 세팅 + GET join.
7. **riceType 왕복**: `["山田錦","雄町"]` 저장 → GET이 `string[]` 반환.
8. **name 검증**: POST `{name:""}` (및 whitespace-only) → 400.

**Tester 2 — 클라/통합 + 가드 스모크**: `bunx tsc -b`·`bun run lint`(oxlint)·`bun run build`. 관리페이지(목록/검색/편집/삭제/409 blocking) 스모크. **가드 검증(persona 하드라인)**: DB-픽이 upsertSake 미호출(AI 원본 미저장) · 저장→재로드 SQLite 영속 · DB-픽 재입력 시 AI 비용 0 · 마스터 저장 name=query.

## Security Review (Phase 5 — Architect C. Phase 1 = CONCERNS, CRITICAL/HIGH 0)

- **[M1] `likeEscape` 리터럴** `'\\$&'` 정확 확인(D1 게이트). BE test#3 회귀.
- **SQL injection PASS** — 전 쿼리 파라미터 바인딩, 문자열 보간 0, `IS ?` NULL-safe. Phase 5 재확인.
- **인증 커버리지 PASS** — `app.route` 마운트가 미들웨어(L44) 뒤인지 확인(9라우트 default-DENY).
- **[M4] name 검증** normalize/trim 후 빈 문자열 400(whitespace-only 차단).
- **양조장 삭제 409** 데이터 손실 방지(null화/cascade 아님).
- **마이그레이션 PASS** — `IF NOT EXISTS`, ALTER 0, 기존 테이블 접촉 0, RPi 멱등.

## Phase 2 UI/UX 리뷰 대상 목록 (UIUX Master)

- **Visual**: (1) DB 콤보박스 드롭다운(`.slash-menu` 재사용) (2) **DbBadge** 신규 칩("DB에서 채움", AiBadge와 구분 색, mono 다크 대비) (3) "마스터에 저장" 체크박스+`saveMsg` (4) `/editor/sakes` 페이지(세그먼트 토글·검색바·인라인 에디터) (5) 헤더 nav 링크.
- **Interaction**: typeahead 콤보박스(↑↓ 순환/Enter 픽/Esc, 하이라이트 없을 때 Enter=AI), DB-픽 권위형 채움, 마스터 저장 토글, 탭 전환, 행 선택→인라인 편집, 삭제 `confirm()`, 409 blocking 메시지.
- **A11y**: 콤보박스 `role=combobox/listbox/option`+`aria-expanded`+`aria-activedescendant`(TagInput 검증 패턴). 세그먼트 토글 `role=tablist`/`aria-selected`. **모든 버튼 가시 bg/border**(persona). `focus-visible`. DbBadge/AiBadge 대비비. 터치 ≥44px. 삭제=명시 confirm(조용한 파괴 금지).

## Risks / Escalation

1. **사케 이름 매칭/중복** — v1 = 정규화(NFKC+trim+collapse+lower) 매칭. `UNIQUE(brewery_id,name_norm)`는 **NULL brewery에서 distinct** → 양조장 없는 동명 사케 중복 허용(v1 accept, `ponytail:` 주석). 퍼지/로마자 매칭·병합 툴 = 추후. 표기 흔들림(獺祭45 vs 獺祭 純米大吟醸45)은 서로 다른 사케로 취급 = 정상. 에스컬레이션: 중복 급증 시 병합 툴 별도 과제.
2. **posts frontmatter ↔ 마스터 = 값-복사 스냅샷(링크 아님)**. posts는 자족 frontmatter가 SSOT(빌드 시 DB 무관) → autofill/DB-픽은 값을 frontmatter로 복사, 라이브 링크 없음. 마스터 편집이 발행 글을 소급 변경 안 함(정확 — 불변 스냅샷). persona "복사 대신 FK"는 **사케→양조장**(제조자 정규화)에 적용, post→마스터는 의도적 값-복사(글 자족).
3. **SQL injection** — 신규 CRUD/검색 전부 파라미터 바인딩 + `likeEscape` 정확 리터럴. Arch C 필수.
4. **FK 미강제**(codebase `PRAGMA foreign_keys` 미설정) — 양조장 삭제 409 가드로 orphan 방지(null화 아님).
5. **base SHA / worktree** — `dc2eb1b`에서 생성 + reset + merge-base 검증.
6. **stale 로컬 서버(4322)** — 기동시각 vs mtime 대조, 재기동 사용자 게이트.
7. **in-memory 세션**(기존) — 재시작=재로그인. 신규 위험 아님.

## Escalation Log
_(none)_

---

# Phase 2 UI/UX 결정 (UI/UX Master 리뷰 — NO-CONFLICT, 통합 확정)

핵심 원칙: **Provenance 3색 규율** — 초록(`.badge.ok` #7fff9f)=DB 확정(「마스터」 DbBadge), primary=AI 채움·확인요망(기존 AiBadge), amber=수치 「추정」. 신규 색/의존성/모션 0, 기존 어휘(.slash-menu/.tag-ac-menu/.post-table/.row/.muted) 재사용.

## MUST (D2/D3 게이트)
- **콤보박스(D2)**: TagInput(fields.tsx L23-91) 키보드/ARIA 패턴 정확 미러 + debounce 250ms, `open = !dismissed && q.length>=1 && candidates.length>0`, 클라 `.slice(0,8)` cap, 픽=`applyDbPick`(리뷰 우회), Enter에 하이라이트 없으면 AI 실행, 검색 실패 무음(드롭다운 안 열림). 옵션 `id` + 입력 `aria-activedescendant` + `aria-controls` 추가(플랜 A11y 요구 해소).
- **DbBadge(D2)**: 초록 「마스터」 칩(`#7fff9f`/`#2a4a32`, title="마스터 DB에서 확정 채움"). badge 우선순위 db→ai. DB 픽 후 AI 버튼은 outline 유지, 기존 `isEmpty` 디폴트-체크가 채워진 필드 자동 언체크(신규 로직 0).
- **마스터 저장(D2)**: actions `space-between`, 좌측 체크박스(AI-소스 기본 on, `query.trim()` 빈값 disabled). `onApply(patch)` 선행 → upsert는 best-effort(실패해도 apply 롤백 X). saveMsg 3분기: created→「마스터에 추가됨」/ updated→「기존 마스터 갱신됨」/ 실패→「마스터 저장 실패 — 글은 정상 저장됩니다」(.tasting-ai__error 슬롯). DB-픽 경로엔 체크박스 없음(재저장 무의미).
- **관리 페이지(D3)**: role=tablist 세그먼트 토글(.seg-toggle — 가시 bg, active=--elevated, 모바일 44px/flex:1) · 검색 2변수(searchInput+appliedQuery, Enter/버튼만, 리셋은 appliedQuery 있을 때만 노출·둘 다 클리어) · **클라이언트 필터**(react-query 키 `['sakes']`/`['breweries']` 쿼리 미포함, includes 필터 name/brewery, mutation 시 invalidate) · 단일 컬럼 마스터-디테일(검색바 아래 에디터 패널, 행 클릭/+추가) · 저장 `dirty && name.trim()` 아니면 disabled · 삭제 destructive 좌측 분리 · 사케 confirm / 양조장 confirm→409 catch→blocking 메시지 「이 양조장은 사케 N개가 참조 중이라 삭제할 수 없습니다...」 · 빈 상태 data-empty(「아직 등록된 사케가 없습니다...」) ≠ search-empty(「'q' 검색 결과가 없습니다」) 구분 · data-testid: sakes-tab-sake/sakes-tab-brewery/sakes-row-{i}/sakes-search-input/sakes-search-submit/sakes-search-reset/sakes-add-button/sakes-editor-name-input/sakes-editor-save/sakes-editor-delete/sakes-editor-cancel.
- **행 위계(D3)**: 사케 행 = `.post-cat`(양조장) + `.post-title`(이름) + `.slash-hint`(特定名称·정미보합%), `.row-active`(--elevated) 편집중 표시. 양조장 행 = name + region muted.
- **헤더 nav(D3)**: brand→/posts 링크 + `.app-nav`에 NavLink 「글」(/posts)·「사케」(/sakes) — active pill(--elevated). 모바일 44px.

## SHOULD
콤보 후보 행에 양조장·特定名称 muted 부기 / 8개+ 절단 footer 「검색어를 좁히세요」 / saveMsg 초록·muted 컬러 / `.seg`·`.nav-link` focus-visible outline / 검색 클라 필터(위 MUST에 승격 반영).

---

# v1.1 증분 (2026-07-07 사용자 추가 요구) — brand 복원 + 요미가나 + 8×8 매트릭스

## 요구 (사용자 정정 반영)
1. **요미가나 입력** — 가변 텍스트 3종만: **술이름 / 양조장 / 브랜드**. 타입이 정해진 필드(tokuteiMeisho 등 enum)는 제외. 스코프: 블로그 카드까지.
2. **`brand`(銘柄) 필드 복원** — 최초 요구사항에 있었으나 v1 계약에서 누락된 것을 확인 (rough plan 전달 사고의 잔여). 예: 브랜드 獺祭 / 양조장 旭酒造 / 술이름 獺祭 純米大吟醸 45.
3. **아마카라/농담 매트릭스 5×5 → 8×8.**

## 확정 계약 델타 (전 선언 사이트 전사 — 이 표가 SSOT)

### 신규 필드 (6개)
| 필드 | 타입 | 위치 |
|------|------|------|
| `brand` | string (銘柄) | zod(optional) · Frontmatter · Sake(nullable) · SakeInput · AI schema(nullable) · CANONICAL · Card Props · DB **sakes.brand TEXT** · 폼/관리페이지 |
| `yomigana` | string (히라가나, 술 이름 읽기) | zod · Frontmatter · Sake · SakeInput · AI schema · CANONICAL · Card Props · DB sakes.yomigana TEXT |
| `brandYomigana` | string (브랜드 읽기) | zod · Frontmatter · Sake · SakeInput · AI schema · CANONICAL · Card Props · DB **sakes.brandYomigana TEXT** |
| `breweryYomigana` | string (양조장 읽기) | zod · Frontmatter · AI schema · CANONICAL · Card Props · DB **breweries.yomigana TEXT** (GET sakes join이 `b.yomigana AS breweryYomigana` 반환) · BreweryInput.yomigana |

### 스케일 변경 (구 -2..2 폐기)
- `amakara`: **int 1..8** (1=甘口 ↔ 8=辛口), `noutan`: **int 1..8** (1=淡麗 ↔ 8=濃醇). zod `.int().gte(1).lte(8)`, AI schema `integer 1..8 | null`.
- 카드 점 공식: `left=(amakara-1)/7*100%`, `top=(8-noutan)/7*100%` (濃醇 위). figcaption/리드아웃 = `甘辛 n/8 · 濃淡 m/8` (5단계 일본어 라벨 폐기, 4극 라벨 유지).
- 피커: 8×8=64셀 radiogroup, 셀 aria-label `甘辛 n/8 · 濃淡 m/8`, roving tabindex/쌍-커밋/해제 유지. max-width ~360px (모바일 375px에서 셀 ≥40px).

### 서버 델타 (D-s: editor/server/*)
- **DB 마이그레이션**: 테이블이 이미 존재할 수 있음(테스트 런이 .data/blog.db에 생성) → `CREATE TABLE IF NOT EXISTS`만으로 부족. **PRAGMA table_info 검사 후 없으면 `ALTER TABLE ... ADD COLUMN`** (멱등): sakes.brand / sakes.yomigana / sakes.brandYomigana / breweries.yomigana.
- sake.ts: brand/yomigana/brandYomigana를 SakeInput/upsert COALESCE/PUT full-replace에 포함. `resolveBreweryId(name, yomigana?)` — found 시 yomigana 제공되면 COALESCE UPDATE, create 시 포함. 검색 LIKE 대상 확장: sakes = `name_norm | yomigana | brand(정규화) | brandYomigana`, breweries = `name_norm | yomigana` (전부 바인딩+ESCAPE).
- index.ts TASTING_SCHEMA: brand/yomigana/brandYomigana/breweryYomigana string|null 추가, amakara/noutan 1..8, 시스템 프롬프트에 「요미가나는 히라가나, 모르면 null / brand=銘柄 / amakara·noutan 1..8 정수」 반영.

### 에디터 델타 (D-c: editor/src/*)
- api.ts: 타입 확장 (Sake.brand/.yomigana/.brandYomigana, Brewery.yomigana, Frontmatter/TastingAutofill Pick에 brand/yomigana/brandYomigana/breweryYomigana).
- FrontmatterForm: tasting 블록에 brand/yomigana/brandYomigana/breweryYomigana Input 4개(브랜드·읽기류는 컴팩트 배치) · applyDbPick objective 키 7→11 (brand/yomigana/brandYomigana/breweryYomigana 추가) · AI 리뷰 행 추가(수치 아님 — 「추정」 뱃지 없음) · 마스터 저장 payload에 포함 · 콤보 후보 행 부기에 yomigana 표시(있으면).
- AmakaraNoutanPicker: 8×8 (위 스펙).
- SakesPage: 사케 에디터에 brand/yomigana/brandYomigana, 양조장 에디터에 yomigana.
- TastingNoteCardNode CANONICAL: 11→15 props (brand/yomigana/brandYomigana/breweryYomigana 추가).

### 블로그 델타 (D-b: blog/*)
- content.config.ts: brand/yomigana/brandYomigana/breweryYomigana 추가, amakara/noutan 1..8.
- TastingNoteCard.astro: 리드 = `<ruby>` 양조장(breweryYomigana 있으면 rt) + tokuteiMeisho 뱃지 유지 · 스펙 dl에 `銘柄`(brand, brandYomigana ruby)와 `読み`(yomigana) 행 추가(값 있을 때만) · 점 공식/figcaption 8×8.
- dassai-45.mdx: brand 獺祭 / brandYomigana だっさい / breweryYomigana あさひしゅぞう / yomigana(술이름 읽기) 추가, amakara -1→3, noutan -1→3, CANONICAL 배선 15 props.

### 마이그레이션 노트
기존 실사용 데이터 없음(샘플 1건, 마스터는 스크래치만). 구 -2..2 값은 샘플 리매핑으로 종결. zod가 구 값을 빌드 에러로 잡음 = 안전망.

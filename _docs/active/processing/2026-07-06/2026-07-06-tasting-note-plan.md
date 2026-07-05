---
status: processing
created: 2026-07-06
topic: tasting-note
base: fix/blog-hydration-418 @ cf51e44
team: Leader + Arch-FE + Arch-BE + Arch-C(advisory) + UIUX(Phase 2) + 4 Designers + 2 Testers
mode: /team-run (autonomous)
---

# 시음 노트(Tasting Note) 블로그 카테고리 — 통합 확정 플랜

> Status: Processing (Phase 3)
> 원칙: **music 카테고리 정확 미러 = 통일성 우선.** 신규 npm 의존성 0. 계약(필드명)은 이 문서의 Contract 표가 SSOT — 모든 선언 사이트가 이 표를 전사(transcribe)한다.

## Task Description (원문)

blog 카테고리 중 하나로 tasting-note를 만들고 싶어. 종류는 니혼슈/위스키/맥주/기타주류로 두고 우선 니혼슈만 디테일하게, 나머지는 추후에. 테이스팅 노트 구성: (1) 술 정보/스펙 — 이름·양조장·브랜드·쌀/효모/물·제법·정미보합·종류·특정명칭·주도/산도·알콜, AI API로 자동 채움. (2) 향기/맛 노트 — tag autocomplete + 아마카라(甘辛)/농담(濃淡) 2D 그래프 위치 선택. (3) 감상 — 자유 입력. 1·2번만 컴포넌트로 신경 쓰면 됨. editor(TipTap)와 blog(Astro) 모두 처리.

## 확정 결정 요약 (미결 항목 전부 확정)

| 미결 항목 | 확정 | 근거 |
|-----------|------|------|
| **카테고리 값** | frontmatter `category: Tasting` | 라이브 콘텐츠 4종(`Diary`/`Game`/`Music`/`Web`) 전부 Capitalized 단어 → 통일. 게이트는 기존대로 `.toLowerCase()`. |
| **디렉토리** | `blog/src/content/blog/tasting/` | 폴더 컨벤션 = 소문자(music/diary/game/web). |
| **컴포넌트 경로** | `blog/src/components/Blog/TastingNote/TastingNoteCard.astro` | 오케스트레이터 강제. 사용자 용어 'tasting-note' 반영. |
| **drinkKind** | `z.enum(['nihonshu','whisky','beer','other']).optional()` **유지** | 사용자 명시 요구("종류는 니혼슈/위스키/맥주/기타주류"). cross-review의 "단일값 YAGNI 컷"은 rough plan 미전달 오판 → **기각**. nihonshu만 상세, 나머지 예약. |
| **tiptap 식별자** | node type `tastingNoteCard`, 파일 `TastingNoteCardNode.tsx` | musicCard↔MusicCard 대칭(JSX `<TastingNoteCard>` → node `tastingNoteCard` → `TastingNoteCardNode.tsx`). music 선례 정확 미러. |
| **cover(표지 이미지)** | **v1 제외** | MusicCardNode CANONICAL이 실제로 cover를 미배선함(전수 검증). 진짜 미러 + `.article-entry img{height:auto}` 전역 함정(MEMORY.md) 회피. 병 사진은 fast-follow. |
| **casing** | `seimaiBuai`, `nihonshuDo` (camelCase) | 기존 컴파운드 필드 전부 camelCase(`releaseYear`/`appleMusicUrl`/`lyricsType`). cross-review 합의. |
| **alcohol** | 추가, AI-창작-금지 수치군 편입 | 사케 표준 스펙(15–16%). BE 누락 → 보완. seimaiBuai/nihonshuDo/sando/alcohol = 4대 실측 수치. |
| **flavorTags autocomplete** | **유지** — `TagInput` `suggestions` 확장 + `nihonshuFlavors.ts` | 사용자 명시 요구. 저장=**ko 라벨**(slug 저장 안 함). |
| **2D 피커** | **유지** — FE 5×5 그리드(int −2..2) | 사용자 명시("2차원 그래프에서 선택"). BE의 슬라이더 대체 기각. |
| **AI autofill** | **이번 스코프 포함** (fast-follow 이연 기각) | 사용자 명시 요구 + 이번 런 끝까지 구현. Designer 4명으로 흡수. |
| **tokuteiMeisho 순서** | 등급 내림차순(아래 §Contract) | 3중 drift 방지: form 배열을 export된 `TokuteiMeisho` 유니온에서 `satisfies`로 파생. |
| **autofill 응답 형태** | flat null-stripped 객체 (`{fields,filled}` 봉투 컷) | 서버 null-strip 후 남은 키 = AI 채운 키. `filled`는 `Object.keys(res)`와 동치 = 중복. |
| **autofill req** | `{ query }` (drinkKind는 서버에서 nihonshu 하드코딩) | v1 엔드포인트는 nihonshu 전용. |
| **content.config.ts 소유** | BE 확정 zod → D1이 그대로 전사 | BE = 계약 SSOT, D1 임의 개선 금지. |

## Scope

- **지금(nihonshu 상세):** Contract 11필드, blog 정적 카드, editor 입력(node/slash/form/picker/flavors), AI autofill(엔드포인트+UI). 감상(3번) = MDX 본문 prose, 손댈 것 없음.
- **추후(별도 PR):** whisky/beer/other 상세 필드 — 지금은 `drinkKind` enum 값만 예약, 카드는 `drinkKind==='nihonshu'` 게이트로 nihonshu 섹션만 렌더. cover(병 사진), flavorTags 카테고리 그룹핑 드롭다운.

---

## Contract (SSOT — 모든 선언 사이트가 이 표를 전사)

카테고리 게이트: frontmatter `category: Tasting`(gate `.toLowerCase()==='tasting'`). 액체 종류: `drinkKind`. 아래 스펙 필드는 **`drinkKind==='nihonshu'`에서만 의미**.

| 필드 | 타입 | 범위/값 | AI창작 | 설명 |
|------|------|---------|--------|------|
| `drinkKind` | `enum` | `nihonshu`⏐`whisky`⏐`beer`⏐`other` | 서버 하드코딩 | 액체 종류(4종 예약, nihonshu만 상세) |
| `brewery` | `string` | — | 허용 | 양조장(酒蔵) |
| `tokuteiMeisho` | `enum`(9) | 아래 9값 | 허용(enum 강제) | 特定名称 |
| `riceType` | `string[]` | — | 허용 | 원료미(酒米, 블렌드 가능) |
| `seimaiBuai` | `number` int | 0–100 | **금지** | 정미보합 % |
| `alcohol` | `number` | ≥0 | **금지** | 도수 % |
| `nihonshuDo` | `number` | 부호허용, 무클램프 | **금지** | 일본주도(SMV), 예 +3/−2 |
| `sando` | `number` | ≥0 | **금지** | 산도(酸度), 예 1.4 |
| `amakara` | `number` int | −2..+2 | 허용(관능) | 甘辛 X축: −2 甘 ↔ +2 辛 |
| `noutan` | `number` int | −2..+2 | 허용(관능) | 濃淡 Y축: −2 淡麗 ↔ +2 濃醇 |
| `flavorTags` | `string[]` | ko 라벨 | 허용(ko라벨) | 향미 태그 |

**tokuteiMeisho 9값 (확정 순서 — form/type/zod 동일):**
`純米大吟醸` · `大吟醸` · `純米吟醸` · `吟醸` · `特別純米` · `特別本醸造` · `純米` · `本醸造` · `普通酒`

**전역 규칙:**
- **AI 창작 절대 금지 수치군 = `seimaiBuai`/`alcohol`/`nihonshuDo`/`sando`.** 공식 실측값을 확신하지 못하면 반드시 `null`(→ 서버 null-strip → 미반환).
- **null → frontmatter 키 생략.** zod `.optional()`은 undefined만 허용(null 불가) → editor는 null/빈값을 frontmatter에 쓰지 않는다.
- 표지 이미지 없음(v1). `<img>` 미사용 → `.article-entry img` 함정 무관.

### 최종 zod (content.config.ts blog 스키마 `lyricsType` 줄 뒤에 추가, 전부 `.optional()`, 기존 라인 수정 0)

```ts
    // ── tasting note (category: 'Tasting') ──
    drinkKind: z.enum(['nihonshu', 'whisky', 'beer', 'other']).optional(),
    brewery: z.string().optional(),
    tokuteiMeisho: z
      .enum(['純米大吟醸', '大吟醸', '純米吟醸', '吟醸', '特別純米', '特別本醸造', '純米', '本醸造', '普通酒'])
      .optional(),
    riceType: z.array(z.string()).optional(),
    seimaiBuai: z.number().int().gte(0).lte(100).optional(),
    alcohol: z.number().gte(0).optional(),
    nihonshuDo: z.number().optional(),
    sando: z.number().gte(0).optional(),
    amakara: z.number().int().gte(-2).lte(2).optional(),
    noutan: z.number().int().gte(-2).lte(2).optional(),
    flavorTags: z.array(z.string()).optional(),
```

### editor api.ts 타입 (zod와 field-for-field 수동 병렬 — 코드젠 아님, 핸드오프 시 파리티 검증 필수)

```ts
export type TokuteiMeisho =
  | '純米大吟醸' | '大吟醸' | '純米吟醸' | '吟醸'
  | '特別純米' | '特別本醸造' | '純米' | '本醸造' | '普通酒';

// Frontmatter에 추가 (lyricsType 뒤):
//   drinkKind?: 'nihonshu' | 'whisky' | 'beer' | 'other';
//   brewery?: string; tokuteiMeisho?: TokuteiMeisho; riceType?: string[];
//   seimaiBuai?: number; alcohol?: number; nihonshuDo?: number; sando?: number;
//   amakara?: number; noutan?: number; flavorTags?: string[];

// autofill 결과 (서버 null-strip → present-or-absent):
export type TastingAutofill = Partial<Pick<Frontmatter,
  'brewery' | 'tokuteiMeisho' | 'riceType' | 'seimaiBuai' | 'alcohol'
  | 'nihonshuDo' | 'sando' | 'amakara' | 'noutan' | 'flavorTags'>>;
```

---

## AI Autofill 계약 (전문)

**엔드포인트:** `POST /editor-api/generate/tasting` (기존 `/editor-api/*` default-DENY 미들웨어 하위 → 세션 자동 게이팅, 추가 인증작업 0)

**Request:** `{ "query": string }` — 사케명(선택적으로 `"양조장 - 사케명"`). drinkKind는 요청에 없음(서버가 nihonshu 하드코딩).

**Response 200:** flat 객체, 서버가 `null`/`''`/`[]` 키 제거 후 **확신 키만** 반환 (augment-only). 예:
```json
{ "brewery": "旭酒造", "tokuteiMeisho": "純米大吟醸", "riceType": ["山田錦"], "seimaiBuai": 50, "alcohol": 16, "amakara": 1, "noutan": -1, "flavorTags": ["리치·백도향", "키레(산뜻한 후미)"] }
```

**Error:** `400` query 누락 · `401` 미인증(미들웨어) · `502` OpenAI upstream · `503` `OPENAI_API_KEY` 미설정 · `504` 20s 타임아웃 · `500` JSON 파싱 실패.

**서버 구현 요점 (`editor/server/index.ts`, `/generate` 라우트 미러):**
- OpenAI `chat/completions` raw fetch(기존 패턴, SDK 미도입), `model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'`.
- `response_format: { type: 'json_schema', json_schema: { name: 'tasting_nihonshu', strict: true, schema } }`.
- strict 규칙(Context7 확인): `additionalProperties:false`, 전 키 `required`, nullable = `type:['x','null']`, nullable enum = enum 배열에 `null` 포함.
- system prompt(요지): "너는 일본 사케 데이터 어시스턴트다. 확실히 아는 정보만. **seimaiBuai/alcohol/nihonshuDo/sando는 공식 실측값을 확신 못 하면 절대 창작 말고 null.** amakara(−2甘~+2辛)/noutan(−2淡麗~+2濃醇)는 관능 인상 정수, 모르면 null. tokuteiMeisho는 9값 중 하나 또는 null. **flavorTags는 한국어 라벨로 출력**(리뷰 패널이 nihonshuFlavors 어휘와 dedup)."
- `signal: AbortSignal.timeout(20000)` → catch 시 504.
- **null-strip = 환각 가드, 위치 = 서버.** 순수함수 `stripNulls(raw)`로 추출(단위테스트 대상): `v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)`.

**[MUST-3] 클라이언트 `autofillTasting`은 숫자 status 노출 (D2 `api.ts` — 공용 `req<T>` 사용 금지):**
- 기존 공용 `req<T>`는 에러를 문자열로만 throw → 502/503/504 분기 불가. `autofillTasting`은 **자체 `fetch`**로 구현하거나, status를 `.status`로 실은 에러 객체를 throw해 호출자(D3)가 분기 가능하게 한다.
- FE 사용자 문구(D3 소비): `503`「AI가 설정되지 않았습니다(API 키 없음)」· `502`「AI 서버 오류」· `504`「응답 20초 초과」· `500`「응답 해석 실패」. `401`은 기존 로그인 바운스 재사용.

**[MUST-4] 환각 가드 UX 3종 (D3 `FrontmatterForm`):**
- **인라인 리뷰 패널**(모달 금지, 즉시-커밋 금지). `api.autofillTasting(query)` → present 키만 표시, 사용자 채택 시에만 `set()`.
- **사용자 기입 필드는 「현재값 → 제안값」 표기 + 기본 체크 해제**(augment-only). 빈 필드 제안은 기본 체크 가능.
- **수치 4종(seimaiBuai/alcohol/nihonshuDo/sando)에 「추정」 뱃지 + caveat 문구.** flavorTags 채택 = 기존 태그와 **union 병합**(중복 제거).
- 적용 필드 옆 「AI 채움 · 확인 요망」 로컬 뱃지(비영속). 에러 시 부분 write 0.
- **[SHOULD]** query = post title 프리필 + 편집 가능 · 버튼 `variant="outline"` + lucide `Sparkles`(이모지 금지).

---

## CANONICAL serialize (전문 — 라운드트립 무손실, `TastingNoteCardNode.serialize`가 매 저장 시 재발행)

MusicCardNode 정확 미러(atom marker, 데이터는 frontmatter). **cover 없음. camelCase. drinkKind 포함**(카드 게이트용).

```
<TastingNoteCard
  drinkKind={frontmatter.drinkKind}
  brewery={frontmatter.brewery}
  tokuteiMeisho={frontmatter.tokuteiMeisho}
  riceType={frontmatter.riceType}
  seimaiBuai={frontmatter.seimaiBuai}
  alcohol={frontmatter.alcohol}
  nihonshuDo={frontmatter.nihonshuDo}
  sando={frontmatter.sando}
  amakara={frontmatter.amakara}
  noutan={frontmatter.noutan}
  flavorTags={frontmatter.flavorTags}
/>
```

**라운드트립 배선 (music와 동형):**
- `editor/server/mdx.ts` `modeledNode`: `if (node.name === 'TastingNoteCard') return { name: 'TastingNoteCard' };`
- `editor/server/mdx.ts` `IMPORTS`: `TastingNoteCard: "import TastingNoteCard from '@/components/Blog/TastingNote/TastingNoteCard.astro';",`
  → `manageImports` 정규식 `<${n}[\s/>]`이 `<TastingNoteCard` 자동 감지(특수처리 불필요, 일반 JSX 태그).
- `RichEditor.tsx` lift: `else if (s.node?.name === 'TastingNoteCard') content.push({ type: 'tastingNoteCard' });`
- `SlashCommand.tsx`: `{ title: '시음 노트', hint: '🍶', types: ['tasting'], run: ({editor,range}) => editor.chain().focus().deleteRange(range).insertContent({ type: 'tastingNoteCard' }).run() }`

## Card 렌더 (blog, 정적) — D1 (Phase 2 반영)

- **순수 Astro, 아일랜드 아님**(MusicCard 미러). scoped `<style>`, 별도 css 파일 없음. 색상은 shadcn CSS 변수만 → 다크모드 자동. 하드코딩 색 금지.
- **[MUST-1] 2D 점 색 = `--primary`. `--accent` 금지** — 이 테마 다크모드 `--accent`(240 3.7% 15.9%) == `--border` 동일값(global.css:34,70 실측)이라 점이 격자/축선과 구분 불가.
- 게이트: `drinkKind === 'nihonshu'`. 값 있는 것만: 스펙 목록 + flavor 칩 + amakara/noutan 2D 좌표(정적, JS 0). amakara·noutan **둘 다 있을 때만** 2D 렌더(partial 미표시).
- 좌표 매핑: X = 甘(좌)→辛(우), Y = 濃醇(상)→淡麗(하). amakara/noutan −2..+2 → 퍼센트 배치.
- **strict tsc 함정:** specs 배열 `.filter(Boolean)`는 narrowing 실패 → `s.label` 접근 에러. **타입 프레디킷 필터**(`.filter((s): s is Spec => Boolean(s))`).
- 축 라벨(카드·picker 공용): `AMAKARA = ['甘口','やや甘口','中口','やや辛口','辛口']`(idx=value+2) · `NOUTAN = ['濃醇','やや濃醇','中程度','やや淡麗','淡麗']`(idx=2−value).
- **[SHOULD] 시각 형태(Designer 재량, 권장):** 사케명 재출력 금지(post title이 이미 H1) — 리드 = brewery + tokuteiMeisho 뱃지 · 스펙은 `<table>` 아닌 `<dl>` · 라벨 = 일본어 주 + 한국어 gloss(muted) · flavorTags 칩 = `<span>` h-7(hover 없음, CTA와 구분) · 2D 맵 = 25셀 격자 아닌 **crosshair 좌표평면 + 퍼센트 배치 점**(`aspect-ratio:1`, max-width:15rem) + `<figcaption>`.

## AmakaraNoutanPicker (editor, 신규 인터랙티브 — 신규 의존성 0) — D3 (Phase 2 반영)

- 5×5 = 25 선택지, 값→좌표 = 카드와 동일(X 甘→辛, Y 濃醇→淡麗).
- **[MUST-2] ARIA = `role="radiogroup"`(컨테이너) + 25 `role="radio"` + `aria-checked`.** grid 아님 — `role="grid"`는 `role="row"` 래퍼 5개를 강제(비대화)하고 단일선택 시맨틱을 오독시킴. roving tabindex 유지(선택 radio만 `tabIndex=0`, 미설정 시 중앙). 컨테이너 `aria-label`(축 의미), 각 radio `aria-label`=좌표 라벨, `aria-live="polite"` 낭독. 색만으로 구분 금지(라벨 병기).
- **포인터:** `onPointerDown` set + 드래그(pointer capture, `onPointerEnter` while pressed). 컨테이너 `touch-action:none`.
- **키보드:** `ArrowLeft/Right`→amakara ∓/±1(clamp −2..2), `ArrowUp/Down`→noutan ±/∓1(위=+). Del/Esc = 선택 해제.
- 스타일 → `styles-custom.css .amakara-noutan-picker`.
- **[SHOULD] (Designer 재량, 권장):** 4극 라벨만 시각 노출(甘口/辛口/濃醇/淡麗, 5단계 라벨은 aria/리드아웃 전용) · 중앙 crosshair · 「선택 해제」 버튼 · **쌍-커밋 모델**(amakara·noutan 둘 다 있어야 hasValue, partial 미표시) · 셀 ≥44px, max-width 280px.

## nihonshuFlavors.ts (editor, 신규 향미 어휘)

- `export const NIHONSHU_FLAVORS: { slug: string; label: string; category: string }[]` — 카테고리 그룹(긴죠향/꽃/쌀곡물/유제품/견과카라멜/숙성/산미/감칠맛/질감후미 등 ~50항목).
- **저장은 `label`(ko)** — slug은 React key/dedup/향후 확장용 내부 보존. TagInput `suggestions`는 `NIHONSHU_FLAVORS.map(f => f.label)`.
- v1 드롭다운은 flat(카테고리 그룹핑 UI는 Phase 2 UIUX 향상 항목으로 flag).

---

## Designer 파일 할당 (4명, **파일 겹침 0**)

| Designer | Worktree | 파일 (절대경로 생략, repo-relative) | 의존 |
|----------|----------|--------------------------------------|------|
| **D1 — Blog 렌더** | wt-tasting-blog | `blog/src/content.config.ts`(zod 전사) · `blog/src/components/Blog/TastingNote/TastingNoteCard.astro`(신규) · `blog/src/content/blog/tasting/<sample>.mdx`(신규, smoke) | Contract 표 |
| **D2 — Editor 노드·라운드트립·계약** | wt-tasting-editor-core | `editor/src/lib/api.ts`(Frontmatter+TokuteiMeisho+TastingAutofill+`autofillTasting` fn) · `editor/src/tiptap/TastingNoteCardNode.tsx`(신규) · `editor/src/tiptap/SlashCommand.tsx` · `editor/src/components/RichEditor.tsx` · `editor/server/mdx.ts` · `editor/server/mdx.test.ts`(신규, 라운드트립+manageImports+MusicCard 회귀) | Contract 표 |
| **D3 — Editor 입력 UI** | wt-tasting-editor-form | `editor/src/components/FrontmatterForm.tsx`(tasting 블록 전체 = drinkKind Select + nihonshu 필드 + picker + tag inputs + **autofill 버튼/리뷰 패널**) · `editor/src/components/fields.tsx`(TagInput `suggestions`/`placeholder`) · `editor/src/components/AmakaraNoutanPicker.tsx`(신규) · `editor/src/lib/nihonshuFlavors.ts`(신규) · `editor/src/styles-custom.css`(`.tasting-note-node` + `.amakara-noutan-picker`) | D2의 `api.ts` 타입·`autofillTasting` |
| **D4 — AI autofill 서버** | wt-tasting-ai | `editor/server/index.ts`(`/generate/tasting` 라우트 + `stripNulls` export) · `editor/server/autofill.test.ts`(신규, `stripNulls` 순수함수 단위테스트) | autofill 계약(§) · api.ts 계약 shape |

**겹침 0 검증:** content.config.ts·TastingNoteCard.astro·sample.mdx(D1) / api.ts·TastingNoteCardNode.tsx·SlashCommand.tsx·RichEditor.tsx·mdx.ts·mdx.test.ts(D2) / FrontmatterForm.tsx·fields.tsx·AmakaraNoutanPicker.tsx·nihonshuFlavors.ts·styles-custom.css(D3) / index.ts·autofill.test.ts(D4). **어떤 파일도 두 번 등장하지 않음.**

**클래스명 계약(파일 겹침 없이 크로스 참조):** D2의 `TastingNoteCardNode` NodeView className `tasting-note-node` ↔ D3의 `styles-custom.css .tasting-note-node`. (D2는 className만 사용, 스타일은 D3 소유.)

**병합 순서 (types→backend→frontend→tests):**
1. **D1 ∥ D2** 병렬 착수(둘 다 Contract 표만 의존). D1은 완전 독립(blog 앱).
2. **D2 병합 후 → D3 ∥ D4.** D3는 `api.ts` 타입/`autofillTasting` import, D4는 `mdx.ts`(테스트 import) + `api.ts` 계약 shape 의존.
3. 최대 4 worktree(캡 5 이내). D2가 임계경로.

---

## Test Results (Phase 4 기입 예정)

**Tester 1 — editor 단위/통합 (`bun test`):**
- `editor/server/mdx.test.ts`(D2 작성): `segmentMdx('<TastingNoteCard .../>')` → `{name:'TastingNoteCard'}` 마커 확인 · `manageImports` import 1줄 정확 주입/미사용 시 미주입 · **MusicCard 회귀 동시 확인**(같은 코드경로).
- `editor/server/autofill.test.ts`(D4 작성): `stripNulls({seimaiBuai:null, brewery:'', flavorTags:[], amakara:1})` → `{amakara:1}`만 남는지 assert.

**Tester 2 — blog 렌더 + 환각가드 스모크:**
- `bunx astro check`(신규 zod 필드) + `bunx eslint .`(net-new 게이트).
- TastingNoteCard 렌더 스모크: 스펙 테이블/2D 점/칩 표시, drinkKind 게이트, 다크모드 대비.
- **환각 가드 수동 스모크(persona 하드라인):** ① 유명 사케명 → 수치가 근거 있을 때만 채워지고 모르면 null인지 · ② **가짜/무명 사케명 → seimaiBuai/alcohol/nihonshuDo/sando 전부 null**(수치 창작 0) 전수 확인. → `test-scenario-doc`로 체크리스트화 권장.

**검증 태도(persona):** "됐다"는 저장→재로드 후 라운드트립 배선 동일까지. 네트워크 200/UI 성공만으로 인정 X — .mdx 파일 영속 확인.

## Security Review (Phase 5 — Architect C, 항상 소집)

Phase 1 판정 = **advisory(신규 공격면 없음), 블로킹 아님.** Phase 5 필수 재검:
- **XSS:** brewery/riceType/flavorTags/tokuteiMeisho가 카드에 렌더 → Astro `{expr}` 기본 이스케이프, **`set:html` 미사용** 확인(low).
- **SSRF:** autofill이 OpenAI 호출, URL 고정(`api.openai.com`), 사용자 입력은 message body만 → SSRF 아님.
- **비용/남용:** 인증된 사용자의 OpenAI 호출 비용 노출 = 기존 `/generate`와 **동일 위험 프로파일**(신규 아님). 20s 타임아웃으로 hung-connection 완화. 레이트리밋은 기존 `/generate`와 함께 검토(advisory).
- **시크릿:** `OPENAI_API_KEY` 서버 전용, 클라이언트 미전송 확인.
- **환각 가드(데이터 무결성):** null-strip 서버 위치 + strict json_schema + 수치 창작 금지 프롬프트 3중. Architect C가 프롬프트/스키마 최종 검토.

## Risks / Escalation

1. **AI 수치 환각**(seimaiBuai/alcohol/nihonshuDo/sando) — 하드라인. 가드 3중(strict schema nullable + "무근거=null" 프롬프트 + 서버 null-strip) + 리뷰패널 확정 UX. **에스컬레이션:** 가짜 사케명 스모크에서 수치 창작 1건이라도 관측 → Phase 1 복귀, web_search grounding(Responses API) 승격 판단. (현재는 근거 없어 미도입 — YAGNI.)
2. **필드명 계약 드리프트**(6개 선언 사이트: zod/api.ts/CANONICAL/Astro Props/form/autofill schema). SSOT=Contract 표. casing 1글자 어긋나면 값 silent drop → 카드 행 영구 누락. 핸드오프 시 파리티 검증 스텝 필수.
3. **MDX 라운드트립** — fieldless marker 규율. 노드가 attrs를 들면 깨짐. MusicCardNode 정확 미러(cover 미배선 포함).
4. **2D 피커 접근성**(키보드/터치/ARIA/44px) — UIUX Master 소유(Phase 2). 최대 미지수.
5. **strict tsc** — 카드 specs `.filter(Boolean)` narrowing → 타입 프레디킷 필수.
6. **베이스 트리** — worktree 생성 전 `cf51e44` 클린 확인.
7. **신규 의존성 0 유지** — picker=네이티브 pointer+CSS+ARIA, autocomplete=기존 TagInput 확장, test=`bun test` 내장. 라이브러리 도입 금지.
8. **server↔flavor 어휘 결합**(ponytail): D4 프롬프트가 ko 라벨 출력하되 nihonshuFlavors 정확 미러는 best-effort(리뷰패널이 라벨 dedup). 서버가 vocab 파일을 import하지 않음 — 과결합 회피.

## Phase 2 UI/UX 결정 (UIUX Master 리뷰 — CONFLICT 3건, 계약/스키마/엔드포인트 불변)

판정: 렌더/ARIA/에러배선 수정만 → Phase 1 복귀 불요. 아래 MUST는 D1/D2/D3 명세에 이미 반영(각 섹션 [MUST-n] 표기).

**MUST (반영 완료):**
1. 카드 2D 점 색 `--primary` (`--accent` 금지 — 다크모드 `--border`와 동일값). → Card 렌더 [MUST-1].
2. AmakaraNoutanPicker ARIA `radiogroup`/`radio`/`aria-checked` (grid 아님). → Picker [MUST-2].
3. `autofillTasting` 숫자 status 노출(공용 `req<T>` 미사용) + FE 503/502/504/500 문구 구분. → Autofill [MUST-3].
4. 환각 가드 UX 3종(인라인 리뷰 패널·사용자 필드 기본 체크 해제·수치 4종 「추정」 뱃지) + flavorTags union 병합. → Autofill [MUST-4].

**SHOULD (Designer 재량 — 각 섹션에 기입):** 카드 시각 형태(dl/crosshair/일본어+ko gloss) · 피커 4극 라벨+쌍커밋+선택해제 · autofill query 프리필+Sparkles 버튼.

**SHOULD — flavorTags autocomplete (D3 `fields.tsx` TagInput):** draft **≥1자에만** 드롭다운 오픈(빈 포커스 dump 금지 → 카테고리 그룹핑 불필요, v1 flat 확정) · 기존 `.slash-menu` 시각 언어 재사용 · ArrowUp/Down + Enter/Escape · 자유 입력 보존.

## Escalation Log
_(none)_

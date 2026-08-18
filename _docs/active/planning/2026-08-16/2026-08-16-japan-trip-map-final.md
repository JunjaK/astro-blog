# 최종 구현 계획 — japan-trip-map

> v1(ECharts안) + v2(D3안) 병합본. **2026-08-17 재결정: 라이브러리는 d3-geo 로 통일** (아래 D1).
> 이 문서의 모든 파일 경로·시그니처·버전은 실제 코드베이스와 대조해 확인했다.
> 확인하지 못한 값은 `[미확인]` 으로 표시했고 9절에 모아뒀다. **추측값은 넣지 않았다.**

## 0. 인접 기능 — `interactive-travel-map` (별개 기능, 데이터·렌더링 코어를 공유)

→ [`reference/travel-map`](../../../reference/travel-map/2026-08-18-travel-map.md) (설계 스펙 + 구현 계획 + 저작 가이드 통합본, 2026-08-18).
**구현 완료** — 브랜치 `feat/travel-map`, diary 7편 적용(`14_12-10`, `22_12-18` ~ `27_12-23`).

**둘은 별개 기능이다.** (저자 확인) 단 2026-08-17 재결정으로 **데이터·GeoJSON·렌더링 코어를 공유**하게 됐다.

| | `interactive-travel-map` | 이 계획 |
|---|---|---|
| 범위 | diary 글 하나 = **그날 방문한 곳만** | playground 1페이지 = **여태 간 곳 전부** |
| 위치 | 각 diary 본문 `### 루트` 자리 | `/playground/japan-trip-map` |
| 라이브러리 | d3-geo + d3-shape (React-owned SVG) | **동일 + `d3-zoom`** (팬/줌만 추가) |
| 축척 | 그날 spots 의 bbox 에 fit | 일본 전국 |
| 인터랙션 | 클릭 → 본문 앵커 스크롤 | 클릭 → Dialog |

렌더링 대상(도(道) 단위 개요 vs 시(市) 단위 루트)과 인터랙션은 여전히 다르지만, **투영·경로·마커·다크모드 처리는 같은 코드다.**

### ✅ 착수 순서 확정 (저자 결정)

1. **`interactive-travel-map`** — 일기별 인터랙티브 지도 (그날 방문지만)
2. **이 계획** — playground 종합 지도 (여태 간 곳 전부)

**이 순서가 이 문서의 데이터 설계를 바꾼다.** 1번이 각 diary MDX에 `export const spots = [...]` 를 심고, 그 타입이 좌표를 들고 있기 때문이다:

```ts
// 확정본 — reference/travel-map §2
export type DiarySpot = {
  name: string;
  lat: number;             // ← 좌표가 여기 들어온다
  lng: number;
  city: string;            // ← 이 계획의 도시 그룹핑 키
  prefecture: PrefectureName;  // ← 이 계획의 도도부현 레이어 근거
  description?: string;
  anchor?: string;         // 본문 스크롤용. playground는 미사용
  mapUrl?: string;         // 원문 구글맵 단축 URL
};
```

**결과: 4절의 본문 파싱과 9절 1번(좌표 23개 조사)이 불필요해진다.** playground는 28편의 `spots` 를 집계만 하면 된다.

### ⚠️ 1번 착수 시 반드시 반영할 것 — `DiarySpot` 에 도시 필드 추가

기존 스펙 **결정 6번**은 `방문한 곳` bullet list를 **삭제**한다. 그런데 도시·도도부현 정보는 거기에만 있다:

```
- 히로시마현 후쿠야마시     ← 도시/도도부현. 삭제 대상
  - 잇코쿠사키가케도우      ← spot. DiarySpot 으로 이관
  - 토모노우라
```

현재 `DiarySpot` 에는 도시 필드가 없다. **그대로 삭제하면 이 계획의 도도부현 레이어(4.2b)와 도시 marker 그룹핑이 근거를 잃는다.**

→ **1번 구현 시 `DiarySpot` 에 도시/도도부현 필드를 추가할 것.** 지금 넣으면 필드 하나지만, 28편을 다 작성한 뒤에 넣으면 전수 재작업이다.

```ts
export type DiarySpot = {
  name: string;
  lat: number;
  lng: number;
  city: string;         // 예: '후쿠야마시'  ← 추가
  prefecture: string;   // 예: '히로시마현'  ← 추가
  description?: string;
  anchor?: string;
};
```

이러면 `방문한 곳` 을 지워도 정보 손실이 0이고, 이 계획은 4절 파싱 없이 집계만 하면 된다.

**만약 이 필드 추가가 거부되면** 4.1c의 「1회 생성 후 커밋」 경로로 폴백한다 — `방문한 곳` 이 지워져도 커밋된 매핑은 살아있다. 다만 8.1의 2번(drift 감지)은 그 시점에 비활성화해야 한다.

### ✅ 2026-08-17 — 1번 기능의 디테일 확정. 이 계획이 받는 것이 늘었다

1번이 구현 완료됐다 → [`reference/travel-map`](../../../reference/travel-map/2026-08-18-travel-map.md). 이 계획에 직접 영향을 주는 확정 사항:

- **`city` / `prefecture` 필드 채택 확정** (위 요구가 받아들여졌다). `mapUrl` 도 추가돼 원문의 구글맵 단축 URL 이 보존된다
- **대상이 `japan-around-trip` 27편으로 확정.** 원안은 `25-01-tokyo` 2편만이라 이 계획의 전제가 성립하지 않았다. `14_12-10` 파일럿 → 나머지 복제
- **데이터 위치 = `blog/src/data/diarySpots/{slug}.ts` 편당 파일.** MDX 인라인이 아니므로 이 계획은 그냥 import 로 집계한다. `import.meta.glob` 로 MDX named export 를 긁을 필요가 없다
- **4.2 의 `DIARY_CITIES` 수작업 큐레이션이 불필요해진다.** spots 의 `city` 를 집계하면 나온다. 4.2 표는 교차검증용으로만 남긴다
- **`방문한 곳` 목록은 지우되 `<TravelMap>` 이 spots 에서 다시 렌더한다.** 즉 화면상 정보는 유지되지만 **본문 텍스트는 사라지므로 8.1 의 2번(본문 재파싱 drift 감지)은 성립하지 않는다.** 1번이 편마다 「삭제 직전 1회 대조」를 수행하고 통과 로그를 커밋에 남기는 방식으로 대체한다

*(참고: 기존 impl-plan은 "Astro 5" 기준이었고 현재 `astro@7.2.0` 이다 — 재작성본에서 갱신 완료)*

## 1. 목표

`/playground/japan-trip-map` 페이지 추가.

- d3-geo 로 일본 지도 렌더링 (React-owned SVG)
- `japan-around-trip` diary 28편에서 대표 도시를 추출해 marker 표시
- marker 클릭 → Dialog에서 해당 도시의 diary 목록과 블로그 링크 표시

## 2. 확정 결정

### D1. 지도 라이브러리 = d3-geo + d3-shape + d3-zoom **[2026-08-17 재결정]**

**기존 결정(ECharts 6.1.0)을 뒤집는다.** 1번 기능의 디테일이 확정되면서 두 기능이 GeoJSON 출처·property·도도부현 매핑까지 공유하게 됐고, 그 상태에서 ECharts 를 유지하는 비용이 이득을 넘었다.

| 후보 | 판단 |
|---|---|
| **d3-geo + d3-shape (+ d3-zoom)** | **채택.** 이미 설치된 `d3@^7.9.0` 의 서브패키지다. 실측 gzip: `d3-geo` 13.1KB · `d3-shape` 7.7KB · `d3-zoom` 3.5KB = **~24KB**. React 가 SVG 를 소유하므로 접근성·다크모드가 공짜다 |
| ~~ECharts 6.1.0~~ | **기각(재결정).** ① canvas 렌더러라 DOM 노드가 없어 `role="button"`·`tabIndex`·키보드 조작이 원천 불가 — SVG 렌더러로 바꿔도 그 DOM 은 ECharts 소유다 ② 테마가 JS 객체라 `.dark` + CSS 변수 체계 밖 → 테마 구독 + `setOption` 재호출 기계가 붙는다 ③ `lines` 의 `curveness` 는 두 점 사이 호 하나라 N개 경유지 catmull-rom 이 없다 → `custom` 시리즈 + `d3-shape` 를 결국 같이 쓰게 된다 ④ 번들이 자릿수 단위로 크다(미설치라 이 저장소에서 실측 불가) |
| Leaflet | 기각. 타일 서버 runtime 의존이 새로 생기고, 이 페이지는 경로/영역 표현이 목적이라 실사 타일이 불필요하다. 타일 없이 GeoJSON 만 쓰면 d3-geo 의 무거운 버전일 뿐이다. `ehime-brewery-map` 작업기에 적어둔 「줌 컨트롤·툴팁·attribution 이 Astro/Tailwind 바깥이라 따로 다크로 맞춰야 했다」가 그대로 재현된다 |

**포기하는 것:** ECharts `roam` 이 주던 팬/줌은 `d3-zoom` 으로 직접 짠다(~30줄). 이 하나를 위해 위 4가지를 감수하지 않는다.

**남는 반례:** playground 의 목적이 「안 써본 라이브러리 전시」라면 ECharts 채택 자체가 값이다(`d3-playground`·`uplot`·`live2d`·`zorn-test` 처럼). 저자는 그 이유보다 재사용·접근성을 택했다.

### D2. 데이터 구조 = 하드코딩 최소화

**하드코딩하는 것은 두 개뿐이다.**
1. `slug → cityId` (28줄, 사람이 큐레이트)
2. `cityId → 좌표` (유니크 도시 수만큼)

title·날짜·URL은 **content collection에서 빌드 타임 도출**한다. diary를 추가하면 지도에 자동 반영되고, 누락되면 4절 검증에서 빌드가 멈춘다.

## 3. 검증된 코드베이스 사실

| 항목 | 실제 값 |
|---|---|
| playground 라우트 | `src/pages/playground/[...slug].astro` — 동적. mdx만 추가하면 라우트 생성됨 |
| playground 스키마 | `src/content.config.ts`: `title`(필수), `duration`(필수 string), `thumbnail`·`techStacks`·`description`(옵션) |
| ProjectInfo | `src/components/Project/ProjectInfo.astro` — **`frontmatter: ProjectInfo` prop 필수.** 없으면 `frontmatter.thumbnail` 접근에서 빌드 실패 |
| 기존 mdx 관례 | `<ProjectInfo frontmatter={frontmatter} />` → `## 설명` → `## 작업 내용`, 컴포넌트는 `client:visible` |
| Dialog | `src/components/ui/dialog.tsx` 존재 (`@radix-ui/react-dialog@^1.1.23`) |
| React | `react@^19.2.8` — 19 전용 API 사용 가능 |
| 기타 설치됨 | `framer-motion@^12.43.0`, `d3@^7.9.0` (`d3-geo` 13.1KB / `d3-shape` 7.7KB / `d3-zoom` 3.5KB gzip — 실측) |
| 1번이 이미 만든 것 | `blog/public/geo/muni/{code}.json` 16개 478KB (도도부현별 시정촌 경계), `blog/scripts/split-muni-geojson.mjs` |
| diary 라우트 | `src/pages/blog/[...slug].astro` |
| 패키지 매니저 | bun (`bun.lock`) |

## 4. 데이터 설계 — 여기가 핵심

### 4.1 tags를 도시 키로 쓸 수 없다 (v2안 기각 근거)

v2는 `tags` 에서 도시를 도출하려 했다. **실제 tags를 전수 확인한 결과 불가능하다.**

```
25_12-21  ['일본','여행','아키하바라','스타벅스 리저브','아자부다이 힐즈','카니지고쿠']
          → 도시 태그 없음. '일본 일주' 태그조차 없음
28_12-24  ['일본','여행','일본 일주','일주 마지막']          → 도시 없음
01_intro  ['일본','여행','일본 일주']                        → 도시 없음
```

추가로:
- **표기 불일치**: `니이가타 시` / `아키타 시` / `아오모리시` / `히로사키시` / `센다이시` / `센다이` — 「시」 접미사와 띄어쓰기가 제각각
- **도시·랜드마크·음식·행사가 섞여 있음**: `센소지` `시부야` `히츠마부시` `히다규` `키리탄포` `봇치 전시회` `참치 해체쇼` `니혼슈`

→ **tags는 보조 신호로도 쓰지 않는다.**

### 4.1b 진짜 데이터 원천은 본문 `### 방문한 곳` 이다

**28편 중 27편이 본문에 `### 방문한 곳` 섹션을 갖고 있다** (없는 것은 `01_intro` 하나뿐 — 인트로라 장소가 없는 게 정상이다). 총 54개 항목, 유니크 지역 44개.

포맷이 구조적이다:

```
- 후쿠이현 후쿠이시
- 이시키와현 카나자와시
- 도쿄도 아사쿠사 — 센소지, 산짱 요코쵸 홋피거리점
- 나가노현 나카노시
```

`{도도부현} {시/구/쵸}` + 선택적 ` — {세부 장소}`. **도도부현이 앞에 붙는다는 점이 결정적이다** — GeoJSON이 도도부현 단위라 이름 매칭만으로 방문 지역을 칠할 수 있다. 좌표가 필요 없다.

**단, 그대로 파싱하면 안 된다. 실제 결함이 있다:**

| 결함 | 실제 값 | 비고 |
|---|---|---|
| **헤딩 레벨 불일치** | `02_11-28` 만 `## 방문한 곳`, 나머지 26편은 `###` | 파서가 `###` 만 잡으면 **히로시마현이 통째로 누락된다** (실제로 겪음) |
| **세부 항목 표기 2종** | `— 세부, 세부` (인라인) vs 중첩 `  - 세부` (하위 불릿) | 둘 다 존재 |
| 오타 | `이시키와현` (4건) | → 이시카와현 |
| **도도부현 오기** | `이시키와현 토야마시` | 토야마시는 **도야마현** 소속 |
| 접미사 불일치 | `아이치현 나고야` vs `아이치현 나고야시` | |
| 도도부현 누락 | `마츠시마`, `센다이시`, `나리타` | 앞에 현이 없음 |
| 일본 아님 | `인천` | 귀국편 |

**좌표 단서:** 세부 항목 일부에 Google Maps 단축 URL이 들어있다 (`https://maps.app.goo.gl/...`). 리다이렉트를 따라가면 좌표가 나온다 → 9절 1번의 유력한 원천. 다만 도시 좌표가 아니라 개별 가게 좌표이므로 그대로 쓰지 말 것.

→ **파싱을 런타임/빌드 의존으로 두지 않는다.** 아래 4.2 방식으로 간다.

### 4.1c 채택 방식 — 1회 생성 후 커밋

| 안 | 판단 |
|---|---|
| (a) 빌드 타임에 본문 파싱 | 기각. 산문 구조(`### 방문한 곳` 제목)에 결합된다. 제목을 바꾸면 조용히 깨진다 — `ehime-brewery-map` 에서 「스타일 클래스를 JS 훅으로 쓰다 조용히 죽은」 것과 같은 결 |
| (b) 순수 수작업 큐레이션 | 기각. 원천이 있는데 손으로 옮길 이유가 없다 |
| **(c) 스크립트로 1회 생성 → 사람이 교정 → 커밋. 검증 스크립트가 재파싱해 drift 감지** | **채택.** 생성은 일회성, 산출물은 안정적, 결함 5종은 교정 단계에서 잡는다 |

대신 title도 깨끗하므로(01·28 제외 전부 도시명 포함) 생성 결과의 **교차 검증용**으로 쓴다.

### 4.2 slug → cityId 큐레이션

**규칙 변경 — 대표 도시 1개가 아니라 방문 도시 전체를 담는다.**

`02_11-28` 은 「히로시마현 후쿠야마시」와 「오카야마현 오카야마시」 **두 곳**을 방문한다. 하루 1도시로 강제하면 정보가 날아가고, 「이동일은 도착지」 같은 주관적 판단이 끼어든다. 본문이 이미 방문 도시를 나열하고 있으므로 그대로 받는다.

```ts
DIARY_CITIES: Record<string, CityId[]>   // 1편 → N도시
```

- **marker** = 전체 diary에서 등장한 유니크 도시
- **Dialog(도시 X)** = `X ∈ DIARY_CITIES[slug]` 인 모든 diary

이러면 v1의 「marker = unique city, Dialog = diary 목록」 구조는 그대로 유지되면서 판단 개입이 사라진다.

아래 표는 title 기준 초안이며, **실제 값은 본문 `방문한 곳` 에서 생성**한다(4.1c). 표는 생성 결과 교차검증용이다.

| slug | title 근거 | cityId |
|---|---|---|
| `01_intro` | 도시 없음 → **첫 방문 도시에 귀속** | `fukuyama` ✅ 확정 |
| `02_11-28` | 본문: 히로시마현 후쿠야마시 / 오카야마현 오카야마시 | `fukuyama`, `okayama` |
| `03_11-29` | 오카야마, 오사카 | `osaka` |
| `04_11-30` | 아마노하시다테 | `amanohashidate` |
| `05_12-01` | 이네노후나야, 아마노하시다테 | `ine` |
| `06_12-02` | 쓰루가시, 후쿠이시 | `fukui` |
| `07_12-03` | 후쿠이, 카나자와 | `kanazawa` |
| `08_12-04` | 카나자와 | `kanazawa` |
| `09_12-05` | 카나자와, 토야마 | `toyama` |
| `10_12-06` | 나고야 | `nagoya` |
| `11_12-07` | 나고야, 이누야마 | `inuyama` |
| `12_12-08` | 다카야마 | `takayama` |
| `13_12-09` | 다카야마, 시라카와고 | `shirakawago` |
| `14_12-10` | 히다후루카와, 히라유 | `hirayu` |
| `15_12-11` | 마쓰모토, 스와 | `matsumoto` |
| `16_12-12` | 아즈미노, 나가노 | `nagano` |
| `17_12-13` | 스노우 몽키 파크, 나카노, 시부온센 | `shibuonsen` |
| `18_12-14` | 니이가타 | `niigata` |
| `19_12-15` | 니이가타 | `niigata` |
| `20_12-16` | 아키타 | `akita` |
| `21_12-17` | 가쿠노타테, 후로후시 온천 | `kakunodate` |
| `22_12-18` | 후로후시 온천 | `furofushi` |
| `23_12-19` | 히로사키시, 아오모리시 | `aomori` |
| `24_12-20` | 아오모리에서 도쿄로 | `tokyo` |
| `25_12-21` | 도쿄 여행 | `tokyo` |
| `26_12-22` | 센다이 | `sendai` |
| `27_12-23` | 마쓰시마 해안 | `matsushima` |
| `28_12-24` | 나리타 공항 → 인천 공항 (본문) | `tokyo` ✅ 확정 |

**확정 사항 (저자 확인):**
- `25_12-21` → `tokyo`. tags에는 도시가 없지만 title과 본문(아키하바라·아자부다이)이 도쿄다
- `28_12-24` → `tokyo`. 본문 방문지가 「나리타 공항 → 인천 공항」. 나리타는 치바현이지만 **도쿄권 출국편**이라 도쿄 marker에 귀속한다
- `01_intro` → **남은 결정 1건.** 28편 중 유일하게 `### 방문한 곳` 이 없고 title에도 도시가 없다. 선택지: (a) 지도에서 제외 (b) 출발지에 귀속 (c) 지도 밖 「시작」 링크로 별도 표시

### 4.2b 도도부현 레이어 (좌표 불필요)

본문에서 도출되는 도도부현 **16곳** (상위 항목 56건 기준):

```
히로시마현 · 오카야마현 · 오사카부 · 교토부 · 후쿠이현 · 이시카와현 · 도야마현 · 아이치현
기후현 · 나가노현 · 니이가타현 · 아키타현 · 아오모리현 · 도쿄도 · 미야기현 · 치바현
```
*교정 내역: `이시키와현`→이시카와현(오타), `이시키와현 토야마시`→도야마현(오기), `센다이시`·`마츠시마`→미야기현(누락), `나리타`→치바현(누락), `인천` 제외(일본 아님)*

**히로시마현은 `02_11-28` 한 곳에만 나오고 그 파일만 헤딩이 `##` 다.** 파서를 `###` 로 좁히면 이 현 하나가 통째로 사라진다 — 8.1의 7번 체크가 이걸 잡는다.

**이 레이어는 좌표가 전혀 필요 없다.** GeoJSON feature의 도도부현 이름(`N03_001`, 일본어)과 문자열 매칭만 하면 된다 → 방문한 도도부현 `<path>` 에 다른 fill 클래스를 주는 것으로 끝난다. 별도 series 개념이 없다.

city marker는 그 위에 얹는 **2차 레이어**다. 즉 좌표를 못 구하거나 검증에 실패해도 **지도 자체는 성립한다.** 좌표 리스크가 전체 실패에서 부분 실패로 내려간다.

GeoJSON의 도도부현 표기는 일본어(`石川県`)다 — **2026-08-17 실물 확인.** 한글↔일본어 매핑은 1번 기능의 `blog/src/components/Blog/TravelMap/prefectures.ts` (`{ code, ja }`) 를 import 해 쓴다. 테이블을 두 벌 만들지 않는다.

### 4.3 타입

`blog/src/components/Playground/JapanTripMap/japanTripCities.ts`

```ts
// 하드코딩 대상 1 — 도시 좌표
type CityId =
  | 'okayama' | 'osaka' | 'amanohashidate' | 'ine' | 'fukui'
  | 'kanazawa' | 'toyama' | 'nagoya' | 'inuyama' | 'takayama'
  | 'shirakawago' | 'hirayu' | 'matsumoto' | 'nagano' | 'shibuonsen'
  | 'niigata' | 'akita' | 'kakunodate' | 'furofushi' | 'aomori'
  | 'tokyo' | 'sendai' | 'matsushima';

interface CityGeo {
  readonly nameKo: string;
  readonly lng: number;
  readonly lat: number;
}

export const CITY_GEO = {
  // 좌표는 [미확인] — 9절 참조. 반드시 출처를 확인해 채울 것.
} satisfies Record<CityId, CityGeo>;

// 하드코딩 대상 2 — diary 귀속
export const DIARY_CITY = {
  // 4.2 표 그대로
} satisfies Record<string, CityId>;
```

collection에서 도출되는 쪽:

```ts
interface DiaryRef {
  slug: string;
  title: string;
  created: string;   // frontmatter 필드명은 date 아님. created 다
  url: string;       // `/blog/diary/japan-around-trip/${slug}`
}

interface MapCity extends CityGeo {
  id: CityId;
  diaries: DiaryRef[];
}
```

`CityGeo` 를 `extends` 로 확장한다 — 필드를 다시 쓰지 않는다.

## 5. GeoJSON

> **[2026-08-17 갱신]** 1번 기능이 [`smartnews-smri/japan-topography`](https://github.com/smartnews-smri/japan-topography) 를 채택했다 (국토수치정보 N03 가공, 상용 무상, 국토교통성 크레딧 의무). 이 계획의 도도부현 레이어도 같은 저장소 `data/municipality/geojson/s0001/prefectures.json`(317KB) 을 쓰는 것이 기본이다 — property 표기(`N03_001`)와 매핑 테이블을 공유한다. 아래 후보 목록은 그 판이 200KB 목표에 안 맞을 때의 대안으로 남긴다.

**출처 후보 (전부 실재 확인):**

| 출처 | 비고 |
|---|---|
| [dataofjapan/land](https://github.com/dataofjapan/land) `japan.geojson` | 도도부현 경계. **라이선스: 地球地図日本(GSI Global Map Japan) 계승 — 비상업 이용 시 출처 표기 의무** |
| [jpn-atlas](https://github.com/biskwikman/jpn-atlas) | TopoJSON, 시정촌/도도부현/국가 3계층. 동일 GSI 원본(2016) |
| [piuccio/open-data-jp-prefectures-geojson](https://github.com/piuccio/open-data-jp-prefectures-geojson) | 도도부현 GeoJSON |

**결정 사항:**
- 배치: `blog/public/geo/japan-pref.json`, runtime `fetch` 후 `d3.geoPath` 로 직접 렌더. `registerMap` 같은 라이브러리 등록 단계가 없다
- 외부 CDN runtime 의존 금지 (저장소에 포함)
- **목표 크기 200KB 이하.** 채택 후보인 `s0001/prefectures.json` 은 317KB 라 그대로는 못 쓴다 → topojson 판을 쓰거나 1번의 `split-muni-geojson.mjs` 처럼 불필요 property 를 털어내고 단순화한다
- **출처 표기를 컴포넌트에 상시 노출한다** (라이선스 의무). 1번의 `.credit` 블록과 같은 문구·같은 위치를 쓴다
- property 필드명은 확인 완료 — `N03_001`(도도부현, 일본어). 9절 2번 참조
- **⚠️ winding 을 반드시 뒤집을 것.** d3-geo 의 ring winding 규약은 GeoJSON 스펙(RFC 7946)과 반대다. 원본을 그대로 쓰면 `geoArea` 가 4π(지구 전체)로 나오고 `geoPath` 가 화면을 덮는 덩어리를 그린다 — 1번 기능에서 실제로 겪었다. `scripts/split-muni-geojson.mjs` 의 `toD3Winding()`(면적 판정 후 반전)을 이 파일 생성에도 그대로 적용한다. 검증 스크립트에 「전 feature 의 `geoArea` < 1 sr」 를 넣어두면 재생성 사고를 잡는다

## 6. 파일 구조

```
blog/
├─ public/geo/japan-pref.json                               (신규, 전국 도도부현)
└─ src/
   ├─ components/Playground/JapanTripMap/                   (신규)
   │  ├─ JapanTripMap.tsx
   │  ├─ JapanCityDialog.tsx
   │  ├─ japanTripCities.ts
   │  └─ buildMapCities.ts        ← collection + diarySpots → MapCity[] 도출
   ├─ content/playground/japan-trip-map.mdx                 (신규)
   └─ utils/validateMapData.ts                              (신규)
```

1번의 `blog/src/components/Blog/TravelMap/` 에서 **`prefectures.ts` 와 `useGeoData.ts` 를 그대로 import** 한다. 복사하지 않는다.

## 7. 컴포넌트

### 7.1 JapanTripMap.tsx

SSR 안전: `client:visible`. d3 서브패키지는 정적 import 로 충분하다 — ECharts 처럼 dynamic import 로 감출 만큼 크지 않고(합계 ~24KB gzip), `window` 를 모듈 로드 시점에 건드리지도 않는다.

```tsx
import { geoMercator, geoPath } from 'd3-geo';
import { zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
```

투영: 전국이므로 1번처럼 spots bbox 가 아니라 **GeoJSON 자체에 fit** 한다.

```ts
const projection = geoMercator().fitExtent([[8, 8], [w - 8, h - 8]], geoJson);
```

팬/줌은 `d3-zoom` 을 컨테이너 `<svg>` 에 붙이고, 변환은 **`<g transform={...}>` 한 겹에만** 적용한다 — 좌표를 매번 다시 투영하지 않는다.

```tsx
const [t, setT] = useState(zoomIdentity);
useEffect(() => {
  const svg = select(svgRef.current);
  svg.call(zoom().scaleExtent([1, 8]).on('zoom', e => setT(e.transform)));
  return () => { svg.on('.zoom', null); };
}, []);
// <g transform={t.toString()}> … 도도부현 path + city marker … </g>
```

**마커 크기 보정:** `<g>` 에 스케일이 걸리면 마커와 선 두께도 같이 커진다. 마커 반지름과 `stroke-width` 는 `/ t.k` 로 나눠 시각 크기를 고정한다 — 안 하면 줌인할수록 점이 화면을 덮는다.

**코드 순서** (CLAUDE.md 규칙): 로컬 state → 파생값 → effect → 핸들러 → JSX.

```tsx
export default function JapanTripMap() {
  // 5. 로컬 state + 파생
  const [selectedCityId, setSelectedCityId] = useState<CityId | null>(null);
  const [transform, setTransform] = useState(zoomIdentity);
  const geo = useGeoData(...);                       // 1번의 훅 재사용
  const cities = useMemo(() => buildMapCities(), []);
  const selectedCity = useMemo(
    () => cities.find((c) => c.id === selectedCityId) ?? null,
    [cities, selectedCityId],
  );

  // 6. 부수효과 — d3-zoom 바인딩 / ResizeObserver
  useEffect(() => { /* zoom 바인딩, cleanup 에서 .on('.zoom', null) */ }, []);

  // 7. 핸들러
  function handleDialogClose() { setSelectedCityId(null); }

  // 8. JSX
  return (<>{/* <svg> + <JapanCityDialog /> */}</>);
}
```

정리(cleanup): unmount 시 `ResizeObserver.disconnect()` + `svg.on('.zoom', null)`. `chart.dispose()` 에 해당하는 것은 없다 — React 가 DOM 을 소유하므로 언마운트로 끝난다.

**접근성:** 1번의 `SpotMarker` 와 같은 규칙을 쓴다 — 각 city marker 는 `role="button"` + `tabIndex={0}` + Enter/Space 로 Dialog 를 연다. canvas 였다면 불가능한 부분이고, D1 재결정의 핵심 이득이다.

**다크모드:** 색은 전부 `hsl(var(--…))` CSS 변수로 잡는다. 테마 토글 시 재렌더가 필요 없다.

**marker 겹침:** 대표 도시로 묶으면 28 → 23개로 줄지만, 다카야마/시라카와고/히다후루카와/히라유는 여전히 인접하다. **1차는 보정 없이 배포하고 실제 화면에서 겹침을 확인한 뒤 대응한다.** 필요해지면 `ehime-brewery-map.mdx` 의 `spreadPoints` 를 이식하되 거기 적힌 두 함정을 지킬 것 — ① 완전히 겹친 두 점은 밀 방향이 없어 NaN이 난다 ② 줌마다 **원래 위경도에서 다시 계산**해야 오차가 안 쌓인다. (`<g transform>` 방식이면 재계산 자체가 없어 ②는 자동으로 피해진다.)

### 7.2 JapanCityDialog.tsx

`src/components/ui/dialog.tsx` 재사용. 도시명 → diary 목록(날짜·제목) → 각 항목에 블로그 링크.

## 8. 검증

### 8.1 데이터 검증 스크립트 (필수)

`blog/src/utils/validateMapData.ts` — `ehime-brewery-map` 의 `check.ts` 방식. **프레임워크 없이 `node`로 직접 실행** (repo에 `ts-node` 없음).

체크 항목:
1. **`japan-around-trip` 의 mdx 28개가 전부 `DIARY_CITY` 에 있는가** ← 가장 중요. 누락 시 지도에서 조용히 사라진다
2. **본문 `### 방문한 곳` 재파싱 결과가 커밋된 매핑과 일치하는가** ← drift 감지 (4.1c). 불일치는 경고로 리포트하되 빌드는 막지 않는다 — 원문에 이미 알려진 결함 5종이 있으므로
3. `DIARY_CITY` 의 모든 `cityId` 가 `CITY_GEO` 에 좌표를 갖는가
4. 모든 좌표가 일본 bbox 안인가 (`[미확인]` — 정확한 범위 확인 후 기입)
5. `cityId` 중복 없음
6. `CITY_GEO` 에 있으나 아무 diary도 없는 고아 도시 없음
7. **도도부현 16곳이 전부 GeoJSON feature에 매칭되는가** ← 4.2b 레이어의 생명줄. 미매칭 1건이라도 실패 처리
8. **`방문한 곳` 헤딩을 레벨 무관(`^#+`)으로 찾는가** ← `02_11-28` 만 `##` 다. `###` 로 좁히면 히로시마현이 조용히 사라진다

`package.json` 에 `"check-map": "node src/utils/validateMapData.ts"` 추가.

### 8.2 Dev 검증 (`bun dev`)

1. `/playground/japan-trip-map` 렌더링
2. `/geo/japan-pref.json` fetch 성공
3. 일본 지도 렌더링
4. marker 표시 (유니크 도시 수만큼)
5. hover tooltip (도시명 + diary 개수)
6. marker 클릭 → Dialog 열림
7. Dialog에 diary 목록 표시
8. diary 링크가 실제 블로그 URL로 이동
9. 창 resize 시 지도 리사이즈
10. **light/dark 양쪽에서 지도 색상이 깨지지 않는지**
11. 팬/줌(`d3-zoom`) 동작 — **줌인 시 마커·선 두께가 같이 커지지 않는지** (`/ t.k` 보정 확인)
12. **marker 겹침 육안 확인** (다카야마 일대)
13. **키보드만으로 marker 포커스 → Enter 로 Dialog 열림** (D1 재결정의 이득 확인)

### 8.3 Build 검증 (`bun run build`)

- playground collection 렌더링 성공
- `/playground/japan-trip-map` 라우트 생성
- `bun run check-map` 통과
- `bun astro check` 0 errors

## 9. `[미확인]` 항목 — 착수 전 확인 필요

1. ~~**도시 좌표 (23개)**~~ — **해소됨.** 0절 순서 확정으로 `DiarySpot.lat/lng` 에서 온다. 도시 좌표는 해당 도시 spots의 중심점으로 계산하면 되고, 별도 조사가 필요 없다. *(1번 기능이 취소되면 이 항목이 부활한다)*
2. ~~**GeoJSON property 필드명과 도도부현 표기 언어**~~ — **해소됨 (2026-08-17, 실물 확인).** 채택 출처 `smartnews-smri/japan-topography` 의 property 는 `N03_001` 도도부현(일본어 `岐阜県`) · `N03_003` 정령시 · `N03_004` 시구정촌 · `N03_007` 행정구역코드. 한글↔일본어 매핑은 1번 기능의 `blog/src/components/Blog/TravelMap/prefectures.ts` (`{ code, ja }`) 를 그대로 쓴다 — **테이블을 두 벌 만들지 않는다**
3. ~~**GeoJSON 실제 파일 크기**~~ — **해소됨.** 전국 시정촌 `s0001/N03-21_210101.json` 1.65MB(1,897 features), 도도부현별 분할 시 15~40KB. 이 계획의 도도부현 레이어는 같은 저장소 `s0001/prefectures.json` **317KB** — 5절의 200KB 목표를 넘으므로 topojson 판 또는 추가 단순화가 필요하다. **라이선스: 상용 포함 무상, 국토교통성 「国土数値情報（行政区域データ）」 표기 의무**
4. **일본 bbox 정확값** — 검증 스크립트 임계값. *(1번의 point-in-polygon 검증이 도도부현 폴리곤 대조라 더 촘촘하다 — 그 방식을 이식하면 bbox 자체가 불필요해진다)*
5. **`01_intro` 귀속 방식** — 4.2 참조. 남은 결정 1건. 1번의 Task 13 에서 함께 정리한다
6. ~~**ECharts 번들 증가량**~~ — **소멸.** D1 재결정으로 ECharts 를 안 쓴다. d3 서브패키지는 실측 완료(~24KB gzip, 신규 의존은 `d3-zoom` 하나)
7. **`japan-pref.json` 단순화 후 크기** — 317KB 후보를 200KB 이하로 줄인 결과. 5절 참조

## 10. 구현 순서

1. `bun add d3-zoom d3-selection` + `bun add -D @types/d3-zoom @types/d3-selection` (`d3-geo`·`d3-shape` 는 1번이 이미 추가)
2. 전국 도도부현 GeoJSON 확보 → 단순화 → `public/geo/japan-pref.json` (200KB 이하 확인)
3. `japanTripCities.ts` — **1번의 `diarySpots/*.ts` 집계로 생성.** 좌표 조사 불필요(9절 1번)
4. `validateMapData.ts` + `check-map` 스크립트 → **여기서 먼저 통과시킨 뒤 컴포넌트 착수**
5. `buildMapCities.ts` — collection + diarySpots 도출
6. `JapanTripMap.tsx`
7. `JapanCityDialog.tsx`
8. `japan-trip-map.mdx` — `<ProjectInfo frontmatter={frontmatter} />` 형태 준수. `techStacks` 에서 `echarts` 를 빼고 `d3` 로
9. 8.2 / 8.3 검증

**4번을 컴포넌트보다 먼저 한다.** 데이터가 틀린 채로 컴포넌트를 만들면 어디가 원인인지 분리가 안 된다.

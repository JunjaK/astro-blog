# Interactive Travel Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** 개정 2026-08-17 — 저자와 디테일 7건 확정 후 재작성. **Task 1~4 완료(미커밋)**

### 진행 상황 (2026-08-17)

| Task | 상태 | 비고 |
|---|---|---|
| 1. GeoJSON 확보·분할 | ✅ | 16개 478KB. **winding 수정 포함 — 아래 참조** |
| 2. 타입 + 도도부현 매핑 | ✅ | `PREFECTURES` 16곳 ↔ geojson 16개 1:1 확인 |
| 3. `useGeoData` | ✅ | `@types/geojson` 실제 타입 사용(`unknown` 제거) |
| 4. `TravelMap` 골격 | ✅ | 기후현 42 features 렌더·라이트/다크 육안 확인 |
| 5. 루트 곡선 + draw-in | ✅ | catmull-rom 렌더 확인. **애니메이션은 구조만 검증, 재생은 미관측** — 아래 |
| 6. 마커 + 툴팁 + 스크롤 + a11y | ✅ | hover/클릭/키보드/엣지플립/리사이즈 전수 확인. **결함 2건 잡음** — 아래 |
| 7. 모바일 two-tap | ✅ | coarse 경로 전수 확인. **원안 전제가 틀려서 방식 교체** — 아래 |
| 8. VisitedList + details + 폴백 | ✅ | **VisitedList 를 별도 export 로 분리** — 아래 |
| 9~13 | ⬜ | |

커밋: `2535dce`(T1) · `9a4efa7`(T2) · `77228b2`(T3) · `fd88837`(T4~7) · `810b5ed`(docs) · `148ac94`(T8).
브랜치 **`feat/travel-map`** (base `518f863`). T4~7 이 한 커밋인 이유는 `TravelMap.tsx` / `travel-map.css`
가 신규 파일이라 네 태스크가 같은 파일에 누적됐기 때문 — 쪼개면 실제로 테스트한 적 없는 중간
상태가 히스토리에 들어간다.

타입체크 베이스라인: `bun astro check` → **15 errors (전부 기존 코드)**. net-new 0 을 유지한다.

### ⚠️ d3-geo winding 함정 (Task 1 에서 발견, 후속 계획도 해당)

**d3-geo 의 ring winding 규약은 GeoJSON 스펙(RFC 7946)과 반대다.** 원본은 스펙대로 외곽 링이 CCW 인데, d3 는 그걸 「이 폴리곤 **바깥** 전부」로 읽는다.

```
高山市 as-is    geoArea 12.566 sr (= 4π, 지구 전체)   → geoPath 가 화면 전체를 덮는 덩어리를 그린다
高山市 reversed geoArea 0.000053 sr ≈ 2,151 km²      → 실제 면적 2,177 km² 와 일치
```

`scripts/split-muni-geojson.mjs` 의 `toD3Winding()` 이 **면적으로 판정해** 4π 를 넘으면 링을 뒤집는다(원본 winding 이 바뀌어도 자기교정). 결과 파일은 「d3 전용」이고 RFC 7946 을 따르지 않는다 — 다른 도구로 열 사람은 이걸 알아야 한다.

같은 함정이 **직접 만든 GeoJSON 에도 적용된다.** `spotsExtent()` 가 사각형을 `Polygon` 이 아니라 `MultiPoint` 로 돌려주는 이유가 이것이다 — 점 집합에는 winding 이 없어서 방향을 틀릴 여지 자체가 없고 bounds 는 동일하다.

검증: 전 16파일 669 features 의 `geoArea` 가 전부 정상 범위, 최대가 高山市 2,166 km²(일본 최대 면적 시).
**Reference spec:** [`interactive-travel-map-plan.md`](./interactive-travel-map-plan.md) (§3 결정표는 이 문서의 §0 결정 로그로 갱신됨)
**후속 기능:** [`japan-trip-map`](./active/planning/2026-08-16/2026-08-16-japan-trip-map-final.md) — 이 기능이 남기는 `spots` 를 집계한다

**Goal:** diary 글 1편의 그날 동선을 인터랙티브 SVG 지도로 렌더하는 `<TravelMap>` 을 만들고, `japan-around-trip` 27편의 구글맵 스크린샷 + `방문한 곳` 목록을 대체한다.

**Architecture:** React island (`client:visible`). D3 는 지리 연산 전용(`geoMercator`, `geoPath`, `line`, `curveCatmullRom`)이고 DOM 은 React 소유. 배경은 시정촌(市区町村) 경계 GeoJSON 을 도도부현 단위로 분할해 `public/geo/muni/{code}.json` 으로 정적 배포하고, 글이 쓰는 현만 fetch 한다. 축척은 **그날 spots 의 bounding box** 에 맞춘다.

**Tech Stack:** Astro 7.2.0, React 19.2, TypeScript, D3 v7 (설치됨), Tailwind 4 + SCSS, Playwright, Bun, Node 24. 모든 경로는 모노레포 분리 이후 기준 — 블로그 코드는 `blog/` 하위다.

**Branch:** `feat/travel-map` 을 만들고 시작한다.

---

## 0. 결정 로그 (2026-08-17 확정 — 원안을 덮어쓴다)

| # | 원안 | 확정 | 사유 |
|---|---|---|---|
| D1 | 25-01-tokyo 2편 마이그레이션 | **`japan-around-trip/14_12-10` 1편 파일럿 → 검증 후 26편 복제.** 도쿄 2편은 후순위 | 원안대로면 `japan-around-trip` 28편에 `spots` 가 안 생겨 후속 계획 0절의 「좌표 해소」 전제가 무너진다. 또 도쿄 편 `방문한 곳` 은 `- 우에노` 처럼 도도부현이 없어 결정 6-A(city/prefecture)가 공회전한다 |
| D2 | 지도 extent = 도도부현/23구 GeoJSON 에 fit | **그날 spots 의 bbox 에 fit** (루트 지도) | 스크린샷을 대체하는 게 목적이다. 도도부현 축척이면 하루가 한 도시 안일 때 점 1개로 뭉쳐 스크린샷보다 정보량이 적어진다 |
| D3 | 배경 = 도도부현 경계 프리셋 레지스트리(`GEO_REGIONS`) | **시정촌 경계, 도도부현 코드로 분할된 파일.** 레지스트리 폐기 | bbox 축척에서 경계선이 보이려면 시정촌 단위여야 한다. 어느 파일을 쓸지는 `spot.prefecture` 가 이미 알려주므로 레지스트리는 중복 |
| D4 | spot = 개별 장소 (원안 유지) | **유지.** ~195건 | D2 의 귀결 |
| D5 | `export const spots` 를 MDX 인라인 | **`blog/src/data/diarySpots/{slug}.ts` 편당 파일**, MDX 는 import | 후속 playground 와 검증 스크립트가 그냥 import 로 읽는다. MDX named export 를 `import.meta.glob` 으로 긁는 경로는 타입이 약하다 |
| D6 | `방문한 곳` bullet list 삭제 (결정 6/6-A) | **spots 가 SSOT, 목록은 `<TravelMap>` 이 spots 에서 렌더** | 중복 0 · 손실 0 으로 결정 6의 「목록 삭제」 요구를 충족한다. `mapUrl` 필드로 원문의 구글맵 링크까지 보존 |
| D7 | 좌표 조사 방법 미정 | **단축 URL 62건은 리다이렉트 해석 스크립트, 나머지 ~130건은 사람이 입력.** 좌표는 절대 생성하지 않는다 | 환각 하드라인. 미입력은 `lat: 0` 으로 두고 검증 스크립트가 빌드에서 잡는다 |

### 원안에서 죽은 항목

- **`rehype-slug` 추가 게이트 (구 Task 1 Step 1b) — 불필요.** 로컬 `dist`(2026-08-15 빌드)와 라이브 양쪽에서 heading id 확인됨: `루트-및-방문한-곳`, `츠키시마-몬쟈-스트리트`, `여행-목적`. 한글 슬러그가 이미 붙는다. `astro.config.mjs` 는 손대지 않는다.
- **`GEO_REGIONS` 레지스트리 / `tokyo-23ku.geojson` / topojson 변환 절차** — D3 으로 대체.
- **오가사와라 제도 대응** — 도쿄도 bbox 가 실제로 위도 24.75~35.90 까지 뻗는 것은 확인했으나(오가사와라촌·미쿠라지마촌·하치죠쵸), bbox fit 에서는 화면 밖이라 처리 불필요. 도도부현 fit 을 되살릴 때만 부활한다.
- `astro.config.mjs` 의 markdown 파이프라인은 Astro 7 에서 `processor: unified({...})` 로 핀 고정돼 있다. 원안의 `remarkPlugins/rehypePlugins` 스니펫은 현재 구조와 맞지 않는다.

### 실측 데이터 규모 (`blog/src/content/blog/diary/japan-around-trip/`, 28편)

| 항목 | 실측 |
|---|---|
| `방문한 곳` 보유 | 27편 (`01_intro` 없음). `##` 1편(`02_11-28`) + `###` 26편 |
| 상위 「{도도부현} {시}」 항목 | 56건 |
| 하위 개별 장소 | 168건 + 인라인형(`— A, B, C`) ~25건. `03_11-29` 은 3단 중첩까지 존재 |
| `maps.app.goo.gl` 단축 URL | 62건 (개별 장소의 약 32%) |
| `### 루트` + 구글맵 스크린샷 | 26편 |

### GeoJSON 출처 (실물 확인 완료)

| 항목 | 값 |
|---|---|
| 저장소 | [`smartnews-smri/japan-topography`](https://github.com/smartnews-smri/japan-topography) — 국토수치정보 N03(행정구역)을 가공한 오픈데이터 |
| 원본 파일 | `data/municipality/geojson/s0001/N03-21_210101.json` — 전국 시정촌, 1,897 features, 1.65MB, 간소화 0.1% |
| property | `N03_001` 도도부현(일본어 `岐阜県`) · `N03_003` 정령시 · `N03_004` 시구정촌 · `N03_007` 행정구역코드 |
| 도도부현별 분할 크기 | 기후 38KB · 도쿄 31KB · 히로시마 31KB · 아오모리 37KB · 이시카와 17KB |
| 라이선스 | 상용 포함 무상. 스마트뉴스 크레딧 불요, **국토교통성 「国土数値情報（行政区域データ）」 표기 의무** |
| 더 정밀한 판이 필요할 때 | 같은 저장소 `s0010`(간소화 1%)에 도도부현별 파일이 이미 있다. 해안이 중요한 편에서 육안 확인 후 그 현만 교체 |

---

## 파일 구조

**신규:**

| 경로 | 책임 |
|---|---|
| `blog/src/components/Blog/TravelMap/TravelMap.tsx` | 메인 컴포넌트. 인터랙션 상태 소유 |
| `blog/src/components/Blog/TravelMap/SpotMarker.tsx` | 번호 dot + glow |
| `blog/src/components/Blog/TravelMap/TravelMapTooltip.tsx` | SVG 위에 뜨는 툴팁 |
| `blog/src/components/Blog/TravelMap/VisitedList.tsx` | spots → 「방문한 곳」 목록 렌더 (D6) |
| `blog/src/components/Blog/TravelMap/types.ts` | `DiarySpot`, `TravelMapProps` |
| `blog/src/components/Blog/TravelMap/prefectures.ts` | 한글 도도부현 → `{ code, ja }` 매핑 |
| `blog/src/components/Blog/TravelMap/useGeoData.ts` | 도도부현 코드 배열 → fetch + 병합 + 세션 캐시 |
| `blog/src/components/Blog/TravelMap/travel-map.css` | 컴포넌트 스타일. **CSS 모듈 아님** — 이 저장소엔 `*.module.*` 사용처가 0이고, 컴포넌트 로컬 스타일 관례는 `DiaryGallery/polaroid-flip.css` 처럼 옆에 둔 평범한 `.css` + 프리픽스(`tm-`)다. 컴포넌트 하나 때문에 스타일 메커니즘을 새로 들이지 않는다 |
| `blog/src/components/Blog/TravelMap/index.ts` | barrel |
| `blog/src/data/diarySpots/14_12-10.ts` | 파일럿 편 spots (이후 편당 1개씩 추가) |
| `blog/public/geo/muni/{code}.json` | 도도부현별 시정촌 경계 (여행 대상 16현만 커밋) |
| `blog/scripts/split-muni-geojson.mjs` | 1회성 — 전국 파일 → 도도부현 분할 |
| `blog/scripts/resolve-map-urls.mjs` | 1회성 — 단축 URL 해석 + spots 초안 생성 |
| `blog/scripts/check-diary-spots.mjs` | 상시 검증 (`bun run check-spots`) |
| `blog/e2e/travel-map.noauth.spec.ts` | Playwright |

**수정:** `blog/src/content/blog/diary/japan-around-trip/14_12-10.mdx` (파일럿) → 검증 후 나머지 26편.

---

## Task 1: GeoJSON 확보 + 도도부현 분할

**Goal:** `public/geo/muni/{code}.json` 을 만든다. 좌표·컴포넌트 작업의 전제.

- [ ] **Step 1: 전국 시정촌 파일 내려받기 (커밋하지 않는다)**

```bash
cd blog
mkdir -p .tmp public/geo/muni
curl -fL -o .tmp/muni-japan.json \
  https://raw.githubusercontent.com/smartnews-smri/japan-topography/main/data/municipality/geojson/s0001/N03-21_210101.json
```

기대: 약 1.65MB. `node -e "console.log(require('./.tmp/muni-japan.json').features.length)"` → `1897`.

- [ ] **Step 2: 분할 스크립트 작성** — `blog/scripts/split-muni-geojson.mjs`

```js
// 전국 시정촌 GeoJSON → 도도부현 코드별 파일.
// 코드는 N03_007(행정구역코드) 앞 2자리를 쓴다. N03_007 이 없는 feature 는 없다고 가정하지 않고 검증한다.
import fs from 'node:fs';
import path from 'node:path';

const SRC = '.tmp/muni-japan.json';
const OUT = 'public/geo/muni';

// 이번 여행이 지나는 도도부현만 커밋한다. 전부 필요해지면 이 배열을 비운다.
const KEEP = new Set(['02', '13', '12', '15', '16', '17', '20', '21', '23', '26', '27', '33', '34', '04', '05', '18']);

const src = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const byCode = new Map();
let missing = 0;

for (const f of src.features) {
  const code = f.properties?.N03_007?.slice(0, 2);
  if (!code) { missing += 1; continue; }
  if (KEEP.size && !KEEP.has(code)) continue;
  if (!byCode.has(code)) byCode.set(code, []);
  // 렌더에 쓰지 않는 property 는 버려 용량을 줄인다
  byCode.get(code).push({
    type: 'Feature',
    properties: { name: f.properties.N03_004 ?? f.properties.N03_003 ?? '' },
    geometry: f.geometry,
  });
}

if (missing) console.warn(`N03_007 없는 feature ${missing}건 — 확인 필요`);

fs.mkdirSync(OUT, { recursive: true });
for (const [code, features] of byCode) {
  const file = path.join(OUT, `${code}.json`);
  fs.writeFileSync(file, JSON.stringify({ type: 'FeatureCollection', features }));
  console.log(`${file}  ${features.length} features  ${(fs.statSync(file).size / 1024).toFixed(0)}KB`);
}
```

- [ ] **Step 3: 실행 + 크기 확인**

```bash
node scripts/split-muni-geojson.mjs
```

기대: 16개 파일, 각 15~40KB. 하나라도 100KB 를 넘으면 그 현만 나중에 단순화 대상으로 기록한다.

- [ ] **Step 4: 라이선스 표기 준비**

`국토수치정보（행정구역데이터）／国土交通省` 크레딧을 지도 하단에 상시 노출한다 (Task 5 에서 컴포넌트에 넣는다). 문구는 링크 포함:
`출처: 国土数値情報（行政区域データ）国土交通省` → `https://nlftp.mlit.go.jp/ksj/`

- [ ] **Step 5: 커밋**

```bash
git add blog/public/geo/muni blog/scripts/split-muni-geojson.mjs
git commit -m "chore(travel-map): add municipality geojson split by prefecture"
```

`.tmp/` 는 커밋하지 않는다 — `.gitignore` 에 없으면 추가한다.

---

## Task 2: 타입 + 도도부현 매핑

**Goal:** 순수 TS. 렌더 없음.

- [ ] **Step 1: `blog/src/components/Blog/TravelMap/types.ts`**

```ts
import type { PrefectureName } from './prefectures';

export type DiarySpot = {
  name: string;
  lat: number;
  lng: number;
  /** 도시/구역. 예: '다카야마시'. 후속 playground 의 도시 그룹핑 키 */
  city: string;
  /** 한글 도도부현. 예: '기후현'. 배경 GeoJSON 선택과 좌표 검증에 쓴다 */
  prefecture: PrefectureName;
  description?: string;
  /** 본문 헤딩 id. 대응 헤딩이 없으면 생략 — 클릭은 무동작이 된다 */
  anchor?: string;
  /** 원문 `방문한 곳` 에 있던 구글맵 단축 URL. 목록 렌더에서 링크로 살린다 */
  mapUrl?: string;
};

export type TravelMapProps = {
  spots: DiarySpot[];
  /** 대체 대상이던 구글맵 스크린샷. <details> 안에 보존한다 */
  originalImageSrc?: string;
  className?: string;
};
```

`geoRegion` prop 은 없다 — 배경은 `spots[].prefecture` 에서 도출한다 (D3).

- [ ] **Step 2: `blog/src/components/Blog/TravelMap/prefectures.ts`**

```ts
// 한글 표기 → { 행정구역코드 2자리, 일본어 표기 }.
// code 는 public/geo/muni/{code}.json 파일명.
// ja 는 이 기능에서는 안 쓰지만, 후속 japan-trip-map 의 전국 도도부현 레이어가
// GeoJSON N03_001(일본어)와 이름 매칭을 해야 해서 같이 둔다 — 매핑을 두 벌 만들지 않는다.
export const PREFECTURES = {
  홋카이도: { code: '01', ja: '北海道' },
  아오모리현: { code: '02', ja: '青森県' },
  이와테현: { code: '03', ja: '岩手県' },
  미야기현: { code: '04', ja: '宮城県' },
  아키타현: { code: '05', ja: '秋田県' },
  후쿠시마현: { code: '07', ja: '福島県' },
  치바현: { code: '12', ja: '千葉県' },
  도쿄도: { code: '13', ja: '東京都' },
  니이가타현: { code: '15', ja: '新潟県' },
  도야마현: { code: '16', ja: '富山県' },
  이시카와현: { code: '17', ja: '石川県' },
  후쿠이현: { code: '18', ja: '福井県' },
  나가노현: { code: '20', ja: '長野県' },
  기후현: { code: '21', ja: '岐阜県' },
  아이치현: { code: '23', ja: '愛知県' },
  교토부: { code: '26', ja: '京都府' },
  오사카부: { code: '27', ja: '大阪府' },
  오카야마현: { code: '33', ja: '岡山県' },
  히로시마현: { code: '34', ja: '広島県' },
} as const;

export type PrefectureName = keyof typeof PREFECTURES;

export function prefectureCodes(names: readonly PrefectureName[]): string[] {
  return [...new Set(names.map(n => PREFECTURES[n].code))];
}
```

여행이 지나지 않는 현은 넣지 않는다 — 필요해질 때 한 줄씩 추가한다. 오타로 `이시키와현` 같은 값이 들어오면 타입 에러로 잡힌다 (원문에 실제로 4건 있던 오타다).

- [ ] **Step 3: barrel `index.ts`**

```ts
export { TravelMap } from './TravelMap';
export { PREFECTURES } from './prefectures';
export type { PrefectureName } from './prefectures';
export type { DiarySpot, TravelMapProps } from './types';
```

`TravelMap` export 는 Task 4 이후에 살아난다. 그 전까지는 타입만 export 한다.

- [ ] **Step 4: `bun astro check`** → 0 errors → 커밋

---

## Task 3: `useGeoData` — 도도부현 다중 fetch + 병합

**Goal:** 코드 배열을 받아 필요한 파일만 받고 하나의 FeatureCollection 으로 합친다. URL 단위 모듈 캐시로 한 세션 재요청을 막는다.

- [ ] **Step 1: `blog/src/components/Blog/TravelMap/useGeoData.ts`**

```ts
import { useEffect, useState } from 'react';

export type GeoFeature = {
  type: 'Feature';
  properties: { name: string };
  geometry: { type: string; coordinates: unknown };
};

export type GeoFeatureCollection = { type: 'FeatureCollection'; features: GeoFeature[] };

type UseGeoDataResult =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: GeoFeatureCollection; error: null }
  | { status: 'error'; data: null; error: Error };

const cache = new Map<string, Promise<GeoFeatureCollection>>();

function load(code: string): Promise<GeoFeatureCollection> {
  const url = `/geo/muni/${code}.json`;
  let entry = cache.get(url);
  if (!entry) {
    entry = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`GeoJSON fetch failed: ${url} ${res.status}`);
      return res.json() as Promise<GeoFeatureCollection>;
    });
    // 실패한 Promise 를 캐시에 남기면 재시도가 영영 안 된다
    entry.catch(() => cache.delete(url));
    cache.set(url, entry);
  }
  return entry;
}

export function useGeoData(codes: readonly string[]): UseGeoDataResult {
  const key = [...codes].sort().join(',');
  const [state, setState] = useState<UseGeoDataResult>({ status: 'loading', data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    Promise.all(key.split(',').filter(Boolean).map(load))
      .then((parts) => {
        if (cancelled) return;
        setState({
          status: 'ready',
          data: { type: 'FeatureCollection', features: parts.flatMap(p => p.features) },
          error: null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: 'error', data: null, error: err instanceof Error ? err : new Error(String(err)) });
      });
    return () => { cancelled = true; };
  }, [key]);

  return state;
}
```

`key` 를 의존성으로 쓰는 이유: 배열 prop 은 매 렌더 새 참조라 그대로 넣으면 무한 fetch 가 된다.

- [ ] **Step 2: `bun astro check`** → 커밋

---

## Task 4: `TravelMap` 골격 — spots bbox 에 fit

**Goal:** 배경 시정촌 경계를 그리고 축척을 그날 동선에 맞춘다. 마커·루트는 아직 없다.

- [ ] **Step 1: 투영 유틸** — `TravelMap.tsx` 상단

```tsx
import { geoMercator, geoPath } from 'd3-geo';

const PADDING = 24;
/** spots 가 한 점에 몰린 날이 지도 전체를 차지하지 않게 하는 최소 폭(도 단위, 약 2km) */
const MIN_SPAN = 0.02;

function spotsExtent(spots: DiarySpot[]) {
  const lngs = spots.map(s => s.lng);
  const lats = spots.map(s => s.lat);
  let [w, e] = [Math.min(...lngs), Math.max(...lngs)];
  let [s, n] = [Math.min(...lats), Math.max(...lats)];

  if (e - w < MIN_SPAN) { const c = (e + w) / 2; w = c - MIN_SPAN / 2; e = c + MIN_SPAN / 2; }
  if (n - s < MIN_SPAN) { const c = (n + s) / 2; s = c - MIN_SPAN / 2; n = c + MIN_SPAN / 2; }

  // 15% 여백 — 가장자리 spot 이 테두리에 붙지 않게
  const mx = (e - w) * 0.15;
  const my = (n - s) * 0.15;
  // Polygon 이 아니라 MultiPoint 다 — winding 함정 회피 (문서 상단 참조). bounds 는 동일하다.
  return {
    type: 'MultiPoint' as const,
    coordinates: [[w - mx, s - my], [e + mx, n + my]],
  };
}
```

`d3-geo` / `d3-shape` 를 서브패키지로 import 한다. `import * as d3 from 'd3'` 를 쓰면 아일랜드 번들에 d3 전체가 들어온다 (`D3Test/LargeBarChart.tsx` 가 그렇게 하고 있지만 그건 플레이그라운드다). 설치 확인:

```bash
cd blog && bun add d3-geo d3-shape && bun add -D @types/d3-geo @types/d3-shape
```

- [ ] **Step 2: 컴포넌트 골격**

```tsx
export function TravelMap({ spots, originalImageSrc, className }: TravelMapProps) {
  // 1. 로컬 state + 파생
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const codes = useMemo(() => prefectureCodes(spots.map(s => s.prefecture)), [spots]);
  const geo = useGeoData(codes);

  const projected = useMemo(() => {
    if (geo.status !== 'ready' || !dims.width || !dims.height || spots.length === 0) return null;
    const projection = geoMercator().fitExtent(
      [[PADDING, PADDING], [dims.width - PADDING, dims.height - PADDING]],
      spotsExtent(spots),
    );
    return { projection, pathGen: geoPath(projection) };
  }, [geo.status, dims.width, dims.height, spots]);

  // 2. 부수효과 — 컨테이너 크기 추적
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDims({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 3. JSX
  return (
    <div className={className}>
      <div ref={wrapperRef} className={styles.wrapper}>
        {geo.status === 'loading' && <div className={styles.loading}>지도 불러오는 중…</div>}
        {geo.status === 'error' && <div className={styles.errorNotice}>지도를 불러오지 못했습니다</div>}
        {geo.status === 'ready' && projected && (
          <svg
            className={styles.svg}
            viewBox={`0 0 ${dims.width} ${dims.height}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="여행 루트 지도"
          >
            <g className="muni">
              {geo.data.features.map((f, i) => (
                <path key={i} d={projected.pathGen(f) ?? ''} className={styles.muniPath} />
              ))}
            </g>
          </svg>
        )}
      </div>
      <p className={styles.credit}>
        출처: <a href="https://nlftp.mlit.go.jp/ksj/" target="_blank" rel="noreferrer">
          国土数値情報（行政区域データ）国土交通省
        </a>
      </p>
    </div>
  );
}
```

**주의:** `fitExtent` 대상이 GeoJSON 이 아니라 `spotsExtent(spots)` 다. 배경은 화면 밖으로 잘려나가는 게 정상이고, SVG 가 알아서 클립한다.

- [ ] **Step 3: 스타일** — `travel-map.css`

**확인된 토큰 (2026-08-17, `global.css` 실물):** shadcn 토큰은 HSL 3값(`--background: 0 0% 100%`)이라 `hsl(var(--x))` 로 감싼다. 사이트 고유 토큰은 hex 라 그대로 쓴다(`--accent-color`: `#059669` 라이트 / `#10b981` 다크).

**이 사이트는 다크 셀렉터가 두 벌이다** — shadcn 토큰은 `.dark` **클래스**, 사이트 토큰(`--accent-color`·`--green-*`·`--text-*`)은 `[data-theme="dark"]:root`. `ModeToggle.tsx` 와 `ThemeInit.astro` 가 둘을 **항상 같이** 세팅하므로 섞어 써도 어긋나지 않지만, 둘 중 하나만 보고 판단하면 안 된다.

```css
.tm-wrapper {
  position: relative;
  width: 100%;
  height: min(45vw, 24rem);
  margin: 1rem 0;
  border-radius: 0.5rem;
  overflow: hidden;
  background: hsl(var(--muted));      /* 바깥(이웃 현·바다) */
}
.tm-svg { display: block; width: 100%; height: 100%; }
.tm-muni {
  fill: hsl(var(--background));       /* 땅 */
  stroke: hsl(var(--muted-foreground) / 0.45);
  stroke-width: 0.75;
}
```

**규칙은 「땅이 바깥보다 밝다」이고, 그 관계가 두 테마에서 같아야 한다.** 그래서 토큰이 테마별로 서로 뒤집힌다 — 스왑 지점을 `--tm-land` / `--tm-void` 두 로컬 변수로 모으고 `.dark .tm-wrapper` 에서만 갈아끼운다.

| | 바깥(`--tm-void`) | 땅(`--tm-land`) |
|---|---|---|
| 라이트 | `--muted` 95.9% | `--background` 100% |
| 다크 | `--background` 3.9% | `--muted` 15.9% |

처음엔 라이트에서 땅을 `--muted`, 바깥을 `--background` 로 뒀는데 흰 바탕에 흰 땅이 돼 형상이 거의 안 보였다(실측). 경계선도 `--border`(명도 90%)는 너무 옅어 `--muted-foreground` 를 45% 투명도로 쓴다.

CSS 변수로만 색을 잡으면 다크모드는 자동 반영된다 — `.dark` 오버라이드 블록을 따로 쓰지 않는다.

**마커 번호 대비 (Task 6 에서 적용):** dot 을 `--accent-color`(녹색)로 칠하고 그 위에 흰 숫자를 얹으면 라이트에서 3.8:1, 다크(#10b981)에서는 더 낮아 WCAG AA 미달이다. `ehime-brewery-map` 작업기에 저자가 같은 결론을 적어뒀다 —「밝은 원에는 어두운 글자가 맞다」. dot 은 `--primary` / 숫자는 `--primary-foreground` 로 두면 양쪽 테마에서 자동 반전되며 19:1 이 나온다. 녹색은 루트 선과 glow 가 담당한다.

- [ ] **Step 4: 수동 확인**

파일럿 편의 좌표가 아직 없다. **대략값을 지어내지 말고** GeoJSON 에서 시정촌 중심점을 뽑아 테스트 좌표로 쓴다 — 파일에서 계산한 실제 값이다.

```bash
node -e "const {geoCentroid}=require('d3-geo');const g=require('./public/geo/muni/21.json');
for (const n of ['高山市','飛騨市','下呂市']) {const f=g.features.find(x=>x.properties.name===n);
const [lng,lat]=geoCentroid(f);console.log(n,lat.toFixed(4),lng.toFixed(4));}"
```

브라우저를 띄우기 전에 **수치로 먼저 검증**한다(더 싸고 정확하다): 위 좌표로 `spotsExtent` → `fitExtent` 를 재현해 ① 모든 spot 이 패딩 박스 안 픽셀로 떨어지는지 ② 남/북 순서가 y 축과 맞는지 ③ 전 feature 가 빈 문자열 아닌 path 를 내는지 ④ 비정상적으로 긴 path(수십만 자)가 없는지 — ④가 winding 사고의 신호다.

그다음 임시 `src/pages/tm-test.astro` 로 육안 확인한다(라이트/다크 두 벌을 한 페이지에 넣으면 한 번에 본다. 다크는 `class="dark" data-theme="dark"` 를 **둘 다** 걸어야 한다). **확인 후 임시 페이지는 반드시 지운다.**

**dev 서버 주의:** 4321 은 다른 프로젝트(`ehime-ken-horoyoi`)가 점유 중일 수 있다. Astro 7 은 dev 를 데몬으로 띄우므로 `bun dev` 가 이미 뜬 인스턴스를 알려준다(관측 시점엔 4322). 남의 서버를 죽이지 말고 `astro dev status` 로 확인부터 한다.

- [ ] **Step 5: 커밋**

---

## Task 5: 루트 path (catmull-rom + draw-in)

- [ ] **Step 1:** `travel-map.css` 에 `.tm-route` + `.tm-route-draw` + `@keyframes tm-route-draw` 추가. 선 색은 `var(--accent-color)` — hex 토큰이라 `hsl()` 로 감싸지 않는다.
- [ ] **Step 2:** `RoutePath` 서브컴포넌트 — `line<DiarySpot>()` + `curveCatmullRom.alpha(0.5)`, `getTotalLength()` 를 CSS 변수 `--tm-route-length` 로 넘겨 800ms draw-in.
- [ ] **Step 3:** `spots.length >= 2` 일 때만 렌더.
- [ ] **Step 4:** 수동 확인 → 커밋

**원안에서 바꾼 것 — dasharray 를 애니메이션하지 않는다.** 원안은 `stroke-dasharray` 를 `var(--route-length)` → `6, 4` 로 보간해 「그려진 뒤 점선이 되는」 효과를 노렸는데, 길이가 다른 dash 리스트 사이 보간이라 중간 프레임이 지저분해진다. 선은 실선으로 두고 `stroke-dashoffset` 만 애니메이션한다. 점선 마감을 원하면 `.tm-route` 에 `stroke-dasharray: 6 4` 한 줄이면 되지만, 그러면 draw-in 과 상충하므로 둘 중 하나만 고른다.

**길이를 재기 전에는 숨긴다.** `getTotalLength()` 는 DOM 에 붙은 뒤에만 되므로 한 번 더 렌더한다. 그 사이 그냥 그리면 전체 선이 한 프레임 번쩍인다 → 첫 렌더는 `visibility: hidden`(`display: none` 은 안 된다. 레이아웃이 없어져 길이를 못 잰다).

**`prefers-reduced-motion: reduce` 가드를 넣는다.** 접근성 기본이고, 넣지 않으면 모션 민감 사용자에게 강제된다.

**⚠️ 검증 한계 (2026-08-17):** headless Chrome 은 `prefers-reduced-motion: reduce` 를 참으로 보고하고 CSS 애니메이션을 즉시 종료 상태로 만든다. 따라서 **draw-in 이 실제로 800ms 동안 그려지는 장면은 관측하지 못했다.** 관측한 것은 여기까지다 —
`--tm-route-length` 가 실측값 630.4 로 채워짐 · `stroke-dasharray` 가 630.403px 로 해석됨 · `getTotalLength()` 630 과 일치 · CSSOM 에 `animation: 800ms ease-out … forwards tm-route-draw` 와 `@keyframes tm-route-draw { 100% { stroke-dashoffset: 0 } }` 존재 · `getAnimations()` 가 해당 애니메이션을 반환 · reduced-motion 가드가 의도대로 `animation: none` 으로 덮음.
**실제 재생은 사람이 일반 브라우저에서 한 번 봐야 한다.**

---

## Task 6: `SpotMarker` + 툴팁 + 클릭 스크롤 + 키보드

- [ ] **Step 1:** `.tm-glow` / `.tm-dot` / `.tm-num` / `.tm-tooltip` 스타일
- [ ] **Step 2:** `TravelMapTooltip.tsx` — 컨테이너 폭 기준 클램프, 우측 넘치면 좌측으로 뒤집기
- [ ] **Step 3:** `SpotMarker.tsx` — `role="button"`, `tabIndex={0}`, Enter/Space, 활성 시 r 8→11
- [ ] **Step 4:** `TravelMap.tsx` 에 `activeIndex` state + `selectSpot` 연결
- [ ] **Step 5:** 수동 확인 → 커밋

**원안에서 바꾼 것:**

- `aria-label` 은 `{순번}. {name}, {city}` + anchor 가 있으면 `— 본문으로 이동`. 순번이 있어야 지도의 숫자와 스크린리더 낭독이 이어진다.
- sr-only `<ol>` 은 만들지 않는다 — Task 8 의 `VisitedList` 가 **보이는** 목록으로 같은 역할을 한다.
- 클래스는 `tm-` 프리픽스로 통일(`tm-dot`). e2e 셀렉터도 `circle.tm-dot` 을 쓴다.

**🐞 결함 1 — `role="img"` 가 마커를 스크린리더에서 지운다 (원안의 버그).** 원안은 `<svg role="img">` 안에 `role="button"` dot 을 넣는데, `role="img"` 는 **하위 트리를 통째로 presentational 로 만들어** 그 버튼들에 AT 가 도달하지 못한다. 상호작용 요소를 품은 SVG 는 `role="group"` 이다. 수정 후 접근성 트리에 5개 버튼이 전부 라벨과 함께 노출되는 것을 확인했다.

**🐞 결함 2 — anchor 없는 마커의 클릭 토글.** `anchor` 가 없을 때 활성 상태를 토글하면, 데스크톱에서 hover 로 뜬 툴팁이 클릭하는 순간 사라지고 **커서가 그대로라 `mouseenter` 가 다시 안 걸려 툴팁이 돌아오지 않는다**(실측). 토글은 터치에서만 의미가 있으므로 `setActiveIndex(index)` 로 멱등하게 둔다. 해제는 Task 7 의 「바깥 탭」이 담당한다.

**검증 결과 (2026-08-17, 실측):**

| 항목 | 결과 |
|---|---|
| 접근성 트리 | 마커 5개가 `button` 으로 노출, 라벨 `1. 飛騨市, 히다시 — 본문으로 이동` |
| hover | 툴팁 표시(제목 + description ?? city), r 8 → 11 |
| 클릭(anchor 있음) | `#sec-takayama` 로 스크롤, 헤딩이 뷰포트 상단 |
| 클릭(anchor 없음) | 툴팁 유지, 스크롤 없음 (결함 2 수정 후) |
| 클릭(anchor 대상 없음) | dev 경고 1건, 스크롤 없음, 에러 없음 |
| Tab | `<circle>` 포커스, `:focus-visible` 매치, outline `2px solid #059669` |
| Enter | `#sec-gero` 로 스크롤 |
| 컨테이너 축소(1216 → 420px) | ResizeObserver 재투영, dot x 659 → 261 |
| 툴팁 엣지 플립 | 420px 폭에서 dot x=296 → 툴팁 left 60.1 (좌측 반전), 래퍼 안에 물림 |

**⚠️ Task 11 에서 확인할 것:** `scrollIntoView({ block: 'start' })` 는 요소를 뷰포트 최상단에 붙인다. 실제 블로그에 sticky 헤더가 있으면 제목이 가려진다 — 그때 대상 헤딩에 `scroll-margin-top` 이 필요한지 본다.

---

## Task 7: 모바일 two-tap

`pointer: coarse` 에서 1탭 = 활성+툴팁, 같은 dot 2탭 = 스크롤, 바깥 탭 = 해제.

- [ ] **Step 1:** `isCoarsePointer` 를 **마운트 후 effect 에서** 읽는다(`window.matchMedia('(pointer: coarse)')`). 렌더 결과가 아니라 핸들러 동작만 바꾸므로 하이드레이션 불일치가 없다.
- [ ] **Step 2:** `selectSpot` 에 coarse 분기 + `tappedIndexRef` (아래 참조).
- [ ] **Step 3:** 래퍼 `onClick` 에서 `(event.target as Element).closest('.tm-dot')` 이 없으면 `deactivate()`.
- [ ] **Step 4:** 검증 → 커밋

**🐞 원안의 전제가 틀렸다 — 「터치에서 `onMouseEnter` 는 안 뜬다」.** 브라우저는 탭 후 호환용 마우스 이벤트를 발생시킨다. 실측한 순서:

```
mouseover → mouseenter → pointerdown → click
```

즉 `click` 이 도착한 시점엔 `mouseenter` 가 이미 활성화를 끝냈다. 원안대로 `activeSpotIndex === index` 로 「두 번째 탭인가」를 판정하면 **첫 탭이 곧바로 두 번째 탭으로 오인돼 two-tap 이 one-tap 으로 붕괴한다.** 원안의 `sourceCapabilities.firesTouchEvents` 가드는 `onFocus` 만 막지 이걸 막지 못한다.

**해법: 이벤트 출처를 캐지 말고 「탭으로 활성화된 인덱스」를 `tappedIndexRef` 로 따로 추적한다.** hover/focus 가 `activeIndex` 를 어떻게 바꾸든 판정이 오염되지 않는다. `sourceCapabilities`(Chrome 전용, 비표준) 의존도 사라진다.

```tsx
if (isCoarsePointer && tappedIndexRef.current !== index) {
  tappedIndexRef.current = index;
  setActiveIndex(index);
  return;                       // 첫 탭 = 툴팁만
}
tappedIndexRef.current = index; // 이후 스크롤 경로
```

해제 시 `tappedIndexRef` 도 같이 비운다 — 안 비우면 해제 후 같은 마커를 다시 탭했을 때 툴팁 없이 곧바로 스크롤한다.

**검증 방법:** headless 에 터치 에뮬레이션이 없다(`set device` 는 뷰포트만 바꾼다 — `coarse:false`, `maxTouchPoints:0`). 검증 페이지에서 하이드레이션 **전에** `window.matchMedia` 를 가로채 coarse 를 흉내낸다. 드라이버의 클릭이 `mouseenter → click` 순서라 위 붕괴 시나리오가 그대로 재현되므로, 이 방식이 오히려 정확한 회귀 테스트가 된다.

**검증 결과 (2026-08-17, 실측):**

| 시나리오 | 결과 |
|---|---|
| 이벤트 순서 | `mouseover → mouseenter → pointerdown → click` (붕괴 조건 재현됨) |
| 탭 1 (마커 2) | 툴팁 `高山市 / 아침시장`, `scrollY` 0 — 스크롤 없음 |
| 탭 2 (같은 마커) | `#sec-takayama` 로 스크롤 (`scrollY` 2259) |
| 다른 마커 탭 | 툴팁 `下呂市 / 게로시` 로 이관, 스크롤 없음 |
| 지도 배경 탭 | 툴팁 해제 |
| 해제 후 같은 마커 재탭 | 다시 첫 탭으로 동작(툴팁만, 스크롤 없음) — ref 리셋 확인 |
| 데스크톱(coarse 아님) | 한 번 클릭에 바로 스크롤 — 회귀 없음 |

---

## Task 8: `VisitedList` + 원본 스크린샷 `<details>` + 에러 폴백

**Goal:** D6 의 실체. `방문한 곳` 목록을 spots 에서 렌더해 본문에서 목록을 지울 근거를 만든다.

**계획에서 바꾼 것 — `VisitedList` 를 `TravelMap` 안이 아니라 별도 export 로 뺀다.** 안에 넣으면 ① 순수 표시인데 하이드레이션된 아일랜드에 갇히고 ② 자기 헤딩(`### 방문한 곳`) 아래에 놓을 수 없어 27편의 헤딩 구조와 ToC 를 전부 건드려야 한다. 빼면 `client:*` 없이 **정적 HTML** 로 렌더된다(검증 페이지의 아일랜드는 `TravelMap` 하나뿐임을 확인).

MDX 사용 형태:

```mdx
### 루트
<TravelMap spots={spots} originalImageSrc="…" client:visible />

### 방문한 곳
<VisitedList spots={spots} />          {/* client:* 없음 — 정적 */}
```

**부수 이득:** 지도 fetch 가 죽어도 목록은 그대로 렌더된다(실측 확인). 데이터가 지도 아일랜드의 생사에 묶이지 않는다.

- [ ] **Step 1: `VisitedList.tsx`**

```tsx
export function VisitedList({ spots }: { spots: DiarySpot[] }) {
  // city 순서는 spots 등장 순서를 따른다 — 그날 동선 순서다
  const groups = useMemo(() => {
    const out: { city: string; prefecture: string; items: DiarySpot[] }[] = [];
    for (const s of spots) {
      const last = out.at(-1);
      if (last && last.city === s.city) last.items.push(s);
      else out.push({ city: s.city, prefecture: s.prefecture, items: [s] });
    }
    return out;
  }, [spots]);

  return (
    <ul className={styles.visited}>
      {groups.map(g => (
        <li key={`${g.prefecture}-${g.city}`}>
          {g.prefecture} {g.city}
          <ul>
            {g.items.map(s => (
              <li key={s.name}>
                {s.mapUrl
                  ? <a href={s.mapUrl} target="_blank" rel="noreferrer">{s.name}</a>
                  : s.name}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
```

같은 도시를 하루에 두 번 들르는 날은 그룹이 두 번 나온다 — 원문 목록도 그렇지 않지만, 동선 순서를 유지하는 쪽이 지도와 번호가 맞는다. 파일럿에서 육안 확인하고 어색하면 city 로 dedupe 하는 쪽으로 바꾼다.

- [ ] **Step 2: `TravelMap.tsx` 구조 정리**

```
<div className={className}>
  <div ref={wrapperRef} className={styles.wrapper}> …지도… </div>
  <p className={styles.credit}>…국토교통성 크레딧…</p>
  <VisitedList spots={spots} />
  {geo.status === 'error' && originalImageSrc && <img …/>}          // 폴백: 스크린샷을 본문으로 승격
  {geo.status !== 'error' && originalImageSrc && (
    <details className={styles.detailsBlock}>
      <summary>구글 맵 원본 보기</summary>
      <img src={originalImageSrc} alt="여행 루트 (원본 구글 맵 스크린샷)" />
    </details>
  )}
</div>
```

- [ ] **Step 3:** 수동 확인 — 정상 로드 / `/geo/muni/*.json` 차단 후 폴백 / `originalImageSrc` 없는 경우
- [ ] **Step 4:** 커밋

**⚠️ `<details>` 가 접혔는지 판정할 때 `getBoundingClientRect()` 를 믿지 말 것.** 접힌 상태에서도 608×658 같은 값을 돌려준다(실측). `element.checkVisibility()` 가 정답이고, 최종 확인은 스크린샷으로 한다.

**에러 폴백 시 크레딧도 숨긴다.** 지도를 못 그렸으면 쓴 데이터가 없는데 국토교통성 표기만 남는 건 사실과 다르다.

**검증 결과 (2026-08-17, 실측):**

| 항목 | 결과 |
|---|---|
| 그룹핑 | 3개 — 다카야마시(2) · 히다시(1) · 시라카와무라(1), 방문 순서 유지 |
| `mapUrl` | 링크 2개, `target="_blank" rel="noreferrer"` |
| 하이드레이션 | 페이지의 `<astro-island>` 1개 (`TravelMap`) — `VisitedList` 는 정적 |
| `<details>` | 접힘 시 이미지 비표시(스크린샷 확인), summary 클릭 시 표시 |
| 네트워크 abort | 에러 문구 노출 · 폴백 이미지 본문 승격 · `details`/`svg`/크레딧 부재 · **목록은 생존** |

**⚠️ Task 11 에서 확인할 것:** 검증 페이지엔 글 본문 스타일(`.article-entry`)이 없어서 목록의 불릿·들여쓰기가 안 보인다. 실제 글에 넣었을 때 중첩 `ul` 이 제대로 보이는지 본다.

---

## Task 9: 좌표 조달 — 단축 URL 해석 + spots 초안 생성

**Goal:** `blog/src/data/diarySpots/14_12-10.ts` 초안을 기계가 만들고, 사람이 빈칸을 채운다. **좌표를 추론하거나 생성하지 않는다.**

- [ ] **Step 1: `blog/scripts/resolve-map-urls.mjs`**

동작:
1. 인자로 받은 slug 의 MDX 에서 `방문한 곳` 섹션을 **헤딩 레벨 무관(`^#+\s*방문한 곳`)** 으로 잘라낸다. `02_11-28` 만 `##` 라 `###` 로 좁히면 조용히 통째로 누락된다.
2. 상위 항목 `- {도도부현} {도시}` 와 하위 항목을 파싱한다. 하위는 세 형태 모두 처리: 중첩 불릿(`  - X`), 인라인(`— A, B, C`), 3단 중첩(3단은 2단에 flat 하게 합친다).
3. 항목에 `https://maps.app.goo.gl/...` 이 있으면 리다이렉트를 따라가 최종 URL 에서 좌표를 뽑는다 (`@lat,lng,zoom` 또는 `!3d{lat}!4d{lng}`). 두 패턴 다 없으면 좌표 없이 둔다.
4. `src/data/diarySpots/{slug}.ts` 초안을 출력한다. 좌표 미해결 항목은 `lat: 0, lng: 0, // TODO 좌표` 로 남긴다.

```bash
node scripts/resolve-map-urls.mjs 14_12-10
```

요청 사이에 지연을 넣어 연속 호출하지 않는다. 이미 만든 파일이 있으면 덮어쓰지 말고 `.draft.ts` 로 뺀다 — 사람이 채운 좌표를 날리면 안 된다.

- [ ] **Step 2: 파일럿 편 초안 생성 후 사람이 좌표 채우기**

`14_12-10` 은 3도시(다카야마시 · 히다후루카와시 · 오쿠히다온센고 히라유) 12장소, 단축 URL 3건. 즉 **자동 3건 + 수동 9건**이다.

결과 형태:

```ts
import type { DiarySpot } from '@/components/Blog/TravelMap';

export const spots: DiarySpot[] = [
  { name: '미야가와 아침시장', lat: 36.1428, lng: 137.2593, city: '다카야마시', prefecture: '기후현', anchor: '…' },
  { name: '아지도코로 후루카와', lat: 0, lng: 0, city: '히다후루카와시', prefecture: '기후현', mapUrl: 'https://maps.app.goo.gl/2s9GN7SjSA6RD8bDA' },
  // …
];
```

(위 좌표는 형태 예시다. 실제 값은 스크립트 결과 또는 사람이 확인한 값으로만 채운다.)

- [ ] **Step 3: anchor 채우기**

빌드된 페이지에서 헤딩 id 를 읽어 대응되는 spot 에만 넣는다. 헤딩이 이미 한글 슬러그 id 를 갖고 있으므로 별도 설정은 없다:

```bash
cd blog && bun dev
# 브라우저 콘솔
Array.from(document.querySelectorAll('.article-entry h2, .article-entry h3')).map(h => ({ text: h.textContent, id: h.id }))
```

`14_12-10` 의 헤딩은 서사 제목이라 장소명과 1:1 이 아니다. 짝이 없으면 `anchor` 를 넣지 않는다 (D-anchor 결정).

- [ ] **Step 4:** 커밋

---

## Task 10: 검증 스크립트 `check-diary-spots`

**Goal:** 좌표 오입력·환각·누락을 사람 눈이 아니라 스크립트가 잡는다. **컴포넌트 완성보다 먼저 통과시킨다.**

- [ ] **Step 1: `blog/scripts/check-diary-spots.mjs`**

체크 항목:

1. `src/data/diarySpots/*.ts` 의 모든 spot 이 필수 필드(`name`, `lat`, `lng`, `city`, `prefecture`)를 갖는가
2. `lat === 0 || lng === 0` 인 항목이 없는가 (미입력 감지) — **실패 처리**
3. `prefecture` 가 `PREFECTURES` 에 있는가 — 원문 오타(`이시키와현` 4건) 유입 차단
4. 좌표가 해당 `prefecture` 의 시정촌 폴리곤 안에 있는가 (point-in-polygon, `public/geo/muni/{code}.json` 대조) — **실패 처리.** 다른 현/다른 나라 좌표를 여기서 잡는다
5. `anchor` 가 있으면 해당 MDX 에 그 id 를 만드는 헤딩이 실제로 있는가 (`TableOfContents.astro` 의 `createSlug` 와 같은 규칙으로 계산)
6. 마이그레이션한 MDX 가 `spots` 를 import 하고 `<TravelMap>` 을 쓰는가
7. **(마이그레이션 직전 1회만)** 원문 `방문한 곳` 을 레벨 무관으로 재파싱한 도시 집합 == `spots` 의 city 집합. 목록을 지우고 나면 이 체크는 근거를 잃으므로, 편마다 삭제 직전에 돌리고 통과 로그를 커밋 메시지에 남긴다
8. **`PREFECTURES` 의 모든 code 에 `public/geo/muni/{code}.json` 이 존재하고, 그 반대도 성립하는가** — 타입은 통과하는데 fetch 가 404 나는 함정을 막는다. 고아 파일도 함께 리포트한다 (Task 2 시점에 수동으로 1회 확인함: 16 ↔ 16 일치)

```bash
cd blog && node scripts/check-diary-spots.mjs
```

`package.json` 에 `"check-spots": "node scripts/check-diary-spots.mjs"` 추가.

- [ ] **Step 2:** 파일럿 편으로 통과 확인 → 커밋

---

## Task 11: 파일럿 마이그레이션 — `14_12-10.mdx`

- [ ] **Step 1:** 삭제 직전 Task 10 의 체크 7번을 돌려 도시 집합 일치를 확인한다
- [ ] **Step 2:** MDX 수정

```mdx
import { TravelMap } from '@/components/Blog/TravelMap';
import { spots } from '@/data/diarySpots/14_12-10';
```

`## 루트 및 방문한 곳` 아래 `### 루트` 의 `<ImageLoader>` 와 `### 방문한 곳` 목록을 통째로 다음으로 교체한다:

```mdx
### 루트

<TravelMap
  spots={spots}
  originalImageSrc="/files/blog/diary/japan-around-trip/assets/{그 편의 루트 스크린샷}.webp"
  client:visible
/>
```

`<TableOfContents>` 에서 `방문한 곳` 줄을 뺀다. 스크린샷 경로는 `.png` 가 아니라 **`.webp`** 다 (본문 실제 값 확인 후 그대로 옮긴다).

- [ ] **Step 3:** 수동 확인
  1. 기후현 북부 시정촌 경계 위에 12개 번호 dot, 그날 동선에 맞는 축척
  2. 루트가 draw-in 애니메이션
  3. hover → 툴팁 / 클릭 → anchor 있는 spot 만 스크롤
  4. 지도 아래 「방문한 곳」 목록이 도시별로 렌더되고 단축 URL 3건이 링크
  5. `<details>` 로 원본 스크린샷 열림
  6. 다크모드 토글에서 색이 깨지지 않음
  7. 국토교통성 크레딧 노출
- [ ] **Step 4:** 커밋

---

## Task 12: Playwright e2e

- [ ] **Step 1:** `blog/e2e/travel-map.noauth.spec.ts` — 대상은 `/blog/diary/japan-around-trip/14_12-10`

케이스:
1. `circle.travel-map-spot-dot` 개수 == `spots` 길이 (테스트가 데이터 파일을 import 해 비교 — 숫자를 하드코딩하지 않는다)
2. (chromium) 첫 dot hover → `[role="tooltip"]` 에 그 spot 이름
3. (chromium) anchor 가 있는 dot 클릭 → 대상 헤딩이 뷰포트 안
4. `구글 맵 원본 보기` 클릭 → 원본 이미지 표시
5. 「방문한 곳」 목록에 도시 3개가 순서대로 존재
6. (mobile-chrome) 1탭 = 툴팁만, 같은 dot 2탭 = 스크롤

`client:visible` 이므로 각 케이스에서 `scrollIntoViewIfNeeded()` + 하이드레이션 대기가 필요하다 (기존 e2e 관례대로 2000ms, 불안정하면 3000ms).

- [ ] **Step 2:**

```bash
cd blog && bun x playwright test travel-map.noauth.spec.ts
```

- [ ] **Step 3:** `bun astro check` + `bun run build` 0 errors → 커밋

---

## Task 13: 나머지 26편 복제

파일럿이 통과한 뒤에만 착수한다. 편당 반복:

1. `node scripts/resolve-map-urls.mjs {slug}` → 초안
2. 사람이 좌표·anchor 채움
3. `bun run check-spots` 통과 (체크 7번 포함)
4. MDX 교체 + `<TableOfContents>` 정리
5. 커밋

배치로 돌릴 때 주의:

- `01_intro` 는 `방문한 곳` 이 없다 — 지도 대상이 아니다. 후속 계획 4.2 의 「`01_intro` 귀속」 결정도 여기서 함께 정리한다
- `02_11-28` 은 `## 방문한 곳` (레벨 예외) + 루트 스크린샷 없음 → `originalImageSrc` 생략
- `23_12-19` · `24_12-20` · `28_12-24` 는 인라인형(`— A, B, C`)
- `03_11-29` 은 3단 중첩
- `28_12-24` 는 `인천` 이 섞여 있다 (일본 아님) — spot 에서 제외하거나 `prefecture` 없는 항목으로 다루지 말고 그냥 뺀다
- 해안이 크게 잡히는 편(`02_11-28` 토모노우라, `27_12-23` 마쓰시마, `22_12-18` 후로후시)에서 s0001 경계가 거칠면 그 현만 `s0010` 파일로 교체한다

---

## 후속 기능에 넘기는 것

[`japan-trip-map`](./active/planning/2026-08-16/2026-08-16-japan-trip-map-final.md) 이 이 작업 완료 시점에 받는 것.

**2026-08-17 — 그 계획의 D1 이 뒤집혔다: ECharts 6.1.0 → d3-geo 로 통일.** 따라서 넘기는 것이 데이터에서 코드까지 늘었다.

데이터:

- `blog/src/data/diarySpots/*.ts` — 27편치 spots. 도시 좌표는 해당 city 의 spots 중심점으로 계산하면 되고 별도 조사가 불필요하다 (그 문서 9절 1번 해소)
- `DIARY_CITIES` 는 spots 의 `city` 를 집계하면 나온다 — 손으로 큐레이트할 필요가 없어진다 (그 문서 4.2 표는 교차검증용으로만)

코드 (복사하지 말고 import):

- `prefectures.ts` — 한글↔일본어↔코드 매핑. `ja` 필드가 전국 도도부현 GeoJSON 의 `N03_001`(일본어) 매칭용이다 (그 문서 9절 2번 해소)
- `useGeoData.ts` — URL 캐시 + 다중 fetch 병합. 전국 파일 1개를 받을 때도 그대로 쓴다
- `SpotMarker` 의 접근성 규칙(`role="button"` + `tabIndex` + Enter/Space)과 `.credit` 블록(국토교통성 표기) — 두 지도가 같은 규칙을 쓴다

자산:

- 도도부현 레이어용 GeoJSON 후보: 같은 저장소 `data/municipality/geojson/s0001/prefectures.json` (317KB). 그 문서의 200KB 목표를 넘으므로 topojson 판을 쓰거나 `split-muni-geojson.mjs` 처럼 property 를 털어내고 단순화한다
- **`d3-zoom` 은 그 계획에서만 필요하다** — 이 기능은 팬/줌이 명시적 non-goal 이므로 여기서 설치하지 않는다

## 남은 미확인

없음. 착수 전에 확인이 필요하던 항목(heading id · GeoJSON 출처/크기/property/라이선스 · 데이터 규모)은 2026-08-17 에 실물로 전부 확인했다. 새로 생기는 미확인은 이 절에 추가한다.

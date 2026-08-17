# Interactive Travel Map — Design Spec

**Status:** Approved — 구현 계획으로 이관됨
**Date:** 2026-04-23 (개정 2026-08-17 — 결정 6-A 추가, 이후 결정 1·3·5·6 대체됨)
**선후 관계:** 이 기능이 **선행**. 후속 = [japan-trip-map playground](./active/planning/2026-08-16/2026-08-16-japan-trip-map-final.md)
**Scope:** Per-post interactive D3 map for diary entries, starting with `japan-around-trip/14_12-10`

> ⚠️ **2026-08-17 — 이 스펙의 결정 1·3·5·6 은 구현 계획의 결정 로그가 대체한다.**
> 착수 전 저자와 디테일 7건을 확정하면서 대상 글·축척·데이터 위치가 바뀌었다.
> **SSOT 는 [`interactive-travel-map-impl-plan.md` §0 결정 로그](./interactive-travel-map-impl-plan.md)** 이고,
> 이 문서는 문제 정의·인터랙션·접근성·엣지케이스의 근거로 남는다.

## 1. Problem

The current diary posts represent the day's route with a single flattened Google Maps screenshot (e.g. `CleanShot_2026-02-16_23.09.11@2x.png` under `## 루트`). This wastes the opportunity to tie the route visually to the narrative: the screenshot is static, non-interactive, and has no relationship to the per-spot sections below.

Goal: replace the screenshot with an interactive SVG map that shows the day's visited spots as numbered dots connected by a smooth route, and uses click-to-scroll to connect each dot to its corresponding narrative section.

## 2. Reference

`https://sizuok-izu-trip.netlify.app/` (Shizuoka/Izu trip) is the visual/interaction reference. Under the hood it uses:

- D3 v7 + vanilla JS + pure SVG (no tile provider, no Leaflet/Mapbox)
- GeoJSON for the prefecture boundary, fitted via `d3.geoMercator().fitExtent()`
- `d3.line()` with `curveCatmullRom.alpha(0.5)` for the route
- Glow + dot markers; hover tooltip; click opens Google Maps
- Day color palette + legend toggle

We adopt the same rendering approach, but differ in several places (see §3).

## 3. Key Decisions

| # | Decision | Rationale |
|---|---|---|
| ~~1~~ | ~~**Map extent**: Tokyo 23 wards GeoJSON~~ → **대체됨.** 시정촌 경계를 도도부현 단위로 분할해 배포하고, 축척은 그날 spots 의 bbox 에 fit | 도도부현 축척이면 하루가 한 도시 안일 때 점이 뭉쳐 스크린샷보다 정보량이 적어진다 (impl-plan D2·D3) |
| 2 | **Scope**: per-post (one map per MDX file, showing that day's spots only) | Keeps data colocated with narrative; avoids spoiler of later days; no day-filter complexity |
| ~~3~~ | ~~**Data authoring**: inline `export const spots` in MDX~~ → **대체됨.** `src/data/diarySpots/{slug}.ts` 편당 파일 + MDX 에서 import | 후속 playground 와 검증 스크립트가 타입 안전하게 import 로 읽는다 (impl-plan D5) |
| 4 | **Interaction**: hover tooltip; click → smooth scroll to section anchor in the same post; mobile uses two-tap pattern (tap 1 = tooltip, tap 2 = scroll) | Keeps the reader inside the post; reference-style "click → external Google Maps" is hostile to narrative flow |
| ~~5~~ | ~~**Component**: `<TravelMap geoRegion="..." />` + preset registry~~ → **폐기.** `spots[].prefecture` 가 어느 GeoJSON 을 쓸지 이미 알려주므로 레지스트리는 중복 | impl-plan D3 |
| 6 | **Placement in post**: under `### 루트`, fully replacing the `<ImageLoader>` screenshot; the `방문한 곳` bullet list is also removed | Eliminates duplicated data; tightens the structure to "루트 (map) → 일정 (photos + prose)" |
| 6-A | **[2026-08-17 개정]** 결정 6번의 전제 조건: `DiarySpot` 에 `city` · `prefecture` 필드를 **반드시 포함**한 뒤에만 `방문한 곳` 을 삭제할 것 | `방문한 곳` 의 `- 히로시마현 후쿠야마시` 줄에만 존재하는 도시/도도부현 정보가, 후속 기능 [japan-trip-map](./active/planning/2026-08-16/2026-08-16-japan-trip-map-final.md) 의 도도부현 레이어·도시 그룹핑 근거다. 필드 없이 삭제하면 소실된다 |
| 6-B | **[2026-08-17 확정]** 삭제한 목록은 `<TravelMap>` 이 spots 에서 다시 렌더한다 (`VisitedList`). `mapUrl` 필드로 원문의 구글맵 링크까지 보존 | 6-A 가 지키려던 정보 손실이 0이 되고, spots 가 단일 SSOT 가 된다 (impl-plan D6) |
| 7 | **Original screenshot**: preserved inside a `<details>` collapse rendered by the component (controlled via `originalImageSrc` prop) | The screenshot is the real Google Maps data snapshot; worth preserving but not worth showing by default |

### Secondary decisions (author's call)

- **Dot visual**: numbered (1, 2, 3…) in white 12px text, centered in the main dot. Visit order is primary information in a diary; the reference omits numbers but we improve on it.
- **Route curve**: `d3.curveCatmullRom.alpha(0.5)` (identical to reference). Smoother than straight lines between stops.
- **Mount animation**: route draws in via `stroke-dashoffset` transition (800ms) on first hydration. No scroll-tied animation — complexity does not justify the gain.
- **Responsive**: SVG `viewBox` + `preserveAspectRatio="xMidYMid meet"`. Container height is fixed at `px360` from `src/assets/styles/variables.js` (≈360px desktop, scales down on narrower viewports via the `min(vw, rem)` token). The implementation plan may adjust this single value based on visual trial.
- **Dark mode**: CSS variable bindings (`--color-surface`, `--color-surface-2`, `--color-border`). The `.dark` class strategy is already in place project-wide.

## 4. Architecture

> **[2026-08-17]** 아래 파일 배치와 §5 데이터 모델은 결정 1·3·5 대체로 낡았다.
> 실제 구조는 [impl-plan 「파일 구조」 + Task 2](./interactive-travel-map-impl-plan.md) 를 본다.
> 이 절은 「D3 은 수학만, DOM 은 React 소유」라는 설계 규칙 때문에 남긴다.

### File layout

```
src/components/Blog/TravelMap/
├── TravelMap.tsx        # Main React component (client:visible island)
├── regions.ts           # GEO_REGIONS registry + GeoRegion union type
├── types.ts             # DiarySpot, TravelMapProps
├── useGeoData.ts        # fetch + session-level memoization for geojson
└── index.ts             # export { TravelMap }

public/maps/
└── tokyo-23ku.geojson   # Tokyo 23 wards boundary (~100KB, committed)
```

### Component boundaries

- **`TravelMap.tsx`** — pure view: receives props, computes projection, renders SVG. Owns interaction state (active spot index, hover state).
- **`regions.ts`** — data only: maps preset name to GeoJSON URL. Extending coverage = one entry + one file under `public/maps/`.
- **`useGeoData.ts`** — infrastructure: caches fetched GeoJSON in a module-level `Map` keyed by URL, so multiple maps in one session do not refetch.

### Design rule

D3 is used only for **math** (`geoMercator`, `geoPath`, `line`, `curveCatmullRom`). The DOM is owned by React (no `d3.select().append()`). State changes (hover, active spot, dark-mode toggle) reflect naturally through React re-renders and CSS variables.

## 5. Data Model

```ts
// types.ts
export type DiarySpot = {
  name: string;           // e.g. "모헤지 (츠키시마)"
  lat: number;
  lng: number;
  description?: string;   // secondary line in the tooltip
  anchor?: string;        // in-post section id for click-to-scroll
};

export type TravelMapProps = {
  geoRegion: GeoRegion;
  spots: DiarySpot[];
  originalImageSrc?: string;
  className?: string;
};
```

```ts
// regions.ts
export const GEO_REGIONS = {
  'tokyo-23ku': { url: '/maps/tokyo-23ku.geojson' },
} as const;

export type GeoRegion = keyof typeof GEO_REGIONS;
```

Centering/zoom is handled automatically by `fitExtent` against the GeoJSON, so the registry currently holds only the URL. Additional hints (per-region padding, label positioning) can be added when a second preset is introduced.

## 6. MDX Authoring Example

```mdx
import { TravelMap } from '@/components/Blog/TravelMap';

export const spots = [
  { name: '나리타 공항', lat: 35.7719, lng: 140.3929, description: '도착', anchor: 'travel-purpose' },
  { name: '모헤지 (츠키시마)', lat: 35.6636, lng: 139.7882, description: '몬자야키', anchor: 'monja-street' },
  { name: '이토야 긴자', lat: 35.6716, lng: 139.7657, description: '문구점', anchor: 'ginza' },
  { name: '아메요코 상점가', lat: 35.7099, lng: 139.7742, description: '상점가', anchor: 'ueno' },
  { name: '히츠지 (우에노)', lat: 35.7089, lng: 139.7746, description: '양고기', anchor: 'ueno' },
];

## 루트 및 방문한 곳

### 루트

<TravelMap
  geoRegion="tokyo-23ku"
  spots={spots}
  originalImageSrc="/files/blog/diary/25-01-tokyo/assets/CleanShot_2026-02-16_23.09.11@2x.png"
  client:visible
/>

## 일정

### 츠키시마 몬쟈 스트리트 {#monja-street}
...
```

The `{#monja-street}` syntax makes heading anchors explicit and stable. The implementation plan must verify the project's remark config during the spec-to-plan transition: if explicit `{#id}` syntax is not supported, fall back to remark's auto-slug output and document the exact slugification rule in the migration notes so author-provided `anchor` values can be verified.

## 7. Interaction Detail

### Desktop

- Spot dot **hover**: radius `5 → 8` with 200ms transition; tooltip renders near the dot with name and description.
- Spot dot **click**: if `anchor` is set, `document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })`. Otherwise, no-op.
- Tooltip is positioned relative to the SVG container and clamped to its bounds; if it would overflow the right edge, it flips to the left of the dot.

### Mobile (`pointer: coarse`)

- **Tap 1** on a spot → activate that dot (same visual as desktop hover) and show tooltip. Tapping another spot transfers the active state.
- **Tap 2** on the same spot → scroll to anchor.
- Tap anywhere outside a spot → deactivate current spot.
- State: `const [activeSpotIndex, setActiveSpotIndex] = useState<number | null>(null)`.

### Accessibility

- Each dot renders as `<circle role="button" tabIndex={0} aria-label="{name}, {description}" />`.
- Enter/Space key fires the same handler as click.
- A visually-hidden `<ol>` mirrors the spot list with anchor links for screen readers and users without JS.

## 8. Render Pipeline

```
Mount
  └─ useGeoData(region) → fetch(url) → cached Promise → setGeoData

geoData ready
  └─ useMemo(() => {
       projection = d3.geoMercator().fitExtent([[pad, pad], [w - pad, h - pad]], geoData);
       pathGen    = d3.geoPath(projection);
       line       = d3.line().x(...).y(...).curve(curveCatmullRom.alpha(0.5));
       return { projection, pathGen, line };
     }, [geoData, width, height])

Render (pure JSX)
  <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
    <defs>{gradient defs}</defs>
    <rect width={w} height={h} fill="url(#ocean-gradient)" />
    <g className="prefecture">
      {geoData.features.map(f => <path d={pathGen(f)} />)}
    </g>
    <g className="route">
      <path d={line(spots)} className="animate-draw" />
    </g>
    <g className="points">
      {spots.map((s, i) => <SpotMarker
        key={i}
        index={i}
        spot={s}
        position={projection([s.lng, s.lat])}
        active={activeSpotIndex === i}
        onActivate={...}
        onScroll={...}
      />)}
    </g>
  </svg>
  {originalImageSrc && (
    <details><summary>구글 맵 원본 보기</summary><img src={originalImageSrc} /></details>
  )}
```

Width/height are measured via a `ResizeObserver` on the container so the map reflows when the viewport changes.

## 9. Edge Cases

| Case | Handling |
|---|---|
| GeoJSON fetch fails | Fall back to rendering only the `<details>` block with the original screenshot, preceded by a small "지도를 불러오지 못했습니다" notice |
| `spots` is empty | Render the boundary only; no route, no markers |
| Spot lat/lng outside Tokyo | `fitExtent` still frames correctly, but a dev-only `console.warn` is emitted |
| `anchor` target element missing in DOM | `console.warn` on click; no scroll, no error |
| Dark-mode toggle | CSS variables bound in `fill`/`stroke` reflect automatically; no re-render needed |
| Window resize | `ResizeObserver` triggers re-projection through the `useMemo` dependency on `width`/`height` |

## 10. Testing Plan

**Playwright e2e** — `e2e/travel-map.noauth.spec.ts`, running on both `chromium` and `mobile-chrome` projects.

1. Load `/blog/diary/25-01-tokyo/01_01-20` → `scrollIntoViewIfNeeded` on the map container → `waitForTimeout(2000)` for `client:visible` hydration.
2. Assert that the SVG contains one `circle.spot-dot` per entry in the post's `spots` array (read by the test from the rendered DOM; do not hard-code count).
3. Hover on the first dot → tooltip DOM contains "나리타 공항".
4. Click on the first dot → verify scroll position advances to the `#travel-purpose` section.
5. Open `<details>` → original screenshot `<img>` is visible.
6. On `mobile-chrome`: first tap shows tooltip but does not scroll; second tap on the same dot scrolls.

No unit tests. This is a DOM-heavy visual component; e2e is the authoritative check, and the project does not currently have Vitest wired up.

## 11. Explicit Non-Goals (YAGNI)

- No zoom/pan (`d3.zoom`). Tokyo 23 wards + `fitExtent` is enough.
- No legend. Per-post scope means a single day and a single color — no legend to build.
- No day filter / day-toggle UI. Per-post scope removes the concept entirely.
- No layer toggles (subway/roads/labels). Out of scope for a stylized overview map.
- No route playback ("play" button). Low value vs. implementation cost.
- No per-spot thumbnail preview in the tooltip. Thumbnails already live in the polaroid galleries below.

## 12. Follow-up Work (out of scope for this spec)

- Once `japan-around-trip` adopts `<TravelMap>`, add a second preset (e.g. `'kanto-region'` or a whole-Japan GeoJSON) to `GEO_REGIONS`.
- Consider a trip-level map on a future `/diary/25-01-tokyo/` landing route that shows all days merged. Requires the day filter/toggle feature that this spec explicitly defers.
- After the first post migrates, run `bun run all-preprocess-md` so the `removeUnused` script can clean up `CleanShot_2026-02-16_23.09.11@2x.png` once no MDX references it (note: the `<details>` block still references it via the `originalImageSrc` prop, so it remains in use).

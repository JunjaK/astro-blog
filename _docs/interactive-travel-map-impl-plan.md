# Interactive Travel Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an interactive D3 SVG map component (`<TravelMap>`) that replaces the static Google Maps screenshot in Tokyo diary posts, rendering numbered spot markers on a Tokyo 23-ward boundary with hover tooltips and click-to-scroll to in-post sections.

**Architecture:** React island hydrated on `client:visible`. D3 is used for geographic math only (`geoMercator`, `geoPath`, `line`, `curveCatmullRom`); all DOM is owned by React so state transitions re-render naturally. Geographic boundaries ship as a static GeoJSON asset under `public/maps/`. A preset registry (`GEO_REGIONS`) maps the `geoRegion` prop to the appropriate GeoJSON URL. Spot data is authored inline in MDX via `export const spots = [...]`, matching the existing `PolaroidGalleryScrapbook` convention.

**Tech Stack:** Astro 5, React 19, TypeScript, D3 v7 (already installed), Tailwind CSS 4 + SCSS page tokens, Playwright (e2e), Bun, Node 24.

**Reference spec:** `_docs/interactive-travel-map-plan.md`

**Branch:** Create `feat/travel-map` before starting (all tasks assume this is the working branch).

---

## File Structure

**New files:**

| Path | Responsibility |
|---|---|
| `src/components/Blog/TravelMap/TravelMap.tsx` | Main React component; owns all interaction state |
| `src/components/Blog/TravelMap/SpotMarker.tsx` | Single spot dot: glow + numbered dot + tooltip trigger |
| `src/components/Blog/TravelMap/TravelMapTooltip.tsx` | Positioned tooltip rendered over the SVG |
| `src/components/Blog/TravelMap/types.ts` | `DiarySpot`, `TravelMapProps` |
| `src/components/Blog/TravelMap/regions.ts` | `GEO_REGIONS` registry + `GeoRegion` union type |
| `src/components/Blog/TravelMap/useGeoData.ts` | `fetch`-backed hook with module-level cache |
| `src/components/Blog/TravelMap/styles.module.scss` | Component-scoped styles (CSS vars + animations) |
| `src/components/Blog/TravelMap/index.ts` | Barrel export |
| `public/maps/tokyo-23ku.geojson` | Tokyo 23 wards boundary (~100KB) |
| `e2e/travel-map.noauth.spec.ts` | Playwright desktop + mobile e2e |

**Files to modify:**

| Path | Change |
|---|---|
| `src/content/blog/diary/25-01-tokyo/01_01-20.mdx` | Replace `<ImageLoader>` route screenshot with `<TravelMap>`; remove `방문한 곳` bullet list; add explicit section ids where needed |
| `src/content/blog/diary/25-01-tokyo/02_01-21.mdx` | Same treatment |

---

## Task 1: Verify heading anchor scheme and fetch Tokyo 23-ward GeoJSON

**Goal:** Confirm that in-post headings receive `id` attributes (required for `scrollIntoView` by id) and stage the GeoJSON asset. This is a gate task — anchor behavior must be understood before the click handler is designed.

**Files:**
- Create: `public/maps/tokyo-23ku.geojson`
- Read: any built diary post page in the browser DevTools

- [ ] **Step 1: Start the dev server and inspect heading ids**

```bash
bun dev
```

Open `http://localhost:4321/blog/diary/25-01-tokyo/01_01-20` in a browser. Open DevTools and run in the console:

```js
Array.from(document.querySelectorAll('.article-entry h2, .article-entry h3')).map(h => ({ text: h.textContent, id: h.id }))
```

Record the output. There are three possible outcomes:

1. **All headings have ids** → Astro's MDX pipeline already runs `rehype-slug` implicitly or via a default. Proceed: spot `anchor` values will match these ids.
2. **Headings have no ids** → `rehype-slug` is not configured. Add it in Task 1b (below).
3. **Partial/inconsistent** → Unlikely; treat as case 2.

- [ ] **Step 1b (only if Step 1 shows no ids): Add rehype-slug**

```bash
bun add -D rehype-slug
```

Modify `astro.config.mjs` at the `markdown` block:

```js
// before
markdown: {
  remarkPlugins: [remarkMermaidToHtml, remarkMath],
  rehypePlugins: [rehypeKatex],
  syntaxHighlight: false,
},

// after
import rehypeSlug from 'rehype-slug';
// ...
markdown: {
  remarkPlugins: [remarkMermaidToHtml, remarkMath],
  rehypePlugins: [rehypeSlug, rehypeKatex],
  syntaxHighlight: false,
},
```

Restart `bun dev` and re-verify: every `h2`/`h3` inside `.article-entry` must have an `id` matching the text slugified with hangul preserved. The output should line up with the `createSlug` function in `src/components/Blog/TableOfContents.astro:18-24`.

- [ ] **Step 2: Download the Tokyo 23-ward GeoJSON**

Source: `dataofjapan/land` repo (MIT licensed). The `tokyo/ku.json` file is a TopoJSON file in the repo; we want the expanded GeoJSON. Use the pre-converted mirror:

```bash
mkdir -p public/maps
curl -fL -o public/maps/tokyo-23ku.geojson \
  https://raw.githubusercontent.com/dataofjapan/land/master/tokyo.topojson
```

If the above is TopoJSON (confirm with `head -c 200 public/maps/tokyo-23ku.geojson`), convert it to GeoJSON:

```bash
bun add -D topojson-client
bun x topojson-client topo2geo tokyo=public/maps/tokyo-23ku.geojson < public/maps/tokyo-23ku.geojson > public/maps/tokyo-23ku.geojson.tmp
mv public/maps/tokyo-23ku.geojson.tmp public/maps/tokyo-23ku.geojson
```

Then remove the dev dependency (only used for conversion):

```bash
bun remove topojson-client
```

- [ ] **Step 3: Filter to the 23 wards only**

The source file may include Tama district wards and outlying islands. Filter to the 23 `ku` features. Create `scripts/filter-tokyo-23ku.mjs` (temporary, deleted at end of task):

```js
import fs from 'node:fs';

const WARDS_23 = new Set([
  '千代田区', '中央区', '港区', '新宿区', '文京区', '台東区', '墨田区',
  '江東区', '品川区', '目黒区', '大田区', '世田谷区', '渋谷区', '中野区',
  '杉並区', '豊島区', '北区', '荒川区', '板橋区', '練馬区', '足立区',
  '葛飾区', '江戸川区',
]);

const src = JSON.parse(fs.readFileSync('public/maps/tokyo-23ku.geojson', 'utf8'));
const filtered = {
  type: 'FeatureCollection',
  features: src.features.filter(f => WARDS_23.has(f.properties?.ward_ja ?? f.properties?.N03_004 ?? f.properties?.name)),
};

if (filtered.features.length !== 23) {
  console.warn(`Warning: expected 23 features, got ${filtered.features.length}. Inspect properties and adjust.`);
  console.warn('First feature properties:', JSON.stringify(src.features[0]?.properties, null, 2));
}

fs.writeFileSync('public/maps/tokyo-23ku.geojson', JSON.stringify(filtered));
console.log(`Wrote ${filtered.features.length} features.`);
```

Run it:

```bash
node scripts/filter-tokyo-23ku.mjs
```

If the count is not 23, inspect the logged `properties` object and update the property-name fallback chain in the script. Re-run until `Wrote 23 features.` appears.

Delete the script:

```bash
rm scripts/filter-tokyo-23ku.mjs
```

- [ ] **Step 4: Sanity-check the GeoJSON**

```bash
node -e "const g=require('./public/maps/tokyo-23ku.geojson'); console.log('features:', g.features.length); console.log('bbox sample:', g.features[0].geometry.type);"
```

Expected output:
```
features: 23
bbox sample: Polygon
```
(or `MultiPolygon` — either is acceptable.)

- [ ] **Step 5: Commit**

```bash
git add public/maps/tokyo-23ku.geojson
# If Step 1b ran:
git add astro.config.mjs package.json bun.lock
git commit -m "chore: add tokyo 23-ward geojson and rehype-slug"
```

---

## Task 2: Scaffold `TravelMap/` folder — types, regions registry, barrel export

**Goal:** Pure-TS scaffolding. No rendering yet.

**Files:**
- Create: `src/components/Blog/TravelMap/types.ts`
- Create: `src/components/Blog/TravelMap/regions.ts`
- Create: `src/components/Blog/TravelMap/index.ts`

- [ ] **Step 1: Create `types.ts`**

```ts
// src/components/Blog/TravelMap/types.ts
import type { GeoRegion } from './regions';

export type DiarySpot = {
  name: string;
  lat: number;
  lng: number;
  description?: string;
  anchor?: string;
};

export type TravelMapProps = {
  geoRegion: GeoRegion;
  spots: DiarySpot[];
  originalImageSrc?: string;
  className?: string;
};
```

- [ ] **Step 2: Create `regions.ts`**

```ts
// src/components/Blog/TravelMap/regions.ts
export const GEO_REGIONS = {
  'tokyo-23ku': {
    url: '/maps/tokyo-23ku.geojson',
  },
} as const;

export type GeoRegion = keyof typeof GEO_REGIONS;

export function getRegionUrl(region: GeoRegion): string {
  return GEO_REGIONS[region].url;
}
```

- [ ] **Step 3: Create `index.ts` barrel (placeholder; `TravelMap` export added later)**

```ts
// src/components/Blog/TravelMap/index.ts
export type { DiarySpot, TravelMapProps } from './types';
export type { GeoRegion } from './regions';
```

- [ ] **Step 4: Typecheck**

```bash
bun astro check
```

Expected: 0 errors related to these new files.

- [ ] **Step 5: Commit**

```bash
git add src/components/Blog/TravelMap/
git commit -m "feat(travel-map): scaffold types and region registry"
```

---

## Task 3: Build `useGeoData` hook with module-level cache

**Goal:** A React hook that fetches GeoJSON once per URL per session and returns `{data, status, error}`.

**Files:**
- Create: `src/components/Blog/TravelMap/useGeoData.ts`

- [ ] **Step 1: Implement the hook**

```ts
// src/components/Blog/TravelMap/useGeoData.ts
import { useEffect, useState } from 'react';

import type { GeoRegion } from './regions';
import { getRegionUrl } from './regions';

export type GeoFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: string; coordinates: unknown };
    properties: Record<string, unknown>;
  }>;
};

type CacheEntry =
  | { status: 'loading'; promise: Promise<GeoFeatureCollection> }
  | { status: 'ready'; data: GeoFeatureCollection }
  | { status: 'error'; error: Error };

const cache = new Map<string, CacheEntry>();

async function loadGeoJson(url: string): Promise<GeoFeatureCollection> {
  const existing = cache.get(url);
  if (existing?.status === 'ready') return existing.data;
  if (existing?.status === 'loading') return existing.promise;

  const promise = fetch(url)
    .then(async (res) => {
      if (!res.ok) throw new Error(`GeoJSON fetch failed: ${res.status}`);
      const data = (await res.json()) as GeoFeatureCollection;
      cache.set(url, { status: 'ready', data });
      return data;
    })
    .catch((err) => {
      const error = err instanceof Error ? err : new Error(String(err));
      cache.set(url, { status: 'error', error });
      throw error;
    });

  cache.set(url, { status: 'loading', promise });
  return promise;
}

export type UseGeoDataResult =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: GeoFeatureCollection; error: null }
  | { status: 'error'; data: null; error: Error };

export function useGeoData(region: GeoRegion): UseGeoDataResult {
  const [state, setState] = useState<UseGeoDataResult>({ status: 'loading', data: null, error: null });

  useEffect(() => {
    const url = getRegionUrl(region);
    const existing = cache.get(url);
    if (existing?.status === 'ready') {
      setState({ status: 'ready', data: existing.data, error: null });
      return;
    }

    let cancelled = false;
    loadGeoJson(url)
      .then((data) => { if (!cancelled) setState({ status: 'ready', data, error: null }); })
      .catch((error) => { if (!cancelled) setState({ status: 'error', data: null, error }); });

    return () => { cancelled = true; };
  }, [region]);

  return state;
}
```

- [ ] **Step 2: Typecheck**

```bash
bun astro check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Blog/TravelMap/useGeoData.ts
git commit -m "feat(travel-map): add useGeoData hook with session cache"
```

---

## Task 4: `TravelMap` skeleton — render prefecture boundary with ResizeObserver

**Goal:** A minimal React component that renders the SVG, fetches the GeoJSON, and draws the 23 wards. No markers, no route yet.

**Files:**
- Create: `src/components/Blog/TravelMap/TravelMap.tsx`
- Create: `src/components/Blog/TravelMap/styles.module.scss`
- Modify: `src/components/Blog/TravelMap/index.ts`

- [ ] **Step 1: Create `styles.module.scss`**

```scss
// src/components/Blog/TravelMap/styles.module.scss
.wrapper {
  position: relative;
  width: 100%;
  height: min(40vw, 22.5rem); // ~360px desktop; scales down on mobile
  margin: 1rem 0;
  border-radius: 0.5rem;
  overflow: hidden;
  background: var(--color-surface, #f8f9fa);
}

:global(.dark) .wrapper {
  background: var(--color-surface, #1a1a1a);
}

.svg {
  display: block;
  width: 100%;
  height: 100%;
}

.prefecturePath {
  fill: var(--color-surface-2, #e9ecef);
  stroke: var(--color-border, #ced4da);
  stroke-width: 1.5;
}

:global(.dark) .prefecturePath {
  fill: var(--color-surface-2, #2a2a2a);
  stroke: var(--color-border, #3a3a3a);
}

.loading,
.errorNotice {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 0.875rem;
  color: var(--color-text-muted, #868e96);
}
```

- [ ] **Step 2: Create `TravelMap.tsx` skeleton**

```tsx
// src/components/Blog/TravelMap/TravelMap.tsx
import * as d3 from 'd3';
import { useEffect, useMemo, useRef, useState } from 'react';

import styles from './styles.module.scss';
import type { TravelMapProps } from './types';
import { useGeoData } from './useGeoData';

const PADDING = 40;

export function TravelMap({ geoRegion, spots, originalImageSrc, className }: TravelMapProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const geo = useGeoData(geoRegion);

  // ResizeObserver → dims
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setDims({ width: rect.width, height: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Projection + path generator
  const projectionInfo = useMemo(() => {
    if (geo.status !== 'ready' || dims.width === 0 || dims.height === 0) return null;
    const projection = d3.geoMercator()
      .fitExtent(
        [[PADDING, PADDING], [dims.width - PADDING, dims.height - PADDING]],
        geo.data as d3.ExtendedFeatureCollection,
      );
    const pathGen = d3.geoPath(projection);
    return { projection, pathGen };
  }, [geo, dims.width, dims.height]);

  return (
    <div ref={wrapperRef} className={`${styles.wrapper} ${className ?? ''}`}>
      {geo.status === 'loading' && <div className={styles.loading}>지도 불러오는 중…</div>}
      {geo.status === 'error' && (
        <div className={styles.errorNotice}>지도를 불러오지 못했습니다</div>
      )}
      {geo.status === 'ready' && projectionInfo && (
        <svg
          className={styles.svg}
          viewBox={`0 0 ${dims.width} ${dims.height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="여행 루트 지도"
        >
          <g className="prefecture">
            {geo.data.features.map((f, i) => (
              <path key={i} d={projectionInfo.pathGen(f as d3.ExtendedFeature) ?? ''} className={styles.prefecturePath} />
            ))}
          </g>
        </svg>
      )}
      {/* Spot markers and route added in later tasks */}
      {originalImageSrc && (
        <noscript />
      )}
      {/* spots prop is intentionally unused here; wired in Task 5/6 */}
      {spots.length === 0 && null}
    </div>
  );
}
```

- [ ] **Step 3: Update barrel export**

```ts
// src/components/Blog/TravelMap/index.ts
export { TravelMap } from './TravelMap';
export type { DiarySpot, TravelMapProps } from './types';
export type { GeoRegion } from './regions';
```

- [ ] **Step 4: Manual verification**

Create a throwaway test page or temporarily add `<TravelMap>` into an existing playground. Easiest path — add into `src/content/blog/diary/25-01-tokyo/01_01-20.mdx` at the top, just to verify rendering:

```mdx
import { TravelMap } from '@/components/Blog/TravelMap';

<TravelMap geoRegion="tokyo-23ku" spots={[]} client:visible />
```

Start `bun dev` (if not running) and visit the page. Expected: the 23 wards render as grey polygons inside a bordered container. Resize the window → map reflows. Open DevTools → `<path>` elements render under `<g class="prefecture">`.

**Remove the test usage before committing** (final MDX integration happens in Task 10/11).

- [ ] **Step 5: Commit**

```bash
git add src/components/Blog/TravelMap/
git commit -m "feat(travel-map): render prefecture boundary with ResizeObserver"
```

---

## Task 5: Draw route path with catmull-rom curve and mount-time draw-in animation

**Goal:** Connect spots with a smooth curve that animates in on first render.

**Files:**
- Modify: `src/components/Blog/TravelMap/TravelMap.tsx`
- Modify: `src/components/Blog/TravelMap/styles.module.scss`

- [ ] **Step 1: Add route styles**

Append to `styles.module.scss`:

```scss
.routePath {
  fill: none;
  stroke: var(--color-primary, #4e7a3e);
  stroke-width: 2.5;
  stroke-opacity: 0.55;
  stroke-dasharray: 6, 4;
  stroke-linecap: round;

  // Draw-in animation: set dash-offset to path length in JS via inline style
  animation: travel-map-draw-in 800ms ease-out both;
}

:global(.dark) .routePath {
  stroke: var(--color-primary, #7ebc68);
}

@keyframes travel-map-draw-in {
  from {
    stroke-dashoffset: var(--route-length, 1000);
    stroke-dasharray: var(--route-length, 1000);
  }
  to {
    stroke-dashoffset: 0;
    stroke-dasharray: 6, 4;
  }
}
```

- [ ] **Step 2: Extend `TravelMap.tsx` to render the route**

Find the existing SVG block in `TravelMap.tsx` and extend it. Replace the `<g className="prefecture">` section (and what follows up to `</svg>`) with:

```tsx
          <g className="prefecture">
            {geo.data.features.map((f, i) => (
              <path key={i} d={projectionInfo.pathGen(f as d3.ExtendedFeature) ?? ''} className={styles.prefecturePath} />
            ))}
          </g>
          {spots.length >= 2 && (
            <g className="route">
              <RoutePath spots={spots} projection={projectionInfo.projection} />
            </g>
          )}
```

Above the `TravelMap` function definition, add:

```tsx
function RoutePath({ spots, projection }: { spots: TravelMapProps['spots']; projection: d3.GeoProjection }) {
  const pathRef = useRef<SVGPathElement>(null);
  const d = useMemo(() => {
    const line = d3.line<{ lat: number; lng: number }>()
      .x(s => projection([s.lng, s.lat])?.[0] ?? 0)
      .y(s => projection([s.lng, s.lat])?.[1] ?? 0)
      .curve(d3.curveCatmullRom.alpha(0.5));
    return line(spots) ?? '';
  }, [spots, projection]);

  const [length, setLength] = useState<number | null>(null);
  useEffect(() => {
    if (pathRef.current) setLength(pathRef.current.getTotalLength());
  }, [d]);

  return (
    <path
      ref={pathRef}
      d={d}
      className={styles.routePath}
      style={length ? ({ ['--route-length' as string]: `${length}` }) : undefined}
    />
  );
}
```

Import `{ useRef, useMemo, useState, useEffect }` at the top if not already present.

- [ ] **Step 3: Manual verification**

Re-add the throwaway usage with real spots:

```mdx
import { TravelMap } from '@/components/Blog/TravelMap';
export const testSpots = [
  { name: '츠키시마', lat: 35.6636, lng: 139.7882 },
  { name: '긴자', lat: 35.6716, lng: 139.7657 },
  { name: '우에노', lat: 35.7099, lng: 139.7742 },
];
<TravelMap geoRegion="tokyo-23ku" spots={testSpots} client:visible />
```

Visit the page. Expected: dashed curved line connects the three coordinates. On first hydration the path animates from 0 → full length over 800ms. Refreshing re-runs the animation.

Remove the test usage.

- [ ] **Step 4: Commit**

```bash
git add src/components/Blog/TravelMap/
git commit -m "feat(travel-map): draw route path with catmull-rom and draw-in animation"
```

---

## Task 6: `SpotMarker` — numbered dot + glow + hover tooltip + click-to-scroll + keyboard a11y

**Goal:** Full desktop interaction for a single spot. Extract into its own component to keep `TravelMap.tsx` focused.

**Files:**
- Create: `src/components/Blog/TravelMap/SpotMarker.tsx`
- Create: `src/components/Blog/TravelMap/TravelMapTooltip.tsx`
- Modify: `src/components/Blog/TravelMap/TravelMap.tsx`
- Modify: `src/components/Blog/TravelMap/styles.module.scss`

- [ ] **Step 1: Add marker + tooltip styles**

Append to `styles.module.scss`:

```scss
.spotGlow {
  fill: var(--color-primary, #4e7a3e);
  fill-opacity: 0.15;
  pointer-events: none;
}

.spotDot {
  fill: var(--color-primary, #4e7a3e);
  stroke: var(--color-surface, #ffffff);
  stroke-width: 2;
  cursor: pointer;
  transition: r 200ms ease;
}

.spotDot.active,
.spotDot:hover {
  // Active radius handled via attr from React; retain for keyboard :focus-visible
}

.spotDot:focus-visible {
  outline: 2px solid var(--color-primary, #4e7a3e);
  outline-offset: 2px;
}

.spotNumber {
  fill: var(--color-surface, #ffffff);
  font-size: 12px;
  font-weight: 700;
  text-anchor: middle;
  dominant-baseline: central;
  pointer-events: none;
  user-select: none;
}

.tooltip {
  position: absolute;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #212529);
  border: 1px solid var(--color-border, #dee2e6);
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  max-width: 14rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  pointer-events: none;
  z-index: 2;
  font-size: 0.8125rem;
  line-height: 1.4;
}

:global(.dark) .tooltip {
  background: var(--color-surface, #2a2a2a);
  color: var(--color-text, #e9ecef);
  border-color: var(--color-border, #3a3a3a);
}

.tooltipTitle {
  font-weight: 600;
  margin: 0 0 0.125rem;
}

.tooltipDesc {
  margin: 0;
  opacity: 0.75;
}

.srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

- [ ] **Step 2: Create `TravelMapTooltip.tsx`**

```tsx
// src/components/Blog/TravelMap/TravelMapTooltip.tsx
import styles from './styles.module.scss';

export type TooltipProps = {
  title: string;
  description?: string;
  x: number;
  y: number;
  containerWidth: number;
};

const TOOLTIP_WIDTH = 224; // 14rem at 16px base
const OFFSET = 12;

export function TravelMapTooltip({ title, description, x, y, containerWidth }: TooltipProps) {
  let left = x + OFFSET;
  let top = Math.max(y - 10, 8);
  if (left + TOOLTIP_WIDTH > containerWidth) {
    left = Math.max(x - TOOLTIP_WIDTH - OFFSET, 8);
  }

  return (
    <div className={styles.tooltip} style={{ left, top }} role="tooltip">
      <p className={styles.tooltipTitle}>{title}</p>
      {description && <p className={styles.tooltipDesc}>{description}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Create `SpotMarker.tsx`**

```tsx
// src/components/Blog/TravelMap/SpotMarker.tsx
import styles from './styles.module.scss';
import type { DiarySpot } from './types';

export type SpotMarkerProps = {
  spot: DiarySpot;
  index: number;
  x: number;
  y: number;
  active: boolean;
  onActivate: (index: number) => void;
  onScroll: (spot: DiarySpot) => void;
  onBlurDeactivate: () => void;
};

export function SpotMarker({ spot, index, x, y, active, onActivate, onScroll, onBlurDeactivate }: SpotMarkerProps) {
  const radius = active ? 8 : 5;
  const ariaLabel = spot.description ? `${spot.name}, ${spot.description}` : spot.name;

  return (
    <g>
      <circle cx={x} cy={y} r={10} className={styles.spotGlow} aria-hidden="true" />
      <circle
        cx={x}
        cy={y}
        r={radius}
        className={`${styles.spotDot} ${active ? styles.active : ''}`}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        onMouseEnter={() => onActivate(index)}
        onMouseLeave={onBlurDeactivate}
        onFocus={() => onActivate(index)}
        onBlur={onBlurDeactivate}
        onClick={() => onScroll(spot)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onScroll(spot);
          }
        }}
      />
      <text x={x} y={y} className={styles.spotNumber} aria-hidden="true">{index + 1}</text>
    </g>
  );
}
```

- [ ] **Step 4: Wire markers and tooltip into `TravelMap.tsx`**

Add imports:

```tsx
import { SpotMarker } from './SpotMarker';
import { TravelMapTooltip } from './TravelMapTooltip';
```

Inside the `TravelMap` function, add state and the scroll handler above the `return`:

```tsx
  const [activeSpotIndex, setActiveSpotIndex] = useState<number | null>(null);

  const scrollToAnchor = (spot: typeof spots[number]) => {
    if (!spot.anchor) return;
    const el = document.getElementById(spot.anchor);
    if (!el) {
      if (import.meta.env.DEV) {
        console.warn(`[TravelMap] anchor #${spot.anchor} not found for spot "${spot.name}"`);
      }
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
```

Extend the SVG render to include spots and a sr-only list, and the tooltip. Replace the current SVG block with:

```tsx
      {geo.status === 'ready' && projectionInfo && (
        <>
          <svg
            className={styles.svg}
            viewBox={`0 0 ${dims.width} ${dims.height}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="여행 루트 지도"
          >
            <g className="prefecture">
              {geo.data.features.map((f, i) => (
                <path key={i} d={projectionInfo.pathGen(f as d3.ExtendedFeature) ?? ''} className={styles.prefecturePath} />
              ))}
            </g>
            {spots.length >= 2 && (
              <g className="route">
                <RoutePath spots={spots} projection={projectionInfo.projection} />
              </g>
            )}
            <g className="points">
              {spots.map((spot, i) => {
                const [x, y] = projectionInfo.projection([spot.lng, spot.lat]) ?? [0, 0];
                return (
                  <SpotMarker
                    key={i}
                    spot={spot}
                    index={i}
                    x={x}
                    y={y}
                    active={activeSpotIndex === i}
                    onActivate={setActiveSpotIndex}
                    onScroll={scrollToAnchor}
                    onBlurDeactivate={() => setActiveSpotIndex(null)}
                  />
                );
              })}
            </g>
          </svg>
          {activeSpotIndex !== null && (() => {
            const spot = spots[activeSpotIndex];
            const [x, y] = projectionInfo.projection([spot.lng, spot.lat]) ?? [0, 0];
            return (
              <TravelMapTooltip
                title={spot.name}
                description={spot.description}
                x={x}
                y={y}
                containerWidth={dims.width}
              />
            );
          })()}
          <ol className={styles.srOnly}>
            {spots.map((spot, i) => (
              <li key={i}>
                {spot.anchor ? <a href={`#${spot.anchor}`}>{spot.name}</a> : spot.name}
              </li>
            ))}
          </ol>
        </>
      )}
```

- [ ] **Step 5: Manual verification (desktop)**

With the test usage (spots with at least two entries and an `anchor` pointing at a real section id), verify on `bun dev`:

1. Hovering a dot: glow + dot grows to r=8 + tooltip shows name/description near the dot.
2. Tooltip flips to the left when near the right edge (add a spot near the right edge to test).
3. Clicking a dot with valid `anchor` → page scrolls to that section smoothly.
4. Clicking a dot without `anchor` → no navigation, no console error.
5. Clicking a dot with unknown `anchor` → `console.warn` in dev, no scroll.
6. Tab into the SVG → focus ring appears on first dot; arrow/tab moves to next; Enter triggers scroll.
7. Screen-reader-only `<ol>` present in DOM (inspect).

- [ ] **Step 6: Commit**

```bash
git add src/components/Blog/TravelMap/
git commit -m "feat(travel-map): numbered spot markers with tooltip, click-to-scroll, a11y"
```

---

## Task 7: Mobile two-tap interaction

**Goal:** On touch devices (`pointer: coarse`), first tap shows the tooltip and activates the dot; second tap on the same dot scrolls. Tapping outside deactivates.

**Files:**
- Modify: `src/components/Blog/TravelMap/TravelMap.tsx`
- Modify: `src/components/Blog/TravelMap/SpotMarker.tsx`

- [ ] **Step 1: Detect coarse pointer in `TravelMap.tsx`**

Inside the `TravelMap` component, above `return`, add:

```tsx
  const isCoarsePointer = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
    [],
  );
```

- [ ] **Step 2: Change marker behavior on coarse pointer**

Replace the `onClick` handler passed to `SpotMarker` with a tap-aware handler:

```tsx
  const handleSpotTap = (spot: typeof spots[number], index: number) => {
    if (isCoarsePointer) {
      if (activeSpotIndex === index) {
        scrollToAnchor(spot);
      } else {
        setActiveSpotIndex(index);
      }
      return;
    }
    scrollToAnchor(spot);
  };
```

Update the `SpotMarker` prop wiring:

```tsx
                    onScroll={() => handleSpotTap(spot, i)}
```

- [ ] **Step 3: Handle "tap outside" to deactivate on mobile**

Inside the `wrapperRef` div, add a click handler on the container:

```tsx
    <div
      ref={wrapperRef}
      className={`${styles.wrapper} ${className ?? ''}`}
      onClick={(e) => {
        if (!isCoarsePointer) return;
        // Deactivate if click did not land on a spot dot
        const target = e.target as HTMLElement;
        if (!target.closest('circle.travel-map-spot-dot')) {
          setActiveSpotIndex(null);
        }
      }}
    >
```

Add the marker class hook in `SpotMarker.tsx` (append to the existing className):

```tsx
        className={`${styles.spotDot} travel-map-spot-dot ${active ? styles.active : ''}`}
```

- [ ] **Step 4: Suppress hover-based activation on coarse pointer**

In `SpotMarker.tsx`, the `onMouseEnter`/`onMouseLeave` handlers do not fire on touch, but the `onFocus` fired by tap will conflict with the two-step flow. Guard `onFocus`:

```tsx
        onFocus={(e) => {
          // Ignore focus caused by touch; tap handler manages state on coarse pointers
          if ((e as any).nativeEvent.sourceCapabilities?.firesTouchEvents) return;
          onActivate(index);
        }}
```

TS doesn't type `sourceCapabilities`, so cast is acceptable here. If TS is stricter, replace with:

```tsx
        onFocus={(e) => {
          const native = e.nativeEvent as FocusEvent & { sourceCapabilities?: { firesTouchEvents?: boolean } };
          if (native.sourceCapabilities?.firesTouchEvents) return;
          onActivate(index);
        }}
```

- [ ] **Step 5: Manual verification (mobile)**

Use Chrome DevTools → Toggle device toolbar (Cmd+Shift+M) → Pixel 5 profile. Hard-refresh the page.

1. Tap a dot: tooltip appears, dot grows to r=8, no scroll.
2. Tap the same dot again: scrolls to anchor.
3. Tap a different dot: active state transfers, tooltip moves, no scroll.
4. Tap outside any dot (on the prefecture background): active state clears, tooltip disappears.

- [ ] **Step 6: Commit**

```bash
git add src/components/Blog/TravelMap/
git commit -m "feat(travel-map): two-tap interaction for mobile"
```

---

## Task 8: Details collapse for original screenshot + error fallback

**Goal:** Render an expandable `<details>` block under the map that reveals `originalImageSrc`. On GeoJSON fetch error, show the screenshot as the primary fallback.

**Files:**
- Modify: `src/components/Blog/TravelMap/TravelMap.tsx`
- Modify: `src/components/Blog/TravelMap/styles.module.scss`

- [ ] **Step 1: Add styles**

Append to `styles.module.scss`:

```scss
.detailsBlock {
  margin-top: 0.5rem;

  > summary {
    cursor: pointer;
    font-size: 0.8125rem;
    color: var(--color-text-muted, #868e96);
    list-style: none;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;

    &::marker,
    &::-webkit-details-marker { display: none; }

    &::before {
      content: '▸';
      display: inline-block;
      transition: transform 150ms ease;
    }
  }

  &[open] > summary::before {
    transform: rotate(90deg);
  }

  > img {
    display: block;
    max-width: 100%;
    height: auto;
    margin-top: 0.5rem;
    border-radius: 0.375rem;
  }
}

.errorFallbackBlock {
  margin-top: 0.5rem;

  > p {
    font-size: 0.8125rem;
    color: var(--color-text-muted, #868e96);
    margin: 0 0 0.5rem;
  }

  > img {
    display: block;
    max-width: 100%;
    height: auto;
    border-radius: 0.375rem;
  }
}
```

- [ ] **Step 2: Restructure `TravelMap.tsx` return to handle all three statuses**

Change the outer structure so `originalImageSrc` renders outside the map wrapper (so the error state can upgrade the screenshot to the primary content). Replace the component's `return (...)` with:

```tsx
  return (
    <div className={className}>
      <div
        ref={wrapperRef}
        className={styles.wrapper}
        onClick={(e) => {
          if (!isCoarsePointer) return;
          const target = e.target as HTMLElement;
          if (!target.closest('circle.travel-map-spot-dot')) {
            setActiveSpotIndex(null);
          }
        }}
      >
        {geo.status === 'loading' && <div className={styles.loading}>지도 불러오는 중…</div>}
        {geo.status === 'error' && (
          <div className={styles.errorNotice}>지도를 불러오지 못했습니다</div>
        )}
        {geo.status === 'ready' && projectionInfo && (
          <>
            {/* existing <svg>...</svg>, tooltip, sr-only <ol> block unchanged */}
          </>
        )}
      </div>
      {geo.status === 'error' && originalImageSrc && (
        <div className={styles.errorFallbackBlock}>
          <img src={originalImageSrc} alt="여행 루트 (원본 구글 맵 스크린샷)" />
        </div>
      )}
      {geo.status !== 'error' && originalImageSrc && (
        <details className={styles.detailsBlock}>
          <summary>구글 맵 원본 보기</summary>
          <img src={originalImageSrc} alt="여행 루트 (원본 구글 맵 스크린샷)" />
        </details>
      )}
    </div>
  );
```

(Move the existing content — svg, tooltip, sr-only `<ol>` — into the `geo.status === 'ready'` branch unchanged.)

- [ ] **Step 3: Manual verification**

1. Normal load → `<details>` renders below the map; clicking `구글 맵 원본 보기` reveals the image; clicking again collapses. The `▸` indicator rotates to `▾` when open.
2. Simulate a fetch error: in DevTools → Network → block `/maps/tokyo-23ku.geojson` → hard-refresh. Expected: the map wrapper shows "지도를 불러오지 못했습니다"; below it, the original screenshot renders at full size (not in a `<details>`).
3. No `originalImageSrc` passed → neither block renders.

- [ ] **Step 4: Commit**

```bash
git add src/components/Blog/TravelMap/
git commit -m "feat(travel-map): details collapse for original screenshot + error fallback"
```

---

## Task 9: CSS tokens + dark mode verification

**Goal:** Confirm the component adapts to dark mode and project CSS variables. Remove any hardcoded fallback colors that should live in variables.

**Files:**
- Modify: `src/components/Blog/TravelMap/styles.module.scss`
- Read: `src/assets/styles/global.css`

- [ ] **Step 1: Identify available CSS variables**

```bash
grep -E '^\s+--(color|background|foreground|primary|border|muted)' src/assets/styles/global.css | head -40
```

Cross-reference the tokens used in `styles.module.scss` with what actually exists in `global.css`. If the variable I used does not exist, either:
- Replace with an existing token (e.g., `--foreground`, `--background`, `--primary`, `--border`, `--muted`, `--muted-foreground`), or
- Add a new token in `global.css` (only if genuinely missing and widely needed).

- [ ] **Step 2: Update `styles.module.scss` to use actual project tokens**

Typical shadcn-style projects use `--background`, `--foreground`, `--primary`, `--primary-foreground`, `--border`, `--muted`, `--muted-foreground`. Update the file to bind to these. For example:

```scss
.wrapper {
  background: hsl(var(--background));
}
.prefecturePath {
  fill: hsl(var(--muted));
  stroke: hsl(var(--border));
}
.routePath {
  stroke: hsl(var(--primary));
}
.spotGlow { fill: hsl(var(--primary)); }
.spotDot {
  fill: hsl(var(--primary));
  stroke: hsl(var(--background));
}
.spotNumber { fill: hsl(var(--primary-foreground)); }
.tooltip {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  border-color: hsl(var(--border));
}
.tooltipDesc { color: hsl(var(--muted-foreground)); }
.loading, .errorNotice { color: hsl(var(--muted-foreground)); }
.detailsBlock > summary { color: hsl(var(--muted-foreground)); }
.errorFallbackBlock > p { color: hsl(var(--muted-foreground)); }
```

Remove the `:global(.dark)` override blocks — CSS variables handle dark mode automatically.

(Adjust variable names to match what Step 1 found — the list above is an educated guess, not authoritative.)

- [ ] **Step 3: Manual verification**

1. Toggle dark mode via the site's theme toggle (top-right nav).
2. Map colors invert: prefecture polygons become dark grey, route stroke stays visible, tooltip background follows theme, dot number stays readable.
3. No FOUC on theme change — variables flip instantly.

- [ ] **Step 4: Commit**

```bash
git add src/components/Blog/TravelMap/styles.module.scss
git commit -m "style(travel-map): bind to shadcn CSS variables for dark mode"
```

---

## Task 10: Migrate `25-01-tokyo/01_01-20.mdx` to `<TravelMap>`

**Goal:** Replace the existing `<ImageLoader>` route screenshot with `<TravelMap>`, remove the `방문한 곳` bullet list, and wire spot anchors to the actual section ids.

**Files:**
- Modify: `src/content/blog/diary/25-01-tokyo/01_01-20.mdx`

- [ ] **Step 1: Collect spot coordinates**

From the current post, the narrated day-1 spots are:
- 나리타 공항 (arrival)
- 모헤지 (츠키시마 몬자야키)
- 이토야 긴자 (stationery)
- 아메요코 상점가 (market)
- 히츠지 (우에노 양고기)

For each, look up the place on Google Maps, right-click → coordinates, and record to 4 decimals. Reference values (verify; they may drift by a few meters):

| Spot | lat | lng |
|---|---|---|
| 나리타 공항 | 35.7719 | 140.3929 |
| 모헤지 (츠키시마) | 35.6636 | 139.7882 |
| 이토야 긴자 | 35.6716 | 139.7657 |
| 아메요코 상점가 | 35.7099 | 139.7742 |
| 히츠지 (우에노) | 35.7089 | 139.7746 |

Adjust with your own lookups if any differ.

- [ ] **Step 2: Determine the target anchor ids**

Run the same DevTools snippet from Task 1 Step 1 on the live 01_01-20 page:

```js
Array.from(document.querySelectorAll('.article-entry h2, .article-entry h3')).map(h => ({ text: h.textContent, id: h.id }))
```

Record the slug for each `h3`: `여행 목적`, `츠키시마 몬쟈 스트리트`, `긴자`, `우에노`. The anchor slug depends on the `rehype-slug` output (e.g. `츠키시마-몬쟈-스트리트`).

- [ ] **Step 3: Edit the MDX**

At the top of `src/content/blog/diary/25-01-tokyo/01_01-20.mdx` (after existing imports), add:

```mdx
import { TravelMap } from '@/components/Blog/TravelMap';

export const daySpots = [
  { name: '나리타 공항',       lat: 35.7719, lng: 140.3929, description: '도착',        anchor: '여행-목적' },
  { name: '모헤지 (츠키시마)', lat: 35.6636, lng: 139.7882, description: '몬자야키',    anchor: '츠키시마-몬쟈-스트리트' },
  { name: '이토야 긴자',       lat: 35.6716, lng: 139.7657, description: '문구점',      anchor: '긴자' },
  { name: '아메요코 상점가',   lat: 35.7099, lng: 139.7742, description: '상점가',      anchor: '우에노' },
  { name: '히츠지 (우에노)',   lat: 35.7089, lng: 139.7746, description: '양고기',      anchor: '우에노' },
];
```

(Replace anchor slugs with whatever Step 2 observed.)

Replace this block:

```mdx
### 루트

<ImageLoader src="/files/blog/diary/25-01-tokyo/assets/CleanShot_2026-02-16_23.09.11@2x.png" alt="route" />

### 방문한 곳

- 우에노
- 이케부쿠로
- 긴자
- 아메요코 상점가
```

with:

```mdx
### 루트

<TravelMap
  geoRegion="tokyo-23ku"
  spots={daySpots}
  originalImageSrc="/files/blog/diary/25-01-tokyo/assets/CleanShot_2026-02-16_23.09.11@2x.png"
  client:visible
/>
```

Also update `TableOfContents` (lines 174–182 of the file) to drop the `방문한 곳` item:

```mdx
<TableOfContents>
- 루트 및 방문한 곳
  - 루트
- 일정
  - 츠키시마 몬쟈 스트리트
  - 긴자
  - 우에노
</TableOfContents>
```

- [ ] **Step 4: Manual verification**

Hard-refresh the page `/blog/diary/25-01-tokyo/01_01-20`.

1. Map renders with 5 numbered dots in Tokyo 23 wards. Narita Airport sits outside Tokyo's 23-ward boundary — the dot should appear near the top-right corner of the SVG (fitExtent frames it correctly; it just sits on the surrounding blank area). Verify visually; if the dot is clipped, relax `PADDING` in `TravelMap.tsx`.
2. Route dashes animate in on first mount.
3. Hover dot 2 (모헤지) → tooltip shows name + description. Click → page scrolls to the 츠키시마 section.
4. `<details>` toggle reveals the original screenshot.
5. ToC does not list `방문한 곳`.

Special case if Narita dot is clipped: the cleanest fix is to exclude it from `daySpots` (flight arrival doesn't need to be on the map). Alternatively, expand PADDING asymmetrically. Prefer excluding Narita if it clutters the layout.

- [ ] **Step 5: Commit**

```bash
git add src/content/blog/diary/25-01-tokyo/01_01-20.mdx
git commit -m "feat(blog): migrate 25-01-tokyo/01_01-20 to TravelMap"
```

---

## Task 11: Migrate `25-01-tokyo/02_01-21.mdx` to `<TravelMap>`

**Goal:** Same treatment for day 2. Contents of day 2 may differ — read the file first and map spots accordingly.

**Files:**
- Read: `src/content/blog/diary/25-01-tokyo/02_01-21.mdx`
- Modify: `src/content/blog/diary/25-01-tokyo/02_01-21.mdx`

- [ ] **Step 1: Identify day-2 spots**

```bash
grep -E '^###|^##' src/content/blog/diary/25-01-tokyo/02_01-21.mdx
```

List the narrative sections. For each substantive location mentioned, assemble the same table of `{name, lat, lng, description, anchor}` as in Task 10 Step 1.

- [ ] **Step 2: Edit the MDX**

Mirror Task 10 Step 3: add `import { TravelMap }` and `export const daySpots = [...]`, replace any existing route screenshot + 방문한 곳 bullet list with `<TravelMap ... />`. Update `TableOfContents` accordingly.

If day 2 has no existing route screenshot (common for middle days), skip `originalImageSrc` and still add `<TravelMap>` under the first `### 루트` section (creating that section if it doesn't exist).

- [ ] **Step 3: Manual verification**

Hard-refresh `/blog/diary/25-01-tokyo/02_01-21`. Same checks as Task 10 Step 4, adjusted for day-2 spot count.

- [ ] **Step 4: Commit**

```bash
git add src/content/blog/diary/25-01-tokyo/02_01-21.mdx
git commit -m "feat(blog): migrate 25-01-tokyo/02_01-21 to TravelMap"
```

---

## Task 12: Playwright e2e spec + final verification

**Goal:** Lock in regression protection for the user-facing behavior on both chromium and mobile-chrome.

**Files:**
- Create: `e2e/travel-map.noauth.spec.ts`

- [ ] **Step 1: Write the e2e spec**

```ts
// e2e/travel-map.noauth.spec.ts
import { expect, test } from '@playwright/test';

const POST_URL = '/blog/diary/25-01-tokyo/01_01-20';

test.describe('TravelMap — day 1', () => {
  test('renders markers matching the spots export', async ({ page }) => {
    await page.goto(POST_URL);

    // client:visible hydration: scroll the map into view and wait for SVG spots
    const mapWrapper = page.locator('svg[aria-label="여행 루트 지도"]');
    await mapWrapper.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);

    const dots = mapWrapper.locator('circle.travel-map-spot-dot');
    const count = await dots.count();
    expect(count).toBeGreaterThanOrEqual(3);
    // 1편의 daySpots 길이와 일치해야 한다
    expect(count).toBe(5);
  });

  test('hover on a dot shows tooltip', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'hover is desktop-only');
    await page.goto(POST_URL);
    const map = page.locator('svg[aria-label="여행 루트 지도"]');
    await map.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);

    await map.locator('circle.travel-map-spot-dot').first().hover();
    const tooltip = page.locator('[role="tooltip"]');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('나리타'); // first spot
  });

  test('click on a dot scrolls to its anchor', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'desktop click test');
    await page.goto(POST_URL);
    const map = page.locator('svg[aria-label="여행 루트 지도"]');
    await map.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);

    // Click the 2nd dot (모헤지/츠키시마)
    await map.locator('circle.travel-map-spot-dot').nth(1).click();
    await page.waitForTimeout(600); // smooth scroll

    // Heading for 츠키시마 must be near the viewport top
    const heading = page.getByRole('heading', { name: /츠키시마 몬쟈 스트리트/ });
    await expect(heading).toBeInViewport();
  });

  test('details toggle reveals original screenshot', async ({ page }) => {
    await page.goto(POST_URL);
    const map = page.locator('svg[aria-label="여행 루트 지도"]');
    await map.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);

    const details = page.getByText('구글 맵 원본 보기');
    await details.click();
    const img = page.locator('img[alt*="구글 맵 스크린샷"]');
    await expect(img).toBeVisible();
  });

  test('mobile: first tap shows tooltip only; second tap scrolls', async ({ page, browserName, isMobile }) => {
    test.skip(!isMobile, 'mobile-only behavior');
    await page.goto(POST_URL);
    const map = page.locator('svg[aria-label="여행 루트 지도"]');
    await map.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);

    const firstDot = map.locator('circle.travel-map-spot-dot').nth(1);
    await firstDot.tap();

    const tooltip = page.locator('[role="tooltip"]');
    await expect(tooltip).toBeVisible();

    // Heading should NOT be in viewport yet
    const heading = page.getByRole('heading', { name: /츠키시마 몬쟈 스트리트/ });
    await expect(heading).not.toBeInViewport();

    // Second tap on same dot
    await firstDot.tap();
    await page.waitForTimeout(600);
    await expect(heading).toBeInViewport();
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
bun x playwright test travel-map.noauth.spec.ts
```

Expected: all tests pass on `chromium`; the mobile test passes on `mobile-chrome`. Skipped tests appear as skipped (not failures).

If any test fails, read the trace from `e2e/test-results/` and adjust either the component or the test. Common failure modes:
- `Tooltip not visible`: hydration race — increase `waitForTimeout(2000)` to 3000.
- `Heading not in viewport`: mdx anchor mismatch — verify the spot's `anchor` field against the actual DOM heading id.

- [ ] **Step 3: Final manual sweep**

```bash
bun astro check
bun run build
```

Both must complete with 0 errors. A warning about unused `CleanShot_2026-02-16_23.09.11@2x.png` is **not** expected because the image is still referenced via `originalImageSrc`.

- [ ] **Step 4: Commit**

```bash
git add e2e/travel-map.noauth.spec.ts
git commit -m "test(travel-map): playwright e2e for desktop and mobile"
```

- [ ] **Step 5: Push and open PR (optional)**

```bash
git push -u origin feat/travel-map
gh pr create --title "feat: interactive travel map for diary posts" --body "$(cat <<'EOF'
## Summary
- New `<TravelMap>` React island renders an interactive D3 SVG map replacing the flat route screenshot in Tokyo diary posts
- Per-post numbered spots, hover tooltip, click-to-scroll to in-post section; two-tap pattern on mobile
- Original Google Maps screenshot preserved inside a collapsible `<details>` block

## Design spec
`_docs/interactive-travel-map-plan.md`

## Test plan
- [x] `bun x playwright test travel-map.noauth.spec.ts` on chromium + mobile-chrome
- [x] `bun astro check`
- [x] `bun run build`
- [x] Manual dark-mode toggle spot-check

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Notes

**Spec coverage check:**
- §3 Decision 1 (Tokyo 23 wards GeoJSON) → Task 1
- §3 Decision 2 (per-post scope) → covered by MDX authoring pattern in Tasks 10–11
- §3 Decision 3 (inline spots export) → Task 10 Step 3
- §3 Decision 4 (hover + click-to-scroll + two-tap) → Tasks 6 (desktop) + 7 (mobile)
- §3 Decision 5 (preset registry) → Task 2
- §3 Decision 6 (placement, remove bullet list) → Task 10 Step 3
- §3 Decision 7 (details collapse) → Task 8
- §3 Secondary (numbered dots) → Task 6 Step 3 (`<text>` element)
- §3 Secondary (catmull-rom, draw-in animation) → Task 5
- §3 Secondary (responsive viewBox + px360) → Task 4 styles.module.scss
- §3 Secondary (dark mode via CSS variables) → Task 9
- §9 Edge case: fetch error fallback → Task 8 Step 2
- §9 Edge case: empty spots → Task 5 `spots.length >= 2` guard
- §9 Edge case: anchor missing → Task 6 Step 4 `scrollToAnchor`
- §10 Testing plan → Task 12

**Placeholder scan:** No `TBD`, `TODO`, or "implement later" markers. All code blocks are complete.

**Type consistency:**
- `DiarySpot` signature (`name/lat/lng/description?/anchor?`) consistent across types.ts, SpotMarker.tsx props, MDX usage.
- `TravelMapProps.spots` used as `typeof spots[number]` in handlers — matches `DiarySpot[]`.
- `GeoRegion` is a union derived from `GEO_REGIONS` keys; `geoRegion` prop type reflects this.
- `UseGeoDataResult` discriminated union consistent with how `TravelMap.tsx` branches on `geo.status`.

**Known trade-offs / follow-ups:**
- The Narita Airport dot sits outside the 23-ward boundary and may look awkward; Task 10 Step 4 includes a fallback to drop it if visual evaluation rejects.
- The `scrollToAnchor` uses Korean slugs as ids. If another part of the site later adds english-id conventions, spot `anchor` values must be updated in both diary entries.

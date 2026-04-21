# PolaroidGallery — Scattered Analog Photos with Handwritten Captions

## Context

The Tokyo trip diary series uses one MDX entry per day under `src/content/blog/diary/25-01-tokyo/`. Day 1 (`01_01-20.mdx`) uses the existing `DiaryCarousel` (Embla-based grid). Day 2 (`02_01-21.mdx`) needed a visually distinct treatment: scattered analog Polaroids on a photo-album spread (varied rotations, soft overlap, nostalgic tone).

Each Polaroid opens a fullscreen lightbox on click with a per-image title at top and description at bottom. Handwritten-style captions appear under each Polaroid using Tegaki (stroke-by-stroke handwriting animation).

## Final Architecture

Three building blocks plus a few supporting changes:

1. **`PolaroidGallery.astro`** — Server-rendered scattered polaroid cards. Uses `tegaki/astro` adapter to pre-render handwriting `<canvas>` markup at build time. CSS-only hover animations. Vanilla JS click binding dispatches to a global store.

2. **`PolaroidLightbox.tsx`** — React island mounted once globally in `mdLayout.astro` (client:idle). Subscribes to a nanostore atom and renders the extended `ImageLightbox` with title/description render props.

3. **`ImageLightbox.tsx`** — Extended with an optional `titleRender` prop (top-center). Existing `toolbarRender` (bottom-center) reused for description. Additive change; no breakage for `DiaryCarousel`.

### Why Astro for the gallery, React for the lightbox

The gallery itself is static markup — positions, rotations, and captions are all derivable from item data. Astro renders it once at build time, which eliminates:

- Tegaki font loading reliability issues on production (canvas strokes baked into HTML before any JS runs).
- SSR/CSR hydration mismatches (Astro doesn't hydrate).
- Client bundle weight from framer-motion and `tegaki/react`.

The lightbox has rich interactive behavior (drag gestures, zoom, keyboard navigation, swipe-to-change, portal rendering) that benefits from React and framer-motion. Keeping it as a single globally mounted island avoids duplicating the modal per gallery instance.

### Click-to-open bridge

```
[Polaroid <button> click]
   → vanilla JS handler in PolaroidGallery.astro's <script>
      → openPolaroidLightbox(items, index)     // nanostore setter
         → $polaroidLightbox atom update
            → PolaroidLightbox.tsx re-renders (useStore hook)
               → ImageLightbox visible=true, shows item
```

## Files

### Created

- `src/components/Blog/DiaryGallery/PolaroidGallery.astro`
  - Props: `items: PolaroidImage[]`
  - Registers Caveat bundle once per render with `<TegakiRenderer font={caveatBundle} bundle loadFont />`
  - Renders polaroid cards with deterministic seeded pseudo-random rotation/offset/scale
  - Tegaki captions server-rendered inline (no client JS required)
  - Inline `<script>` binds click handlers; idempotent (`data-polaroid-bound` flag) and re-binds on `astro:page-load` for view transitions
- `src/components/Blog/DiaryGallery/PolaroidLightbox.tsx`
  - Subscribes to `$polaroidLightbox` via `@nanostores/react` `useStore`
  - Passes `titleRender` and `toolbarRender` into `ImageLightbox`
- `src/store/polaroid.ts`
  - `$polaroidLightbox: atom<{ items, index, visible }>`
  - Helpers: `openPolaroidLightbox`, `closePolaroidLightbox`, `setPolaroidLightboxIndex`
- `src/content/blog/diary/25-01-tokyo/02_01-21.mdx`
  - Frontmatter + TOC + section scaffold mirroring Day 1
  - Uses `<PolaroidGallery items={[...]} />` (no client directive needed — Astro component)

### Modified

- `src/components/ui/image-lightbox.tsx`
  - Added optional `titleRender?: (props: { index: number }) => React.ReactNode`
  - Rendered at `absolute left-1/2 top-4 -translate-x-1/2` with `max-w-[60vw]`
  - `toolbarRender` behavior unchanged
- `src/components/Blog/DiaryGallery/types.ts`
  - Added `PolaroidImage` type: `{ src, title, description, caption?, alt?, rotate? }`
- `src/components/Blog/DiaryGallery/index.ts`
  - Exports `PolaroidLightbox` (React island)
  - `PolaroidGallery.astro` imported directly where used (not re-exported)
- `src/layouts/mdLayout.astro`
  - Mounts `<PolaroidLightbox client:idle />` once after `<FloatButton />` so any blog post can use `PolaroidGallery` without explicit mount
- `src/components/Blog/GiscusComp.tsx`
  - `repo` updated from `JunjaK/astro-blog` to `Junjak-Personal/astro-blog` (org migration). `repoId` and `categoryId` unchanged — GitHub preserves global node IDs on repo transfer.
- `nginx.conf`
  - Added `types { font/ttf ttf; font/otf otf; }` block after the default `mime.types` include
  - Extended immutable-cache `location` regex from `js|css|woff2?` to include `ttf|otf`
  - Required because the `ubuntu/nginx:1.18` image's default mime.types was returning `.ttf` as `text/plain`, which browsers reject for `@font-face` loading
- `package.json`
  - Added `tegaki@^0.13.0`

### Deleted

- `src/components/Blog/DiaryGallery/PolaroidGallery.tsx` — replaced by the Astro version

## Visual Design

### Layout

- Mobile: `grid-cols-2` (~6 polaroids visible in one screen)
- Desktop: `grid-cols-3`
- Each polaroid is a `<button>` containing the white Polaroid frame with square image aperture and 48px white bottom strip for the caption

### Deterministic pseudo-random transforms

Seeded by item index so SSR and CSR produce identical output (no hydration risk):

```ts
function seeded(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
```

Ranges (rounded to 4 decimals to avoid framer-motion-style precision mismatches):

| Property     | Range               |
|--------------|---------------------|
| rotate       | -14° to +14°        |
| x offset     | -11% to +11%        |
| y offset     | -6.6% to +15.4%     |
| base scale   | 0.86 to 1.08        |
| hover scale  | baseScale × 1.08    |

### Hover animation (CSS, no framer-motion)

```css
.polaroid-card {
  transform: translate(var(--pl-x), var(--pl-y)) rotate(var(--pl-rotate)) scale(var(--pl-scale));
  transition: transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.polaroid-card:hover {
  transform: translate(var(--pl-x), var(--pl-y)) rotate(0deg) scale(calc(var(--pl-scale) * 1.08));
  z-index: 100 !important;
}
```

The baseline `transform` keeps translate + rotate + scale; hover overrides only rotate (→ 0) and scale. Unhover restores the original transform via CSS transition — no JS state needed.

### Tegaki captions

- Uses bundled Caveat font (88KB small TTF + 250KB full TTF, auto-emitted to `_astro/*.ttf`)
- `clamp(0.72rem, 2.6vw, 1.2rem)` for responsive sizing that fits narrow mobile polaroids
- Captions are optional per item (items 4 and 6 in the scaffold have no caption)

## Supporting Infrastructure

### Image conversion (Day 2 assets)

57 raw `.jpeg` files in `image-assets/blog/diary/25-01-tokyo/01-21/` converted to `.webp` + 256×256 `-thumb.webp` using the project's existing `sharp` dependency via an inline Bun one-liner:

```js
sharp(src).webp({ quality: 82 }).toFile(webp)
sharp(src).resize({ width: 256, height: 256, fit: 'cover' }).webp({ quality: 80 }).toFile(thumb)
```

Files remain in the `01-21/` subdirectory with original UUID names. Actual deployment to RPi (`/home/jun/blog-files/`) still pending via `/publish-images`.

### Production MIME-type incident

After the first production deploy, Tegaki captions didn't render. Root cause chain:

1. `ubuntu/nginx:1.18` default `mime.types` didn't map `.ttf` → browsers received `Content-Type: text/plain` → rejected the `@font-face` source.
2. Cloudflare (Zero Trust tunnel in front of the RPi) cached the `text/plain` response.
3. After fixing nginx and redeploying, a second cache variant keyed by `Origin` header persisted — browsers always send `Origin` on font loads, so users still got the stale variant.

Fixed by (a) nginx.conf change above and (b) manual Cloudflare cache purge for the two hashed TTF URLs.

**The Astro migration makes this class of issue impossible going forward**: the handwriting canvas is serialized into HTML at build time; missing/stale fonts only degrade the font fallback, never the canvas output.

## Verification

Desktop and mobile both tested via Playwright at 1440×900 and 390×844. Production HTML confirmed to contain 4 prerendered `<canvas data-tegaki>` elements and 11 Caveat font references for the Day 2 page.

### End-to-end checks performed

- Polaroid click → lightbox opens with correct title (top-center) and description (bottom-center)
- Arrow keys navigate; title/description update per image
- ESC closes; double-click zoom preserved
- Mobile viewport: 2-column grid, all 6 polaroids visible on one scroll
- Hover: scale up + rotate to 0, unhover restores rotation (CSS-only)
- Day 1 page (DiaryCarousel) still renders — ImageLightbox change is additive
- `bun run build` succeeds (57 pages)

## Out of Scope / Follow-ups

- Writing actual Jan 21 prose (author task)
- Renaming UUID-named Day 2 assets to timestamp-style filenames
- Publishing images to RPi via `/publish-images` (blocking production display)
- Applying the Polaroid style retroactively to Day 1

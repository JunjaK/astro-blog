# DiarySection Redesign: Horizontal 3D Gallery (v0 style)

## Goal

Replace current DiarySection with a scroll-driven horizontal 3D image gallery inspired by the v0 3D gallery template. Each section = full viewport "page" with text above + 3D floating images below.

## UX Flow

```
┌──────────────────────────────┐
│                              │
│   ┌──────────────────────┐   │  ← Text card (slightly above center)
│   │  ## Heading          │   │
│   │  Paragraph text...   │   │
│   │                      │   │
│   └──────────────────────┘   │
│                              │
│  ◄━ [img] [img] [img] ━►    │  ← 3D image planes, horizontally arranged
│                              │     scroll drives L/R movement
└──────────────────────────────┘
```

- Section has extended scroll height (runway) beyond 100vh
- While sticky viewport is pinned, page scroll drives horizontal image movement in 3D canvas
- Images sweep left/right as textured planes with depth variations, cloth deformation, fade/blur
- Click on image → PhotoSlider lightbox
- When scroll runway is exhausted, sticky releases → next section enters

## Architecture

### Component Tree
```
DiaryGallery (wrapper, flex column)
└── DiarySection (variant="webgl")
    ├── <section> with extended height (scroll runway)
    │   └── sticky viewport (100vh)
    │       ├── Canvas (R3F, absolute, covers bottom ~55% of viewport)
    │       │   ├── GalleryScene
    │       │   │   ├── ImagePlane[] (cloth shader, horizontal arrangement)
    │       │   │   └── CameraRig (subtle movement on scroll)
    │       │   └── Lighting (ambient + directional)
    │       └── Text card (HTML overlay, positioned above center, z-10)
    └── PhotoSlider (controlled, outside canvas)
```

### File Changes

| File | Action | Description |
|------|--------|-------------|
| `DiarySectionWebGL.tsx` | **Rewrite** | Horizontal 3D gallery with cloth shader, scroll-driven |
| `DiarySection.tsx` | **Minor update** | Keep variant routing, no structural changes |
| `types.ts` | **Keep** | Already has `variant` prop |
| `DiaryGallery.tsx` | **Keep** | Unchanged wrapper |
| `DiaryImageOverlay.tsx` | **Keep** | Toolbar for PhotoSlider |
| `index.ts` | **Keep** | Same exports |
| `24_12-20.mdx` | **No changes** | Already uses `variant="webgl"` |
| CSS 3D files | **Keep** | `DiarySectionScrollImage.tsx` stays for `css3d` variant (12-19) |

### DiarySectionWebGL.tsx — Key Implementation

**Scroll → Horizontal movement:**
- `useScroll({ target: containerRef })` → `scrollYProgress` (0→1)
- `scrollYProgress` mapped to horizontal offset for all planes
- Each plane has X base position (spaced evenly) + golden-angle Y/Z offsets
- As scroll progresses, all planes translate on X-axis → images sweep past

**Image planes:**
- `planeGeometry args={[1, 1, 32, 32]}` (subdivided for cloth deformation)
- Custom `ShaderMaterial` with cloth vertex shader (adapted from v0):
  - Scroll-velocity-based curving and ripples
  - No hover flag wave (mobile-unfriendly, not needed for diary)
- Fragment shader: blur at horizontal edges, opacity fade
- Scale preserves aspect ratio (auto-detected from texture)

**Depth arrangement (golden angle):**
```ts
for (let i = 0; i < count; i++) {
  const angle = i * 2.618; // golden angle
  x = i * xSpacing; // horizontal even spacing
  y = Math.sin(angle) * maxVerticalOffset;
  z = Math.cos(angle * 0.7) * maxDepthOffset;
}
```

**Fade/blur zones (percentage of horizontal range):**
- Fade in: 0% → 15% from left edge
- Fade out: 85% → 100% at right edge
- Blur mirrors fade (blurred at edges, sharp in center)

**Canvas layout:**
- Canvas covers full viewport but images clustered in lower ~55%
- Y positions: -1.5 to 0.5 (below center, leaving room for text)
- Text card overlaid as HTML `div`, positioned top 15-45% of viewport

**Lighting:**
- `ambientLight intensity={0.5}`
- `directionalLight position={[5, 5, 5]} intensity={0.7}`
- Dark background `#0a0a0a` with fog for depth

**PhotoSlider integration:**
- Click on mesh → `event.stopPropagation()` + set lightbox index/visible
- `PhotoSlider` rendered outside Canvas with controlled state

**Scroll runway height:**
- `max(200, images.length * 50 + 100)vh`
- Shorter than css3d variant (images move horizontally, less scroll needed)

### Performance Considerations

- `dpr={[1, 1.5]}` — limit pixel ratio
- Material pooling (one ShaderMaterial per plane, reuse via uniforms)
- `useTexture` with Suspense for lazy loading
- Texture `colorSpace = SRGBColorSpace`
- No post-processing effects (bloom, etc.) — too heavy for blog

### Mobile

- Fewer visible planes (cap at 6 on mobile)
- Reduced shader subdivision (16x16 instead of 32x32)
- Touch drag support (pointer events on canvas)
- Smaller horizontal offset range

### Reduced Motion Fallback

- Already handled in `DiarySection.tsx` (renders static grid before variant check)

## Verification

1. `bun dev` → navigate to 12-20 diary post
2. Scroll → images sweep horizontally with 3D cloth effect
3. Click image → PhotoSlider lightbox opens
4. Mobile responsive (fewer planes, touch works)
5. 12-19 unchanged (still uses `css3d` variant)
6. `bun run build` succeeds

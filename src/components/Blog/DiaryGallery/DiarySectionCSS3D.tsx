import type { DiaryImage, DiarySectionProps } from './types';
import { Icon } from '@iconify/react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { getBasePathWithUrl } from '@/utils/getBasePathWithUrl';
import { DiaryImageOverlay } from './DiaryImageOverlay';
import { DiaryThumbnailStrip } from './DiaryThumbnailStrip';

// --- Smoothstep for opacity transitions (matches THREE.MathUtils.smoothstep) ---
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// --- 5-slot cycling pattern ported from WebGL buildSlots() ---
type CSSSlot = {
  leftPercent: number;
  translateZ: number;
  widthPercent: number;
  speed: number;
  rotateY: number;
  zDepth: number;
};

const DESKTOP_PATTERNS = [
  { x: -0.8, z: -0.6, scale: 1.05, rotY: -17 },   // Center-left, near
  { x: 2.0, z: -1.4, scale: 1.0, rotY: 20 },      // Right, mid
  { x: 0.3, z: -0.8, scale: 1.05, rotY: -14 },    // Center, near
  { x: -2.2, z: -1.8, scale: 0.98, rotY: -23 },   // Left, far
  { x: 1.2, z: -1.0, scale: 1.02, rotY: 16 },     // Center-right, mid-near
];

const MOBILE_PATTERNS = [
  { x: -0.3, z: -0.4, scale: 1.05, rotY: -8 },
  { x: 0.8, z: -1.0, scale: 1.0, rotY: 10 },
  { x: 0.1, z: -0.5, scale: 1.05, rotY: -6 },
  { x: -0.8, z: -1.2, scale: 0.98, rotY: -12 },
  { x: 0.5, z: -0.7, scale: 1.02, rotY: 8 },
];

function buildCSSSlots(count: number, mobile: boolean): CSSSlot[] {
  const patterns = mobile ? MOBILE_PATTERNS : DESKTOP_PATTERNS;
  const PHI = 1.618033988749895;
  const sizeBoost = count <= 4 ? 1.3 : 1;
  const baseWidth = mobile ? 55 : 36;
  const slots: CSSSlot[] = [];

  for (let i = 0; i < count; i++) {
    const pat = patterns[i % patterns.length];
    const cycle = Math.floor(i / patterns.length);
    const drift = ((i * PHI) % 1 - 0.5) * 0.4;

    const xMapped = pat.x + drift;
    const leftPercent = mobile
      ? ((xMapped + 1.5) / 3) * 40 + 10
      : ((xMapped + 3) / 6) * 65 + 5;

    const z = pat.z - cycle * 0.2;
    const zDepth = Math.min(1, Math.abs(z) / 2);

    slots.push({
      leftPercent: Math.max(2, Math.min(mobile ? 50 : 68, leftPercent)),
      translateZ: z * 100,
      widthPercent: Math.max(mobile ? 48 : 28, Math.min(mobile ? 70 : 50, baseWidth * pat.scale * sizeBoost)),
      speed: 0.6 + (zDepth * 0.8),
      rotateY: pat.rotY + drift * 6,
      zDepth,
    });
  }

  return slots;
}

// --- Individual image card with scroll-driven CSS 3D transforms ---
type CSS3DImageCardProps = {
  image: DiaryImage;
  slot: CSSSlot;
  index: number;
  totalImages: number;
  scrollYProgress: MotionValue<number>;
  onClick: (index: number) => void;
  onLoad: () => void;
};

function CSS3DImageCard({
  image,
  slot,
  index,
  totalImages,
  scrollYProgress,
  onClick,
  onLoad,
}: CSS3DImageCardProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [aspectRatio, setAspectRatio] = useState(0);

  const handleLoad = useCallback(() => {
    if (imgRef.current) {
      const { naturalWidth, naturalHeight } = imgRef.current;
      if (naturalWidth && naturalHeight) {
        setAspectRatio(naturalWidth / naturalHeight);
      }
    }
    onLoad();
  }, [onLoad]);

  // Handle images already loaded before React hydration attached onLoad
  useEffect(() => {
    if (imgRef.current?.complete) {
      handleLoad();
    }
  }, [handleLoad]);

  // Boost width for landscape images so they appear at comparable visual size to portrait
  const effectiveWidth = useMemo(() => {
    if (!aspectRatio || aspectRatio <= 1.2) return slot.widthPercent;
    const boost = Math.min(1.6, aspectRatio * 0.85);
    return Math.min(70, slot.widthPercent * boost);
  }, [aspectRatio, slot.widthPercent]);

  const stagger = index / Math.max(totalImages, 1);

  // Each image occupies its own scroll "window" — appears, floats up, fades out
  const windowSize = 1 / Math.max(totalImages, 1);
  const center = (index + 0.5) * windowSize;

  // Y travel: image is at Y=0 (centered) when scroll reaches its window center
  // Before center → positive Y (below), after center → negative Y (above)
  const travelPerUnit = 600 * slot.speed;
  const y = useTransform(scrollYProgress, (p) => {
    return (center - p) * travelPerUnit;
  });

  // Scroll-driven rotateX wobble — sin(progress × π)
  const rotateX = useTransform(scrollYProgress, (p) => {
    return Math.sin(p * Math.PI) * 8 * (1 - slot.zDepth);
  });

  // Scroll-driven rotateY wobble — base + sin(progress × 2π)
  const rotateY = useTransform(scrollYProgress, (p) => {
    return slot.rotateY + Math.sin(p * Math.PI * 2) * 5;
  });

  // Scale: slight pulse near image's scroll center
  const depthScale = 1 - slot.zDepth * 0.15;
  const scale = useTransform(scrollYProgress, (p) => {
    const dist = Math.abs(p - center) / windowSize;
    return depthScale * (0.85 + 0.15 * Math.max(0, 1 - dist));
  });

  // Opacity: each image fades in/out within its scroll window (overlapping neighbors)
  const opacity = useTransform(scrollYProgress, (p) => {
    const fadeInStart = Math.max(0, center - windowSize * 1.2);
    const fadeInEnd = center - windowSize * 0.3;
    const fadeOutStart = center + windowSize * 0.3;
    const fadeOutEnd = Math.min(1, center + windowSize * 1.2);
    const fadeIn = smoothstep(fadeInStart, fadeInEnd, p);
    const fadeOut = smoothstep(fadeOutStart, fadeOutEnd, p);
    return fadeIn * (1 - fadeOut);
  });

  // Depth-of-field: blur far images
  const blurPx = slot.zDepth > 0.7 ? (slot.zDepth - 0.7) * 3 : 0;

  const resolvedSrc = getBasePathWithUrl(image.src);
  const handleClick = useCallback(() => onClick(index), [onClick, index]);

  return (
    <motion.div
      className="absolute cursor-pointer will-change-transform"
      style={{
        left: `${slot.leftPercent}%`,
        width: `${effectiveWidth}%`,
        top: '100px',
        y,
        opacity,
        rotateX,
        rotateY,
        scale,
        z: slot.translateZ,
        filter: blurPx > 0 ? `blur(${blurPx}px)` : 'none',
      }}
      onClick={handleClick}
    >
      <div
        className="overflow-hidden rounded-xl shadow-2xl shadow-black/50 transition-shadow duration-500 hover:shadow-black/70"
        style={{
          // Soft edge feathering — matches WebGL alphaMap
          maskImage:
            'linear-gradient(to right, transparent, black 2%, black 98%, transparent), linear-gradient(to bottom, transparent, black 2%, black 98%, transparent)',
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in',
        }}
      >
        <img
          ref={imgRef}
          src={resolvedSrc}
          alt={image.alt ?? ''}
          loading="eager"
          className="h-auto w-full object-cover"
          draggable={false}
          onLoad={handleLoad}
          onError={onLoad}
        />
      </div>
    </motion.div>
  );
}

// --- Main CSS 3D Section ---
export function DiarySectionCSS3D({ images, children }: DiarySectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [focused, setFocused] = useState(false);

  const allLoaded = loadedCount >= images.length;

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const scrollHeight = images.length <= 4
    ? Math.max(200, images.length * 50 + 80)
    : images.length * 60 + 100;

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start center', 'end start'],
  });

  const handleImageLoad = useCallback(() => setLoadedCount((c) => c + 1), []);

  const handleImageClick = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxVisible(true);
  }, []);

  const handleLightboxClose = useCallback(() => setLightboxVisible(false), []);

  const slots = useMemo(() => buildCSSSlots(images.length, isMobile), [images.length, isMobile]);

  const toolbarRender = useMemo(() => DiaryImageOverlay({ images }), [images]);
  const lightboxImages = useMemo(
    () => images.map((img) => ({ src: getBasePathWithUrl(img.src), key: img.src })),
    [images],
  );

  // Camera simulation: subtle scale + vertical shift driven by scroll
  const cameraScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.95, 1.02, 0.98]);
  const cameraY = useTransform(scrollYProgress, [0, 1], [20, -30]);

  if (images.length === 0)
    return null;

  return (
    <>
      <section
        ref={containerRef}
        className="relative"
        style={{ height: `${scrollHeight}vh` }}
      >
        <div className="sticky top-0 h-screen overflow-hidden bg-[#0a0a0a]">
          {/* Loading overlay */}
          <div
            className={`absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 transition-opacity duration-300 ${allLoaded ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
          >
            <Icon icon="svg-spinners:bars-rotate-fade" className="text-4xl text-white" />
            <p className="mt-2 text-sm text-white/70">
              {loadedCount}
              {' / '}
              {images.length}
            </p>
          </div>

          {/* 3D image layer with perspective */}
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${allLoaded ? 'opacity-100' : 'opacity-0'}`}
            style={{
              perspective: 800,
              perspectiveOrigin: '50% 50%',
              // Scene-level edge fade (vignette on image layer)
              maskImage:
                'linear-gradient(to right, transparent, black 3%, black 97%, transparent), linear-gradient(to bottom, transparent, black 3%, black 97%, transparent)',
              maskComposite: 'intersect',
              WebkitMaskComposite: 'source-in',
            }}
          >
            {/* Camera simulation wrapper */}
            <motion.div
              className="absolute inset-0"
              style={{
                transformStyle: 'preserve-3d',
                scale: cameraScale,
                y: cameraY,
              }}
            >
              {images.map((image, index) => (
                <CSS3DImageCard
                  key={`${image.src}-${index}`}
                  image={image}
                  slot={slots[index]}
                  index={index}
                  totalImages={images.length}
                  scrollYProgress={scrollYProgress}
                  onClick={handleImageClick}
                  onLoad={handleImageLoad}
                />
              ))}
            </motion.div>
          </div>

          {/* Fog overlay — radial vignette */}
          <div
            className="pointer-events-none absolute inset-0 z-[5]"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 30%, #0a0a0a 90%)',
            }}
          />

          {/* Floating text overlay — scrollable, with focus mode toggle */}
          <div className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4 pt-16 pb-20 transition-opacity duration-300 md:px-8 ${allLoaded ? 'opacity-100' : 'opacity-0'}`}>
            <div
              className={`pointer-events-auto relative mx-auto max-w-2xl overflow-y-auto rounded-xl border border-white/20 px-5 pt-0 pb-3 transition-colors duration-300 md:px-8 md:pt-0 md:pb-4 ${focused ? 'bg-black/80' : ''}`}
              style={{
                maxHeight: 'calc(100vh - 10rem - 60px)',
                textShadow: '0 2px 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)',
              }}
            >
              {/* Focus mode toggle button */}
              <button
                type="button"
                onClick={() => setFocused((v) => !v)}
                className={`sticky top-1 z-20 float-right mt-8 rounded-md p-1 transition-colors ${focused ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80'}`}
                title={focused ? 'Exit focus mode' : 'Focus on text'}
              >
                <Icon icon={focused ? 'material-symbols:visibility-off' : 'material-symbols:center-focus-strong'} className="text-lg" />
              </button>
              <div className="prose prose-base prose-invert [&>:first-child]:mt-0 [&>:last-child]:mb-0 prose-headings:mt-0 prose-headings:mb-2 prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5">
                {children}
              </div>
            </div>
          </div>

          {/* Image thumbnail strip — fixed above footer */}
          <DiaryThumbnailStrip images={images} visible={allLoaded} onSelect={handleImageClick} />
        </div>
      </section>

      {/* Lightbox (controlled, with custom toolbar overlay) */}
      <ImageLightbox
        images={lightboxImages}
        visible={lightboxVisible}
        onClose={handleLightboxClose}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        toolbarRender={toolbarRender}
      />
    </>
  );
}

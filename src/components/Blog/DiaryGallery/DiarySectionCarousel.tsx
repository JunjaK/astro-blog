// 3D Ring Carousel for diary posts — scroll-driven.
// Tall container with sticky viewport. Page scroll maps to ring rotation.
// When all images are scrolled through, the sticky releases and page continues.

import type * as THREE from 'three';
import type { DiarySectionCarouselProps } from './types';
import { Icon } from '@iconify/react';
import { Canvas, invalidate } from '@react-three/fiber';
import { useMotionValueEvent, useScroll } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PhotoSlider } from 'react-photo-view';
import {
  buildCarouselSlots,
  buildSectionAngleRanges,
  getActiveSectionIndex,
  getTotalRotation,
} from './buildCarouselLayout';
import { getCarouselAlphaMap } from './carouselAlphaMap';
import { CarouselImagePlane, type CarouselMeshRegistry, CarouselSceneController } from './CarouselRing';
import { CarouselTextOverlay } from './CarouselTextOverlay';

const SCROLL_PX_PER_IMAGE = 200;

function getGlConfig() {
  const mobile = typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);
  return {
    gl: {
      antialias: !mobile,
      alpha: false,
      powerPreference: 'high-performance' as const,
      preserveDrawingBuffer: false,
    } as const,
    dpr: mobile ? 1.2 : 2,
  };
}

export function DiarySectionCarousel({ sections, children }: DiarySectionCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentRotationRef = useRef({ value: 0 });
  const meshRegistryRef = useRef<CarouselMeshRegistry>(new Map());

  const [loadedCount, setLoadedCount] = useState(0);
  const [currentSection, setCurrentSection] = useState(0);
  const [contextLost, setContextLost] = useState(false);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const allImages = useMemo(() => sections.flatMap((s) => s.images), [sections]);
  const sectionImageCounts = useMemo(() => sections.map((s) => s.images.length), [sections]);
  const totalImages = allImages.length;

  // PhotoSlider data — use original (non-downscaled) image URLs
  const photoSliderItems = useMemo(
    () => allImages.map((img) => ({ src: img.src, key: img.src })),
    [allImages],
  );

  // Ring layout
  const slots = useMemo(() => buildCarouselSlots(sectionImageCounts), [sectionImageCounts]);
  const sectionAngleRanges = useMemo(
    () => buildSectionAngleRanges(sectionImageCounts, totalImages),
    [sectionImageCounts, totalImages],
  );
  const totalRotation = useMemo(() => getTotalRotation(totalImages), [totalImages]);

  // Shared alpha map for rounded corners
  const alphaMap = useMemo(() => getCarouselAlphaMap(), []);

  // Loading state
  const allLoaded = loadedCount >= totalImages;

  // Scroll-driven rotation
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (progress) => {
    currentRotationRef.current.value = progress * totalRotation;

    const sectionIdx = getActiveSectionIndex(
      currentRotationRef.current.value,
      sectionAngleRanges,
    );
    setCurrentSection(sectionIdx);
    invalidate();
  });

  // When all textures loaded, force initial frame
  useEffect(() => {
    if (allLoaded) {
      const id = requestAnimationFrame(() => invalidate());
      return () => cancelAnimationFrame(id);
    }
  }, [allLoaded]);

  // Dot click → smooth scroll to the section's position
  const handleSectionChange = useCallback((index: number) => {
    if (index < 0 || index >= sectionAngleRanges.length || !containerRef.current)
      return;

    const targetAngle = sectionAngleRanges[index].midAngle;
    const progress = totalRotation > 0 ? targetAngle / totalRotation : 0;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const containerTop = rect.top + window.scrollY;
    const scrollRange = container.scrollHeight - window.innerHeight;
    const targetScroll = containerTop + progress * scrollRange;

    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }, [sectionAngleRanges, totalRotation]);

  // Image click → open lightbox
  const handleImageClick = useCallback((globalIndex: number) => {
    setLightboxIndex(globalIndex);
    setLightboxOpen(true);
  }, []);

  const handleImageLoad = useCallback(() => setLoadedCount((c) => c + 1), []);

  const handleCanvasCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    const canvas = gl.domElement;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      setContextLost(true);
    });
    canvas.addEventListener('webglcontextrestored', () => setContextLost(false));
  }, []);

  const { gl: glConfig, dpr } = useMemo(() => getGlConfig(), []);

  if (totalImages === 0)
    return null;

  return (
    <>
      {/* Use CSS calc to avoid SSR hydration mismatch from window.innerHeight */}
      <div ref={containerRef} style={{ height: `calc(${totalImages * SCROLL_PX_PER_IMAGE}px + 100dvh)` }}>
        {/* Sticky viewport — stays visible while user scrolls through the container */}
        <div
          className="sticky top-0"
          style={{ height: 'calc(100dvh - 100px)' }}
        >
          <section className="relative h-full bg-[#0a0a0a]">
            {/* Canvas area — top 40% */}
            <div className="relative" style={{ height: '55%' }}>
              {/* Loading placeholder */}
              {!allLoaded && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center">
                  <Icon icon="svg-spinners:bars-rotate-fade" className="text-4xl text-white" />
                  <p className="mt-2 text-sm text-white/70">
                    {loadedCount}
                    {' / '}
                    {totalImages}
                  </p>
                </div>
              )}

              {/* Context loss fallback */}
              {contextLost && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center">
                  <p className="text-sm text-white/70">WebGL context lost</p>
                </div>
              )}

              <Canvas
                className={`!absolute inset-0 ${allLoaded && !contextLost ? '' : 'invisible'}`}
                camera={{ position: [0, 0, 14], fov: 45 }}
                frameloop="demand"
                dpr={dpr}
                gl={glConfig}
                onCreated={handleCanvasCreated}
              >
                <color attach="background" args={['#0a0a0a']} />

                <CarouselSceneController
                  currentRotationRef={currentRotationRef}
                  meshRegistryRef={meshRegistryRef}
                  totalImages={totalImages}
                >
                  {allImages.map((image, globalIndex) => (
                    <CarouselImagePlane
                      key={`${image.src}-${globalIndex}`}
                      textureSrc={image.src}
                      slot={slots[globalIndex]}
                      globalIndex={globalIndex}
                      meshRegistry={meshRegistryRef}
                      onLoad={handleImageLoad}
                      onImageClick={handleImageClick}
                      alphaMap={alphaMap}
                    />
                  ))}
                </CarouselSceneController>
              </Canvas>
            </div>

            {/* Text area — bottom 60% */}
            {allLoaded && (
              <div className="flex flex-col overflow-hidden h-[55%] md:h-[60%]" style={{ marginTop: '-8%', position: 'relative', zIndex: 100 }}>
                <CarouselTextOverlay
                  currentSection={currentSection}
                  totalSections={sections.length}
                  onSectionChange={handleSectionChange}
                >
                  {children}
                </CarouselTextOverlay>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Lightbox — outside Canvas, uses original full-res images */}
      <PhotoSlider
        images={photoSliderItems}
        visible={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
      />
    </>
  );
}

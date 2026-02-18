import type { DiaryGalleryUnifiedProps, DiaryImage } from './types';
import { Icon } from '@iconify/react';
import { Canvas, invalidate, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useScroll } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { getBasePathWithUrl } from '@/utils/getBasePathWithUrl';
import { buildUnifiedSlots, getTotalTravel, type UnifiedSlot } from './buildUnifiedLayout';
import { DiaryImageOverlay } from './DiaryImageOverlay';
import { DiaryThumbnailStrip } from './DiaryThumbnailStrip';
import { UnifiedImagePlane, type MeshRegistry } from './UnifiedImagePlane';
import { UnifiedTextOverlay } from './UnifiedTextOverlay';
import { getScrollState, useUnifiedSectionRanges } from './useUnifiedScroll';

// --- Scene controller: single useFrame for camera + all mesh updates ---
function SceneController({
  scrollProgressRef,
  totalTravel,
  slots,
  meshRegistryRef,
}: {
  scrollProgressRef: React.RefObject<{ value: number }>;
  totalTravel: number;
  slots: UnifiedSlot[];
  meshRegistryRef: React.RefObject<MeshRegistry>;
}) {
  const { camera } = useThree();
  const startY = 2;

  useFrame(() => {
    if (!scrollProgressRef.current) return;
    const progress = scrollProgressRef.current.value;

    // Camera movement
    const cameraY = startY - progress * totalTravel;
    camera.position.y = cameraY;
    camera.position.z = 5.5 - progress * 0.5;
    camera.lookAt(0, cameraY - 1, 0);

    // Batch-update all mesh visibility, rotation, opacity
    const lookAtY = cameraY - 1;
    for (const [i, { mesh, mat }] of meshRegistryRef.current) {
      // Signed distance from view center: positive = above (leaving), negative = below (entering)
      const relY = mesh.position.y - lookAtY;
      const absRelY = Math.abs(relY);

      mesh.visible = absRelY < 10;
      if (!mesh.visible) continue;

      mesh.rotation.x = Math.sin(progress * Math.PI) * 0.12;
      mesh.rotation.y = slots[i].rotY + Math.sin(progress * Math.PI * 2) * 0.08;

      if (relY > 0) {
        // Leaving viewport upward — fade out when ~30% visible
        mat.opacity = 1 - THREE.MathUtils.smoothstep(relY, 2.0, 3.5);
      } else {
        // Entering viewport from below — fade in when ~20% visible
        mat.opacity = 1 - THREE.MathUtils.smoothstep(-relY, 2.5, 4.0);
      }
    }
  });

  return null;
}

const isMobile = typeof window !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);

const GL_CONFIG = {
  antialias: !isMobile,
  alpha: false,
  powerPreference: 'high-performance' as const,
  preserveDrawingBuffer: false,
} as const;

export function DiaryGalleryUnified({ sections, children }: DiaryGalleryUnifiedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useRef({ value: 0 });
  const meshRegistryRef = useRef<MeshRegistry>(new Map());
  const currentSectionRef = useRef(0);

  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [currentSection, setCurrentSection] = useState(0);

  // Images only — for 3D scene
  const allImages = useMemo(() => sections.flatMap((s) => s.images), [sections]);
  const sectionImageCounts = useMemo(() => sections.map((s) => s.images.length), [sections]);
  const totalImages = allImages.length;
  const allLoaded = loadedCount >= totalImages;

  // Unified media list for lightbox (images + videos per section)
  // Also builds a mapping: imageGlobalIndex → lightboxIndex
  type MediaItem = { type: 'image' | 'video'; src: string; alt?: string; tags?: string[] };

  const { allMedia, imageToLightboxIndex, sectionMediaOffsets } = useMemo(() => {
    const media: MediaItem[] = [];
    const indexMap: number[] = [];
    const offsets: number[] = [];
    for (const s of sections) {
      offsets.push(media.length);
      for (const img of s.images) {
        indexMap.push(media.length);
        media.push({ type: 'image', src: img.src, alt: img.alt, tags: img.tags });
      }
      for (const vid of s.videos ?? []) {
        media.push({ type: 'video', src: vid.src, alt: vid.alt, tags: vid.tags });
      }
    }
    return { allMedia: media, imageToLightboxIndex: indexMap, sectionMediaOffsets: offsets };
  }, [sections]);

  // 3D layout — images only
  const slots = useMemo(() => buildUnifiedSlots(sectionImageCounts), [sectionImageCounts]);
  const totalTravel = useMemo(() => getTotalTravel(sectionImageCounts), [sectionImageCounts]);
  const sectionRanges = useUnifiedSectionRanges(sectionImageCounts);

  // Scroll height in vh — images only
  const scrollHeight = useMemo(() => {
    return sections.reduce(
      (sum, s) => sum + Math.max(200, s.images.length * 60 + 80),
      0,
    ) + (sections.length - 1) * 50;
  }, [sections]);

  // Scroll to gallery top when textures finish loading (section expands from 100vh → full)
  useEffect(() => {
    if (allLoaded && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, [allLoaded]);

  // Scroll tracking
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (v) => {
      scrollProgressRef.current.value = v;

      // Update current section only when it actually changes
      const state = getScrollState(v, sectionRanges);
      if (state.sectionIndex !== currentSectionRef.current) {
        currentSectionRef.current = state.sectionIndex;
        setCurrentSection(state.sectionIndex);
      }

      invalidate();
    });
    return unsubscribe;
  }, [scrollYProgress, sectionRanges]);

  const handleImageLoad = useCallback(() => setLoadedCount((c) => c + 1), []);

  const handleImageClick = useCallback((imageGlobalIndex: number) => {
    setLightboxIndex(imageToLightboxIndex[imageGlobalIndex]);
    setLightboxVisible(true);
  }, [imageToLightboxIndex]);

  const handleLightboxClose = useCallback(() => setLightboxVisible(false), []);

  // Thumbnail strip: show current section's media as DiaryImage-compatible items
  const { currentSectionThumbnails, currentVideoIndices } = useMemo(() => {
    const s = sections[currentSection];
    if (!s) return { currentSectionThumbnails: [] as DiaryImage[], currentVideoIndices: new Set<number>() };
    const items: DiaryImage[] = s.images.map((img) => ({ src: img.src, alt: img.alt, tags: img.tags }));
    const vidIdx = new Set<number>();
    for (const vid of s.videos ?? []) {
      vidIdx.add(items.length);
      items.push({ src: vid.src, alt: vid.alt, tags: vid.tags });
    }
    return { currentSectionThumbnails: items, currentVideoIndices: vidIdx };
  }, [sections, currentSection]);

  const handleThumbnailSelect = useCallback((localIndex: number) => {
    const globalIndex = sectionMediaOffsets[currentSection] + localIndex;
    setLightboxIndex(globalIndex);
    setLightboxVisible(true);
  }, [currentSection, sectionMediaOffsets]);

  const toolbarRender = useMemo(
    () => DiaryImageOverlay({ images: allMedia.map((m) => ({ src: m.src, alt: m.alt, tags: m.tags })) }),
    [allMedia],
  );
  const lightboxItems = useMemo(
    () => allMedia.map((m) => ({
      src: getBasePathWithUrl(m.src),
      key: m.src,
      type: m.type as 'image' | 'video',
    })),
    [allMedia],
  );

  if (totalImages === 0) return null;

  return (
    <>
      <section
        ref={containerRef}
        className="relative"
        style={{ height: allLoaded ? `${scrollHeight}vh` : '100vh' }}
      >
        <div className="sticky top-0 h-screen">
          {/* Loading placeholder — visible until all textures are ready */}
          {!allLoaded && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0a0a0a]">
              <Icon icon="svg-spinners:bars-rotate-fade" className="text-4xl text-white" />
              <p className="mt-2 text-sm text-white/70">
                {loadedCount} / {totalImages}
              </p>
            </div>
          )}

          {/* Three.js Canvas — always mounted to load textures, hidden until ready */}
          <Canvas
            className={`!absolute inset-0 ${allLoaded ? '' : 'invisible'}`}
            camera={{ position: [0, 2, 5.5], fov: 55 }}
            frameloop="demand"
            dpr={1}
            gl={GL_CONFIG}
          >
            <color attach="background" args={['#0a0a0a']} />
            <fog attach="fog" args={['#0a0a0a', 8, 16]} />

            <SceneController
              scrollProgressRef={scrollProgressRef}
              totalTravel={totalTravel}
              slots={slots}
              meshRegistryRef={meshRegistryRef}
            />

            {allImages.map((image, globalIndex) => (
              <UnifiedImagePlane
                key={`${image.src}-${globalIndex}`}
                textureSrc={image.src}
                slot={slots[globalIndex]}
                globalIndex={globalIndex}
                meshRegistry={meshRegistryRef}
                onImageClick={handleImageClick}
                onLoad={handleImageLoad}
              />
            ))}
          </Canvas>

          {/* Radial vignette overlay — only when gallery is active */}
          {allLoaded && (
            <>
              <div
                className="pointer-events-none absolute inset-0 z-[5]"
                style={{
                  background: 'radial-gradient(ellipse at center, transparent 30%, #0a0a0a 90%)',
                }}
              />

              {/* Text overlay — crossfades between sections */}
              <UnifiedTextOverlay currentSection={currentSection} visible>
                {children}
              </UnifiedTextOverlay>

              {/* Section indicator dots */}
              <div className="absolute top-1/2 right-3 z-10 flex -translate-y-1/2 flex-col gap-2 md:right-5">
                {sections.map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 w-2 rounded-full transition-all duration-300 ${
                      i === currentSection
                        ? 'scale-125 bg-white'
                        : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>

              {/* Thumbnail strip — current section's images */}
              <DiaryThumbnailStrip
                images={currentSectionThumbnails}
                visible
                onSelect={handleThumbnailSelect}
                videoIndices={currentVideoIndices}
              />
            </>
          )}
        </div>
      </section>

      {/* Lightbox — all images, unified index */}
      <ImageLightbox
        images={lightboxItems}
        visible={lightboxVisible}
        onClose={handleLightboxClose}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        toolbarRender={toolbarRender}
      />
    </>
  );
}

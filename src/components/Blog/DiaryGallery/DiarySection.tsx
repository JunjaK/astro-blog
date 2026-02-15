import type { DiarySectionProps } from './types';
import { getBasePathWithUrl } from '@/utils/getBasePathWithUrl';
import { Icon } from '@iconify/react';
import { useScroll } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PhotoProvider } from 'react-photo-view';
import { DiaryImageOverlay } from './DiaryImageOverlay';
import { DiarySectionScrollImage } from './DiarySectionScrollImage';
import { DiarySectionWebGL } from './DiarySectionWebGL';

export function DiarySection({ images, children, variant = 'css3d' }: DiarySectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 768px)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    setIsMobile(mobileQuery.matches);
    setPrefersReducedMotion(motionQuery.matches);

    const handleMobile = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    const handleMotion = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);

    mobileQuery.addEventListener('change', handleMobile);
    motionQuery.addEventListener('change', handleMotion);
    return () => {
      mobileQuery.removeEventListener('change', handleMobile);
      motionQuery.removeEventListener('change', handleMotion);
    };
  }, []);

  const scrollHeight = Math.max(250, images.length * 80 + 100);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const [loadedCount, setLoadedCount] = useState(0);
  const allLoaded = loadedCount >= images.length;
  const handleImageLoad = useCallback(() => {
    setLoadedCount((c) => c + 1);
  }, []);

  const toolbarRender = DiaryImageOverlay({ images });

  if (images.length === 0)
    return null;

  if (variant === 'webgl') {
    return <DiarySectionWebGL images={images}>{children}</DiarySectionWebGL>;
  }

  if (prefersReducedMotion) {
    return (
      <PhotoProvider toolbarRender={toolbarRender}>
        <section className="mb-16 px-4 md:px-8">
          <div className="prose prose-lg mx-auto max-w-4xl dark:prose-invert">
            {children}
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {images.map((image, index) => {
              const resolvedSrc = getBasePathWithUrl(image.src);
              return (
                <img
                  key={`${image.src}-${index}`}
                  src={resolvedSrc}
                  alt={image.alt ?? ''}
                  className="h-auto w-full rounded-lg object-cover"
                  loading="lazy"
                />
              );
            })}
          </div>
        </section>
      </PhotoProvider>
    );
  }

  return (
    <PhotoProvider toolbarRender={toolbarRender}>
      <section
        ref={containerRef}
        className="relative"
        style={{ height: `${scrollHeight}vh` }}
      >
        {/* Sticky viewport with perspective for CSS 3D */}
        <div
          className="sticky top-0 h-screen overflow-hidden"
          style={{ perspective: 1200, perspectiveOrigin: '50% 60%' }}
        >
          {/* Loading overlay */}
          <div
            className={`absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 transition-opacity duration-300 ${allLoaded ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
          >
            <Icon icon="svg-spinners:bars-rotate-fade" className="text-4xl text-white" />
            <p className="mt-2 text-sm text-white/70">{loadedCount} / {images.length}</p>
          </div>

          {/* Floating images layer — preserve-3d enables child translateZ */}
          <div
            className={`pointer-events-auto absolute inset-0 z-10 transition-opacity duration-300 ${allLoaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {images.map((image, index) => (
              <DiarySectionScrollImage
                key={`${image.src}-${index}`}
                image={image}
                index={index}
                totalImages={images.length}
                scrollYProgress={scrollYProgress}
                isMobile={isMobile}
                onImageLoad={handleImageLoad}
              />
            ))}
          </div>

          {/* Text card pinned to top */}
          <div className={`relative z-20 mx-auto max-w-2xl px-4 pt-12 transition-opacity duration-300 md:px-8 md:pt-16 ${allLoaded ? 'opacity-100' : 'opacity-0'}`}>
            <div className="rounded-2xl border border-white/20 bg-white/80 px-5 py-5 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-black/70 md:px-8 md:py-6">
              <div className="prose prose-base dark:prose-invert prose-headings:mt-0 prose-headings:mb-2 prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5">
                {children}
              </div>
            </div>
          </div>
        </div>
      </section>
    </PhotoProvider>
  );
}

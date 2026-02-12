import { useScroll } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { PhotoProvider } from 'react-photo-view';
import { DiaryImageOverlay } from './DiaryImageOverlay';
import { DiarySectionScrollImage } from './DiarySectionScrollImage';
import type { DiarySectionProps } from './types';

export function DiarySection({ images, children }: DiarySectionProps) {
  if (images.length === 0) return null;

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

  const toolbarRender = DiaryImageOverlay({ images });

  if (prefersReducedMotion) {
    return (
      <PhotoProvider toolbarRender={toolbarRender}>
        <section className="mb-16 px-4 md:px-8">
          <div className="prose prose-lg mx-auto max-w-4xl dark:prose-invert">
            {children}
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {images.map((image, index) => {
              const resolvedSrc = `${import.meta.env.MODE === 'dev' ? 'https://www.jun-devlog.win' : ''}${image.src}`;
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
        {/* Sticky viewport */}
        <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
          {/* Floating images layer */}
          <div className="pointer-events-auto absolute inset-0 z-10">
            {images.map((image, index) => (
              <DiarySectionScrollImage
                key={`${image.src}-${index}`}
                image={image}
                index={index}
                totalImages={images.length}
                scrollYProgress={scrollYProgress}
                isMobile={isMobile}
              />
            ))}
          </div>

          {/* Centered text card */}
          <div className="relative z-20 mx-4 max-w-2xl md:mx-8">
            <div className="rounded-2xl border border-white/20 bg-white/85 px-6 py-8 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-black/85 md:px-10 md:py-10">
              <div className="prose prose-lg dark:prose-invert prose-headings:mt-0 prose-headings:mb-3 prose-p:my-2 prose-ul:my-2 prose-li:my-0.5">
                {children}
              </div>
            </div>
          </div>
        </div>
      </section>
    </PhotoProvider>
  );
}

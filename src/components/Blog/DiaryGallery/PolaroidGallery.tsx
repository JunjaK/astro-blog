import type { PolaroidImage } from './types';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import caveat from 'tegaki/fonts/caveat';
import { TegakiRenderer } from 'tegaki/react';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { cn } from '@/lib/utils';

type PolaroidGalleryProps = {
  items: PolaroidImage[];
  className?: string;
};

function seeded(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function pickRotate(i: number): number {
  return round4(-14 + seeded(i + 1) * 28);
}

function pickX(i: number): string {
  return `${round4((seeded(i + 101) - 0.5) * 22)}%`;
}

function pickY(i: number): string {
  return `${round4((seeded(i + 211) - 0.3) * 22)}%`;
}

function pickScale(i: number): number {
  return round4(0.86 + seeded(i + 307) * 0.22);
}

export function PolaroidGallery({ items, className }: PolaroidGalleryProps) {
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  const lightboxItems = items.map((item) => ({
    src: item.src,
    type: 'image' as const,
  }));

  useEffect(() => {
    setMounted(true);
  }, []);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxVisible(true);
  };

  const closeLightbox = () => setLightboxVisible(false);

  return (
    <div className={cn('my-10', className)} data-no-lightbox>
      <div className="grid grid-cols-2 gap-x-3 gap-y-8 py-4 md:grid-cols-3 md:gap-x-2 md:gap-y-16 md:py-10">
        {items.map((item, i) => {
          const rotate = item.rotate ?? pickRotate(i);
          const xOffset = pickX(i);
          const yOffset = pickY(i);
          const baseScale = pickScale(i);

          return (
            <motion.button
              key={i}
              type="button"
              onClick={() => openLightbox(i)}
              className="group relative block w-full cursor-pointer border-0 bg-transparent p-0 outline-none"
              initial={{ x: xOffset, y: yOffset, rotate, scale: baseScale, zIndex: i }}
              animate={{ x: xOffset, y: yOffset, rotate, scale: baseScale, zIndex: i }}
              whileHover={{ scale: baseScale * 1.08, rotate: 0, zIndex: 100 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              aria-label={item.title}
            >
              <div className="relative bg-white p-2.5 pb-12 shadow-[0_14px_36px_rgba(0,0,0,0.28)] ring-1 ring-black/5">
                <div className="aspect-square w-full overflow-hidden bg-neutral-200">
                  <img
                    src={item.src}
                    alt={item.alt ?? item.title}
                    loading="lazy"
                    decoding="async"
                    className="block w-full object-cover"
                    style={{ height: '100%', margin: 0 }}
                  />
                </div>
                {item.caption && (
                  <div className="pointer-events-none absolute inset-x-3 bottom-1.5 flex items-center justify-center overflow-hidden text-neutral-700">
                    {mounted ? (
                      <TegakiRenderer
                        font={caveat}
                        style={{ fontSize: 'clamp(0.72rem, 2.6vw, 1.2rem)', lineHeight: 1.1, color: 'inherit' }}
                      >
                        {item.caption}
                      </TegakiRenderer>
                    ) : (
                      <span style={{ fontSize: 'clamp(0.72rem, 2.6vw, 1.2rem)', lineHeight: 1.1, opacity: 0 }}>
                        {item.caption}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      <ImageLightbox
        images={lightboxItems}
        visible={lightboxVisible}
        index={lightboxIndex}
        onClose={closeLightbox}
        onIndexChange={setLightboxIndex}
        titleRender={({ index }) => (
          <div className="rounded-full bg-black/55 px-4 py-1.5 text-base font-medium text-white backdrop-blur-sm">
            {items[index]?.title}
          </div>
        )}
        toolbarRender={({ index }) => (
          <div className="max-w-[82vw] rounded-xl bg-black/55 px-4 py-2 text-center text-sm leading-relaxed text-white/90 backdrop-blur-sm md:max-w-[60vw] md:text-base">
            {items[index]?.description}
          </div>
        )}
      />
    </div>
  );
}

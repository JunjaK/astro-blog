import type { DiaryContent } from './types';
import { useEffect, useState } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
} from '@/components/ui/carousel';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { Lens } from '@/components/ui/lens';
import { isMobileUA } from '@/utils/device';

type DiaryCarouselProps = {
  content: DiaryContent[];
};

function CounterBadge() {
  const { currentIndex, totalSlides } = useCarousel();
  if (totalSlides <= 1)
    return null;
  return (
    <div className="absolute bottom-3 right-3 z-10 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
      {currentIndex + 1}
      {' '}
      /
      {totalSlides}
    </div>
  );
}

export function DiaryCarousel({ content }: DiaryCarouselProps) {
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setIsDesktop(!isMobileUA());
  }, []);

  const lightboxItems = content.map((item) =>
    item.type === 'video'
      ? { src: item.src, type: 'video' as const }
      : { src: item.src, type: 'image' as const },
  );

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxVisible(true);
  };

  return (
    <div className="my-6">
      <Carousel opts={{ loop: true, dragFree: true, align: 'start' }}>
        <CarouselContent className="-ml-2">
          {content.map((item, i) => (
            <CarouselItem key={i} className="pl-2 basis-1/2 md:basis-1/3 lg:basis-1/4">
              <div className="relative h-[35vh] overflow-hidden rounded-lg bg-muted">
                {item.type === 'video' ? (
                  <video
                    src={item.src}
                    poster={item.poster}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                    style={{ height: '100%', margin: 0 }}
                  />
                ) : isDesktop ? (
                  <Lens zoomFactor={1.5} lensSize={150} className="h-full">
                    <img
                      src={item.src}
                      alt={item.alt ?? ''}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full cursor-pointer object-cover"
                      style={{ height: '100%', margin: 0 }}
                      onClick={() => openLightbox(i)}
                    />
                  </Lens>
                ) : (
                  <img
                    src={item.src}
                    alt={item.alt ?? ''}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full cursor-pointer object-cover"
                    style={{ height: '100%', margin: 0 }}
                    onClick={() => openLightbox(i)}
                  />
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CounterBadge />
        <CarouselPrevious className="hidden md:flex -left-4 bg-black/50 text-white border-0 hover:bg-black/70 hover:text-white" />
        <CarouselNext className="hidden md:flex -right-4 bg-black/50 text-white border-0 hover:bg-black/70 hover:text-white" />
      </Carousel>

      <ImageLightbox
        images={lightboxItems}
        visible={lightboxVisible}
        index={lightboxIndex}
        onClose={() => setLightboxVisible(false)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}

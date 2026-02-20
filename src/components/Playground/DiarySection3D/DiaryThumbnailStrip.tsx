import { memo, useCallback } from 'react';
import type { DiaryImage } from './types';

type DiaryThumbnailStripProps = {
  images: DiaryImage[];
  visible: boolean;
  onSelect: (index: number) => void;
  videoIndices?: Set<number>;
};

export const DiaryThumbnailStrip = memo(function DiaryThumbnailStrip({ images, visible, onSelect, videoIndices }: DiaryThumbnailStripProps) {
  return (
    <div className={`pointer-events-none absolute inset-x-0 bottom-16 z-10 px-4 transition-opacity duration-300 md:px-8 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="pointer-events-auto mx-auto flex max-w-2xl gap-1.5 overflow-x-auto">
        {images.map((img, i) => {
          const isVideo = videoIndices?.has(i);
          return (
            <ThumbnailItem
              key={img.src}
              img={img}
              index={i}
              isVideo={isVideo}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </div>
  );
});

const ThumbnailItem = memo(function ThumbnailItem({
  img,
  index,
  isVideo,
  onSelect,
}: {
  img: DiaryImage;
  index: number;
  isVideo?: boolean;
  onSelect: (index: number) => void;
}) {
  const handleClick = useCallback(() => onSelect(index), [onSelect, index]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(index); }
  }, [onSelect, index]);

  if (isVideo) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={img.alt ?? `image-${index + 1}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="relative h-12 w-12 shrink-0 cursor-pointer rounded-lg opacity-70 transition hover:opacity-100"
        style={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.3)' }}
      >
        <div className="flex h-full items-center justify-center">
          <svg viewBox="0 0 24 24" fill="white" className="size-5">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={img.alt ?? `image-${index + 1}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg opacity-70 transition hover:opacity-100"
    >
      <img
        src={img.src}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover"
        style={{ height: '100%' }}
      />
    </div>
  );
});

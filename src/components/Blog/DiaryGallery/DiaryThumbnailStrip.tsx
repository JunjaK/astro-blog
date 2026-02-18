import { memo } from 'react';
import type { DiaryImage } from './types';
import { getBasePathWithUrl } from '@/utils/getBasePathWithUrl';

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
            <div
              key={img.src}
              role="button"
              tabIndex={0}
              aria-label={img.alt ?? `image-${i + 1}`}
              onClick={() => onSelect(i)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(i); } }}
              className="relative h-12 w-12 shrink-0 cursor-pointer rounded-lg opacity-70 transition hover:opacity-100"
              style={isVideo ? { backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.3)' } : {
                backgroundImage: `url(${getBasePathWithUrl(img.src)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {isVideo && (
                <div className="flex h-full items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="white" className="size-5">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

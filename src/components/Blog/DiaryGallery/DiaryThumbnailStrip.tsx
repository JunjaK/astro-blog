import type { DiaryImage } from './types';
import { getBasePathWithUrl } from '@/utils/getBasePathWithUrl';

type DiaryThumbnailStripProps = {
  images: DiaryImage[];
  visible: boolean;
  onSelect: (index: number) => void;
};

export function DiaryThumbnailStrip({ images, visible, onSelect }: DiaryThumbnailStripProps) {
  return (
    <div className={`pointer-events-none absolute inset-x-0 bottom-16 z-10 px-4 transition-opacity duration-300 md:px-8 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="pointer-events-auto mx-auto flex max-w-2xl gap-1.5 overflow-x-auto">
        {images.map((img, i) => (
          <div
            key={img.src}
            role="button"
            tabIndex={0}
            aria-label={img.alt ?? `image-${i + 1}`}
            onClick={() => onSelect(i)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(i); } }}
            className="h-12 w-12 shrink-0 cursor-pointer rounded-lg opacity-70 transition hover:opacity-100"
            style={{
              backgroundImage: `url(${getBasePathWithUrl(img.src)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        ))}
      </div>
    </div>
  );
}

import type { OverlayRenderProps } from 'react-photo-view/dist/types';
import type { DiaryImage } from './types';

type DiaryImageOverlayProps = {
  images: DiaryImage[];
};

export function DiaryImageOverlay({ images }: DiaryImageOverlayProps) {
  return function toolbarRender({ index }: OverlayRenderProps) {
    const currentImage = images[index];
    const tags = currentImage?.tags;

    return (
      <div className="flex items-center gap-2">
        {tags?.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm"
          >
            {tag}
          </span>
        ))}
      </div>
    );
  };
}

import { useStore } from '@nanostores/react';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import {
  $polaroidLightbox,
  closePolaroidLightbox,
  setPolaroidLightboxIndex,
} from '@/store/polaroid';

export function PolaroidLightbox() {
  const state = useStore($polaroidLightbox);

  const lightboxItems = state.items.map((item) => ({
    src: item.src,
    type: 'image' as const,
  }));

  return (
    <ImageLightbox
      images={lightboxItems}
      visible={state.visible}
      index={state.index}
      onClose={closePolaroidLightbox}
      onIndexChange={setPolaroidLightboxIndex}
      titleRender={({ index }) => (
        <div className="rounded-full bg-black/55 px-4 py-1.5 text-base font-medium text-white backdrop-blur-sm">
          {state.items[index]?.title}
        </div>
      )}
      toolbarRender={({ index }) => (
        <div className="max-w-[82vw] rounded-xl bg-black/55 px-4 py-2 text-center text-sm leading-relaxed text-white/90 backdrop-blur-sm md:max-w-[60vw] md:text-base">
          {state.items[index]?.description}
        </div>
      )}
    />
  );
}

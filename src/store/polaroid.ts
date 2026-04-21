import { atom } from 'nanostores';
import type { PolaroidImage } from '@/components/Blog/DiaryGallery/types';

export type PolaroidLightboxState = {
  items: PolaroidImage[];
  index: number;
  visible: boolean;
};

export const $polaroidLightbox = atom<PolaroidLightboxState>({
  items: [],
  index: 0,
  visible: false,
});

export function openPolaroidLightbox(items: PolaroidImage[], index: number) {
  $polaroidLightbox.set({ items, index, visible: true });
}

export function closePolaroidLightbox() {
  const current = $polaroidLightbox.get();
  $polaroidLightbox.set({ ...current, visible: false });
}

export function setPolaroidLightboxIndex(index: number) {
  const current = $polaroidLightbox.get();
  $polaroidLightbox.set({ ...current, index });
}

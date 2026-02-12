import type { DiaryGalleryProps } from './types';

export function DiaryGallery({ children }: DiaryGalleryProps) {
  return <div className="flex flex-col">{children}</div>;
}

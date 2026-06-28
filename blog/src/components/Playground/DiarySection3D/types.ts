export type { DiaryImage, DiaryVideo } from '@/components/Blog/DiaryGallery/types';
import type { DiaryImage, DiaryVideo } from '@/components/Blog/DiaryGallery/types';

export type DiaryVariant = 'css3d' | 'webgl';

export type DiaryGallerySectionData = {
  images: DiaryImage[];
  videos?: DiaryVideo[];
};

export type DiarySectionProps = {
  images: DiaryImage[];
  children: React.ReactNode;
  variant?: DiaryVariant;
};

export type DiaryGalleryUnifiedProps = {
  sections: DiaryGallerySectionData[];
  children: React.ReactNode;
};

export type DiarySectionCarouselProps = {
  sections: DiaryGallerySectionData[];
  children: React.ReactNode;
};

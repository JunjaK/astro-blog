export type {
  DiaryImage,
  DiaryVideo,
  DiaryGalleryUnifiedProps,
  DiaryGallerySectionData,
  DiarySectionCarouselProps,
} from '@/components/Blog/DiaryGallery/types';

export type DiaryVariant = 'css3d' | 'webgl';

export type DiarySectionProps = {
  images: import('@/components/Blog/DiaryGallery/types').DiaryImage[];
  children: React.ReactNode;
  variant?: DiaryVariant;
};

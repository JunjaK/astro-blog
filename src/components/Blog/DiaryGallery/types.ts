export type DiaryImage = {
  src: string;
  alt?: string;
  tags?: string[];
};

export type DiaryVideo = {
  src: string;
  poster: string;
  alt?: string;
  tags?: string[];
};

export type DiaryVariant = 'css3d' | 'webgl';

export type DiarySectionProps = {
  images: DiaryImage[];
  children: React.ReactNode;
  variant?: DiaryVariant;
};

export type DiaryGalleryProps = {
  children: React.ReactNode;
};

export type DiaryGallerySectionData = {
  images: DiaryImage[];
  videos?: DiaryVideo[];
};

export type DiaryGalleryUnifiedProps = {
  sections: DiaryGallerySectionData[];
  children: React.ReactNode;
};

export type DiarySectionCarouselProps = {
  sections: DiaryGallerySectionData[];
  children: React.ReactNode;
};

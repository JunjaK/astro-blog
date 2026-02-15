export type DiaryImage = {
  src: string;
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

export type DiaryImage = {
  src: string;
  alt?: string;
  tags?: string[];
};

export type DiarySectionProps = {
  images: DiaryImage[];
  children: React.ReactNode;
};

export type DiaryGalleryProps = {
  children: React.ReactNode;
};

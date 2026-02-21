export type DiaryImage = {
  type?: 'image';
  src: string;
  alt?: string;
  tags?: string[];
};

export type DiaryVideo = {
  type: 'video';
  src: string;
  poster: string;
  alt?: string;
  tags?: string[];
};

export type DiaryContent = DiaryImage | DiaryVideo;

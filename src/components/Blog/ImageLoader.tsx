import type { SyntheticEvent } from 'react';
import { getBasePathWithUrl } from '@/utils/getBasePathWithUrl.ts';
import * as React from 'react';

type ImageLoaderProps = {
  src?: string;
  alt?: string;
} & React.ImgHTMLAttributes<HTMLImageElement>;

export default function ImageLoader({ src, alt = 'blog-image', ...props }: ImageLoaderProps) {
  const addDefaultImg = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = '/fallbackImg.svg';
  };
  return (
    <img
      {...props}
      src={getBasePathWithUrl(src)}
      alt={alt}
      loading="lazy"
      onError={addDefaultImg}
    />
  );
}

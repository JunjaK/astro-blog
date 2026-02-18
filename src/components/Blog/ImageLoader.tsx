import * as React from 'react';
import { getBasePathWithUrl } from '@/utils/getBasePathWithUrl.ts';

type ImageLoaderProps = {
  src?: string;
  alt?: string;
} & React.ImgHTMLAttributes<HTMLImageElement>;

export default function ImageLoader({ src, alt = 'blog-image', ...props }: ImageLoaderProps) {
  return (
    <img
      {...props}
      src={getBasePathWithUrl(src)}
      alt={alt}
      loading="lazy"
    />
  );
}

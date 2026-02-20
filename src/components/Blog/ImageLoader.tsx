import * as React from 'react';

type ImageLoaderProps = {
  src?: string;
  alt?: string;
} & React.ImgHTMLAttributes<HTMLImageElement>;

export default function ImageLoader({ src, alt = 'blog-image', ...props }: ImageLoaderProps) {
  return (
    <img
      {...props}
      src={src ?? ''}
      alt={alt}
      loading="lazy"
    />
  );
}

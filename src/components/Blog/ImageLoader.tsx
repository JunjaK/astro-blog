import type { HTMLImageElement } from 'react';
import { getBasePathWithUrl } from '@/utils/getBasePathWithUrl.ts';
import * as React from 'react';

export default function ImageLoader({ src, alt = 'blog-image', ...props }: HTMLImageElement) {
  return (
    <img
      src={getBasePathWithUrl(src)}
      alt={alt}
      {...props}
    />
  );
}

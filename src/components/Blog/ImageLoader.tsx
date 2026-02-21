// React island with Lens zoom on hover (desktop only).
// Use with client:visible in Astro/MDX. For static images without
// lens, use ImageLoader.astro instead.
import * as React from 'react';
import { useEffect, useState } from 'react';
import { Lens } from '@/components/ui/lens';
import { isMobileUA } from '@/utils/device';

type ImageLoaderProps = {
  src?: string;
  alt?: string;
} & React.ImgHTMLAttributes<HTMLImageElement>;

export default function ImageLoader({ src, alt = 'blog-image', ...props }: ImageLoaderProps) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setIsDesktop(!isMobileUA());
  }, []);

  const img = (
    <img
      {...props}
      src={src ?? ''}
      alt={alt}
      loading="lazy"
      data-lightbox=""
      className={`cursor-zoom-in ${props.className ?? ''}`}
    />
  );

  if (!isDesktop) return img;

  return (
    <div data-lightbox-trigger>
      <Lens zoomFactor={1.5} lensSize={150}>{img}</Lens>
    </div>
  );
}

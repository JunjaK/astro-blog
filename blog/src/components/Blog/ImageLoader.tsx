// React island with Lens zoom on hover (desktop only).
// Use with client:visible in Astro/MDX. For static images without
// lens, use ImageLoader.astro instead.
import * as React from 'react';
import { useEffect, useState } from 'react';
import { Lens } from '@/components/ui/lens';
import { isMobileUA } from '@/utils/device';
import { size, srcSet, variant } from '@/utils/imageVariant';

type ImageLoaderProps = {
  src?: string;
  alt?: string;
} & React.ImgHTMLAttributes<HTMLImageElement>;

export default function ImageLoader({ src = '', alt = 'blog-image', width, height, className, style, ...props }: ImageLoaderProps) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setIsDesktop(!isMobileUA());
  }, []);

  const display = variant(src, 960); // show a downscaled variant; original opens in the lightbox
  const set = srcSet(src, [480, 960, 1600]);
  const full = display !== src ? src : undefined;
  const dim = size(src);

  const img = (
    <img
      {...props}
      src={display}
      srcSet={set}
      sizes="(max-width: 768px) 92vw, 720px"
      alt={alt}
      loading="lazy"
      decoding="async"
      data-lightbox=""
      data-full={full}
      width={width ?? dim?.w}
      height={height ?? dim?.h}
      className={`cursor-zoom-in ${className ?? ''}`}
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 360px', ...style }}
      onError={(e) => {
        // variant → original → fallback, terminal (dataset flag avoids reload loop:
        // IDL t.src is absolute so a relative compare never ends).
        const t = e.currentTarget;
        if (t.dataset.fb === '2') return;
        if (t.dataset.fb === '1') { t.dataset.fb = '2'; t.src = '/fallbackImg.svg'; return; }
        t.dataset.fb = '1'; t.srcset = ''; t.src = full ?? '/fallbackImg.svg';
      }}
    />
  );

  if (!isDesktop)
    return img;

  return (
    <div data-lightbox-trigger>
      <Lens zoomFactor={1.5} lensSize={150}>{img}</Lens>
    </div>
  );
}

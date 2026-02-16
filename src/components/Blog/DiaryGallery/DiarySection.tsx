import type { DiarySectionProps } from './types';
import { DiarySectionCSS3D } from './DiarySectionCSS3D';
import { DiarySectionWebGL } from './DiarySectionWebGL';

export function DiarySection({ images, children, variant = 'css3d' }: DiarySectionProps) {
  if (images.length === 0)
    return null;

  if (variant === 'webgl') {
    return <DiarySectionWebGL images={images}>{children}</DiarySectionWebGL>;
  }

  return <DiarySectionCSS3D images={images}>{children}</DiarySectionCSS3D>;
}

import type { DiaryImage } from './types';
import { getBasePathWithUrl } from '@/utils/getBasePathWithUrl';
import { motion, type MotionValue, useTransform } from 'framer-motion';
import { PhotoView } from 'react-photo-view';

type ImageSlot = {
  xPercent: number;
  widthPercent: number;
  zDepth: number;
  rotateZ: number;
  speed: number;
  side: 'left' | 'right';
};

// zDepth: 0 = nearest (large, fast, sharp), 1 = farthest (small, slow, blurred)
const IMAGE_SLOTS: ImageSlot[] = [
  { xPercent: 2, widthPercent: 42, zDepth: 0.2, rotateZ: -2, speed: 1.3, side: 'left' },
  { xPercent: 54, widthPercent: 38, zDepth: 0.6, rotateZ: 1.5, speed: 0.7, side: 'right' },
  { xPercent: 6, widthPercent: 36, zDepth: 0.8, rotateZ: 1.2, speed: 0.5, side: 'left' },
  { xPercent: 48, widthPercent: 40, zDepth: 0.1, rotateZ: -2.5, speed: 1.4, side: 'right' },
  { xPercent: 0, widthPercent: 38, zDepth: 0.5, rotateZ: 2, speed: 0.8, side: 'left' },
  { xPercent: 56, widthPercent: 36, zDepth: 0.3, rotateZ: -1.5, speed: 1.1, side: 'right' },
  { xPercent: 4, widthPercent: 40, zDepth: 0.7, rotateZ: -1.8, speed: 0.6, side: 'left' },
  { xPercent: 50, widthPercent: 42, zDepth: 0.4, rotateZ: 2.5, speed: 1.0, side: 'right' },
];

const MOBILE_SLOTS: ImageSlot[] = [
  { xPercent: 2, widthPercent: 60, zDepth: 0.2, rotateZ: -1, speed: 1.3, side: 'left' },
  { xPercent: 32, widthPercent: 64, zDepth: 0.6, rotateZ: 1, speed: 0.7, side: 'right' },
  { xPercent: 4, widthPercent: 58, zDepth: 0.8, rotateZ: 0.8, speed: 0.5, side: 'left' },
  { xPercent: 30, widthPercent: 66, zDepth: 0.1, rotateZ: -1.5, speed: 1.4, side: 'right' },
  { xPercent: 0, widthPercent: 62, zDepth: 0.5, rotateZ: 1.2, speed: 0.8, side: 'left' },
  { xPercent: 34, widthPercent: 60, zDepth: 0.3, rotateZ: -0.8, speed: 1.1, side: 'right' },
  { xPercent: 6, widthPercent: 58, zDepth: 0.7, rotateZ: -1.2, speed: 0.6, side: 'left' },
  { xPercent: 28, widthPercent: 66, zDepth: 0.4, rotateZ: 1.5, speed: 1.0, side: 'right' },
];

type DiarySectionScrollImageProps = {
  image: DiaryImage;
  index: number;
  totalImages: number;
  scrollYProgress: MotionValue<number>;
  isMobile: boolean;
};

export function DiarySectionScrollImage({
  image,
  index,
  totalImages,
  scrollYProgress,
  isMobile,
}: DiarySectionScrollImageProps) {
  const slots = isMobile ? MOBILE_SLOTS : IMAGE_SLOTS;
  const slot = slots[index % slots.length];

  const staggerOffset = index / Math.max(totalImages, 1);

  // Y movement: deeper images move slower (parallax depth)
  const travelDistance = 280 * slot.speed;
  const startY = 100 + staggerOffset * 80;
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [startY, startY - travelDistance],
  );

  // 3D rotations driven by scroll
  const rotateX = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    [12 * (1 - slot.zDepth), 0, 0, -12 * (1 - slot.zDepth)],
  );

  const rotateY = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [
      slot.side === 'left' ? -8 : 8,
      0,
      slot.side === 'left' ? 8 : -8,
    ],
  );

  // Scale: near objects slightly larger, far objects smaller
  const depthScale = 1 - slot.zDepth * 0.2;
  const scale = useTransform(
    scrollYProgress,
    [0, 0.4, 0.6, 1],
    [depthScale * 0.85, depthScale, depthScale, depthScale * 0.85],
  );

  // Opacity: staggered fade with depth
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.08 + staggerOffset * 0.04, 0.7 - staggerOffset * 0.03, 0.95],
    [0, 1, 1, 0],
  );

  // translateZ for real depth separation
  const translateZ = -slot.zDepth * 150;

  // Depth-of-field: far images get blurred
  const blurAmount = slot.zDepth > 0.6 ? `blur(${(slot.zDepth - 0.6) * 3}px)` : 'none';

  const resolvedSrc = getBasePathWithUrl(image.src);

  return (
    <motion.div
      className="absolute will-change-transform"
      style={{
        left: `${slot.xPercent}%`,
        width: `${slot.widthPercent}%`,
        top: `${10 + staggerOffset * 45}%`,
        y,
        opacity,
        rotateX,
        rotateY,
        rotateZ: slot.rotateZ,
        scale,
        z: translateZ,
        filter: blurAmount,
      }}
    >
      <PhotoView src={resolvedSrc}>
        <div className="group cursor-pointer overflow-hidden rounded-xl shadow-2xl shadow-black/40 transition-all duration-500 hover:shadow-black/60 hover:brightness-110">
          <img
            src={resolvedSrc}
            alt={image.alt ?? ''}
            loading="lazy"
            className="h-auto w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
          {image.tags && image.tags.length > 0 && (
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1.5 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8 opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-md:opacity-80">
              {image.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </PhotoView>
    </motion.div>
  );
}

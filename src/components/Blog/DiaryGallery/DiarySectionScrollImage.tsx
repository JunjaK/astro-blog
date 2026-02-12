import { getBasePathWithUrl } from '@/utils/getBasePathWithUrl';
import { motion, useTransform, type MotionValue } from 'framer-motion';
import { PhotoView } from 'react-photo-view';
import type { DiaryImage } from './types';

type ImageSlot = {
  xPercent: number;
  widthPercent: number;
  rotation: number;
  speed: number;
};

const IMAGE_SLOTS: ImageSlot[] = [
  { xPercent: 4, widthPercent: 38, rotation: -2.5, speed: 0.7 },
  { xPercent: 55, widthPercent: 40, rotation: 1.8, speed: 1.1 },
  { xPercent: 8, widthPercent: 42, rotation: 1.5, speed: 0.6 },
  { xPercent: 50, widthPercent: 36, rotation: -2, speed: 1.3 },
  { xPercent: 2, widthPercent: 40, rotation: 2, speed: 0.9 },
  { xPercent: 56, widthPercent: 38, rotation: -1.5, speed: 1.0 },
  { xPercent: 6, widthPercent: 35, rotation: -1.8, speed: 1.2 },
  { xPercent: 52, widthPercent: 42, rotation: 2.5, speed: 0.8 },
];

const MOBILE_SLOTS: ImageSlot[] = [
  { xPercent: 2, widthPercent: 58, rotation: -1.5, speed: 0.7 },
  { xPercent: 38, widthPercent: 60, rotation: 1.2, speed: 1.1 },
  { xPercent: 4, widthPercent: 55, rotation: 1, speed: 0.6 },
  { xPercent: 35, widthPercent: 62, rotation: -1.2, speed: 1.3 },
  { xPercent: 2, widthPercent: 60, rotation: 1.5, speed: 0.9 },
  { xPercent: 36, widthPercent: 58, rotation: -1, speed: 1.0 },
  { xPercent: 5, widthPercent: 56, rotation: -1.3, speed: 1.2 },
  { xPercent: 34, widthPercent: 62, rotation: 1.8, speed: 0.8 },
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
  const startY = 110 + staggerOffset * 60;
  const endY = -120 - staggerOffset * 40;

  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [startY * slot.speed, endY * slot.speed],
  );

  const opacity = useTransform(
    scrollYProgress,
    [0, 0.1 + staggerOffset * 0.05, 0.75 - staggerOffset * 0.03, 1],
    [0, 1, 1, 0],
  );

  const resolvedSrc = getBasePathWithUrl(image.src);

  return (
    <motion.div
      className="absolute"
      style={{
        left: `${slot.xPercent}%`,
        width: `${slot.widthPercent}%`,
        y,
        opacity,
        rotate: slot.rotation,
        top: `${15 + staggerOffset * 50}%`,
      }}
    >
      <PhotoView src={resolvedSrc}>
        <div className="group cursor-pointer overflow-hidden rounded-xl shadow-2xl shadow-black/30 transition-shadow duration-300 hover:shadow-black/50">
          <img
            src={resolvedSrc}
            alt={image.alt ?? ''}
            loading="lazy"
            className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-105"
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

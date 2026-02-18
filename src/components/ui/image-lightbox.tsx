import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type LightboxItem = {
  src: string;
  key?: string;
  type?: 'image' | 'video';
};

type ImageLightboxProps = {
  images: LightboxItem[];
  visible: boolean;
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  toolbarRender?: (props: { index: number }) => React.ReactNode;
};

const SWIPE_THRESHOLD = 50;
const ZOOM_SCALE = 2;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

export function ImageLightbox({
  images,
  visible,
  index,
  onClose,
  onIndexChange,
  toolbarRender,
}: ImageLightboxProps) {
  const [direction, setDirection] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const canPrev = index > 0;
  const canNext = index < images.length - 1;

  const goTo = useCallback(
    (newIndex: number) => {
      if (newIndex < 0 || newIndex >= images.length) return;
      setDirection(newIndex > index ? 1 : -1);
      setZoomed(false);
      setDragOffset({ x: 0, y: 0 });
      onIndexChange(newIndex);
    },
    [index, images.length, onIndexChange],
  );

  const goPrev = useCallback(() => {
    if (canPrev) goTo(index - 1);
  }, [canPrev, goTo, index]);

  const goNext = useCallback(() => {
    if (canNext) goTo(index + 1);
  }, [canNext, goTo, index]);

  // Keyboard navigation
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goPrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goNext();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, goPrev, goNext, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (zoomed) return;
    const { offset, velocity } = info;
    const swipe = Math.abs(offset.x) * velocity.x;
    if (offset.x < -SWIPE_THRESHOLD || swipe < -1000) {
      goNext();
    } else if (offset.x > SWIPE_THRESHOLD || swipe > 1000) {
      goPrev();
    }
  };

  const handleDoubleClick = () => {
    if (images[index]?.type === 'video') return;
    setZoomed((z) => {
      if (z) setDragOffset({ x: 0, y: 0 });
      return !z;
    });
  };

  const handleZoomDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!zoomed) return;
    setDragOffset({
      x: dragOffset.x + info.offset.x,
      y: dragOffset.y + info.offset.y,
    });
  };

  if (!visible) return null;

  const currentImage = images[index];
  if (!currentImage) return null;
  const isVideo = currentImage.type === 'video';

  const content = (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-[110] rounded-full bg-black/50 p-2 text-white/80 backdrop-blur-sm transition hover:bg-black/70 hover:text-white"
          >
            <X className="size-5" />
          </button>

          {/* Image counter */}
          <div className="absolute top-4 left-4 z-[110] rounded-full bg-black/50 px-3 py-1.5 text-sm font-medium text-white/80 backdrop-blur-sm">
            {index + 1} / {images.length}
          </div>

          {/* Toolbar (tags) */}
          {toolbarRender && (
            <div className="absolute bottom-6 left-1/2 z-[110] -translate-x-1/2">
              {toolbarRender({ index })}
            </div>
          )}

          {/* Prev button */}
          {canPrev && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-3 z-[110] rounded-full bg-black/50 p-2 text-white/80 backdrop-blur-sm transition hover:bg-black/70 hover:text-white md:left-4"
            >
              <ChevronLeft className="size-6" />
            </button>
          )}

          {/* Next button */}
          {canNext && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-3 z-[110] rounded-full bg-black/50 p-2 text-white/80 backdrop-blur-sm transition hover:bg-black/70 hover:text-white md:right-4"
            >
              <ChevronRight className="size-6" />
            </button>
          )}

          {/* Image with slide animation */}
          <div
            ref={imageContainerRef}
            className="relative h-full w-full overflow-hidden"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={currentImage.key ?? currentImage.src}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                drag={zoomed ? 'x' : 'x'}
                dragConstraints={zoomed ? undefined : { left: 0, right: 0 }}
                dragElastic={zoomed ? 0.1 : 0.5}
                onDragEnd={zoomed ? handleZoomDrag : handleDragEnd}
                className="absolute inset-0 flex items-center justify-center"
                onClick={(e) => {
                  if (e.target === e.currentTarget) onClose();
                }}
              >
                {isVideo ? (
                  <video
                    src={currentImage.src}
                    controls
                    autoPlay
                    className="max-h-[90vh] max-w-[90vw] select-none rounded-xl"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <motion.img
                    src={currentImage.src}
                    alt=""
                    className="max-h-[90vh] max-w-[90vw] select-none rounded-xl object-contain"
                    draggable={false}
                    onDoubleClick={handleDoubleClick}
                    animate={{
                      scale: zoomed ? ZOOM_SCALE : 1,
                      x: zoomed ? dragOffset.x : 0,
                      y: zoomed ? dragOffset.y : 0,
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    style={{ cursor: zoomed ? 'grab' : 'default' }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

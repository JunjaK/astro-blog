import { motion } from 'framer-motion';
import { useStore } from '@nanostores/react';
import { useEffect, useState } from 'react';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import {
  $polaroidLightbox,
  closePolaroidLightbox,
  setPolaroidLightboxIndex,
} from '@/store/polaroid';

type DescriptionDrawerProps = {
  description?: string;
  index: number;
  visible: boolean;
};

function PolaroidDescriptionDrawer({ description, index, visible }: DescriptionDrawerProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedHeight, setExpandedHeight] = useState(288);

  useEffect(() => {
    const syncExpandedHeight = () => {
      setExpandedHeight(Math.min(window.innerHeight * 0.3, 288));
    };

    syncExpandedHeight();
    window.addEventListener('resize', syncExpandedHeight);
    return () => window.removeEventListener('resize', syncExpandedHeight);
  }, []);

  useEffect(() => {
    setExpanded(false);
  }, [description, index, visible]);

  if (!description)
    return null;

  return (
    <motion.button
      type="button"
      data-polaroid-description-drawer
      aria-expanded={expanded}
      initial={false}
      animate={{ height: expanded ? expandedHeight : 44 }}
      transition={{ type: 'spring', stiffness: 280, damping: 30 }}
      className="pointer-events-auto w-[82vw] overflow-hidden rounded-2xl bg-black/58 text-white/90 shadow-2xl backdrop-blur-md md:w-[50vw]"
      onClick={(event) => {
        event.stopPropagation();
        setExpanded((value) => !value);
      }}
    >
      <div className="flex h-full flex-col px-4 py-3">
        <div
          data-polaroid-description-content
          className={
            expanded
              ? 'h-full overflow-y-auto text-left text-sm leading-relaxed whitespace-normal pr-1 md:text-base'
              : 'truncate text-left text-sm leading-relaxed whitespace-nowrap overflow-x-hidden text-ellipsis md:text-base'
          }
        >
          {description}
        </div>
      </div>
    </motion.button>
  );
}

export function PolaroidLightbox() {
  const state = useStore($polaroidLightbox);

  const lightboxItems = state.items.map((item) => ({
    src: item.src,
    type: 'image' as const,
  }));

  return (
    <ImageLightbox
      images={lightboxItems}
      visible={state.visible}
      index={state.index}
      onClose={closePolaroidLightbox}
      onIndexChange={setPolaroidLightboxIndex}
      titleRender={({ index }) => (
        <div className="rounded-full bg-black/55 px-4 py-1.5 text-base font-medium text-white backdrop-blur-sm">
          {state.items[index]?.title}
        </div>
      )}
      toolbarRender={({ index }) => (
        <PolaroidDescriptionDrawer
          description={state.items[index]?.description}
          index={index}
          visible={state.visible}
        />
      )}
    />
  );
}

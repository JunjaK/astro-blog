import type { TechIconType } from '@/types/commonType.ts';
import { motion } from 'framer-motion';
import * as React from 'react';
import { useState } from 'react';

const tooltipVariants = {
  visible: {
    y: 0,
    opacity: 1,
    pointerEvents: 'auto' as const,
  },
  invisible: {
    y: 4,
    opacity: 0,
    pointerEvents: 'none' as const,
  },
};

type Props = {
  backgroundSize?: string;
  iconSize?: string;
  hoverSize?: string;
} & TechIconType;

export function TechIcon({ iconUrl, techName, backgroundSize, iconSize, hoverSize }: Props) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative flex items-center justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className={`tech-icon flex flex-col items-center justify-center
   ${backgroundSize || 'w-16 h-16'}   bg-neutral-50 dark:bg-neutral-800 rounded-md shadow-md`}
        whileHover={{ scale: 1.2 }}
      >
        <img src={iconUrl} className={iconSize || 'w-12 h-12'} alt={techName} loading="lazy" />
      </motion.div>

      <motion.div
        className={`absolute z-[10000] ${hoverSize || 'p-2'} bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 bg-neutral-100 dark:bg-neutral-900 rounded-md shadow-md whitespace-nowrap text-sm`}
        initial="invisible"
        animate={isHovered ? 'visible' : 'invisible'}
        variants={tooltipVariants}
        transition={{ duration: 0.15 }}
      >
        {techName}
      </motion.div>
    </div>
  );
}

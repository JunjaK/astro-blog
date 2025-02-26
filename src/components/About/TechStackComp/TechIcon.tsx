import type { TechIconType } from '@/types/commonType.ts';
import { motion } from 'framer-motion';
// @flow
import * as React from 'react';
import { useState } from 'react';

const hoveredVariants = {
  visible: {
    y: 30,
    opacity: 1,
  },
  invisible: {
    y: 0,
    opacity: 0,
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

    <>
      <div
        className="group flex items-end justify-center"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <motion.div
          className={`tech-icon flex flex-col items-center justify-center
   ${backgroundSize || 'w-16 h-16'}   bg-neutral-50 dark:bg-neutral-800 rounded-md shadow-md`}
          whileHover={{ scale: 1.2 }}
          animate={isHovered ? 'visible' : 'invisible'}

        >
          <img src={iconUrl} className={iconSize || 'w-12 h-12'} alt={techName} loading="lazy" />

        </motion.div>
        <motion.div
          className={`invisible group-hover:visible absolute z-10 ${hoverSize || 'p-2'} mt-10 bg-neutral-100 dark:bg-neutral-900 rounded-md shadow-md`}
          animate={isHovered ? 'visible' : 'invisible'}
          variants={hoveredVariants}
        >
          {techName}
        </motion.div>

      </div>
    </>

  );
}

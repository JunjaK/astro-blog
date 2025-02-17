import { motion } from 'framer-motion';
// @flow
import * as React from 'react';

type Props = {
  iconUrl: string;
  techName: string;
};

const iconFramer = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, x: 0 },
};

export function TechIcon({ iconUrl, techName }: Props) {
  return (
    <>
      <div className="group">
        <div className="group tech-icon flex flex-col items-center justify-center
   w-16 h-16  bg-neutral-50 dark:bg-neutral-800 rounded-md shadow-md"
        >
          <img src={iconUrl} className="w-12 h-12" alt={techName} />

        </div>
        <motion.div
          className="invisible group-hover:visible absolute z-10 p-2 bg-neutral-50 dark:bg-neutral-800 rounded-md shadow-md"
          transition={{ duration: 0.5 }}
        >
          {techName}

        </motion.div>
      </div>
    </>

  );
}

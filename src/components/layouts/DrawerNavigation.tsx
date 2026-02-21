import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { AnimatePresence, motion } from 'framer-motion';
import * as React from 'react';
// @flow

type Props = {
  children: React.ReactNode;
  tab: string;
};

const NAVIGATION_ITEMS = [
  { id: 'home', path: '', label: 'Home' },
  { id: 'blog', path: 'blog', label: 'Blog' },
  { id: 'project', path: 'project', label: 'Project' },
  { id: 'playground', path: 'playground', label: 'Playground' },
  { id: 'about', path: 'about', label: 'About' },
] as const;

// Animation variants
const containerVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
  exit: {
    opacity: 0,
    y: 20,
  },
};

const headerVariants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      delay: 0.1,
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
};

export function DrawerNavigation({ children, tab }: Props) {
  const [isOpen, setIsOpen] = React.useState(false);

  const checkRoute = React.useCallback((route: string) => {
    return tab === route ? 'default' : 'outline';
  }, [tab]);

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <div>{children}</div>
      </DrawerTrigger>
      <DrawerContent>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full"
            >
              <DrawerHeader>
                <motion.div
                  variants={headerVariants}
                  className="w-full"
                >
                  <DrawerTitle>
                    Navigation Menu
                  </DrawerTitle>
                  <DrawerDescription>Click to navigate other pages!</DrawerDescription>
                </motion.div>
              </DrawerHeader>
              <DrawerFooter className="flex flex-col gap-2">
                {NAVIGATION_ITEMS.map(({ id, path, label }) => (
                  <motion.div
                    key={id}
                    variants={itemVariants}
                    className="w-full"
                  >
                    <Button
                      variant={checkRoute(id)}
                      asChild
                      className="w-full"
                    >
                      <a
                        href={path === '' ? '/' : `/${path}/`}
                        onClick={() => setIsOpen(false)}
                      >
                        {label}
                      </a>
                    </Button>
                  </motion.div>
                ))}
              </DrawerFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DrawerContent>
    </Drawer>
  );
}

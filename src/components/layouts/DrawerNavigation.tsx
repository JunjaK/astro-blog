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
// @flow
import * as React from 'react';

type Props = {
  children: React.ReactNode;
  tab: string;
};
export function DrawerNavigation({ children, tab }: Props) {
  function checkRoute(e: string) {
    return tab === e ? 'default' : 'outline';
  }

  return (
    <Drawer>
      <DrawerTrigger>{children}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            Navigation Menu
          </DrawerTitle>
          <DrawerDescription>Click to navigate other pages!</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button variant={checkRoute('home')}>
            <a href="/">Home</a>
          </Button>
          <Button variant={checkRoute('blog')}>
            <a href="/blog/">Blog</a>
          </Button>
          <Button variant={checkRoute('project')}>
            <a href="/project/">Project</a>
          </Button>
          <Button variant={checkRoute('playground')}>
            <a href="/playground/">Playground</a>
          </Button>
          <Button variant={checkRoute('about')}>
            <a href="/about/">About</a>
          </Button>
          <Button className="w-full" variant="outline">Nav Close</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

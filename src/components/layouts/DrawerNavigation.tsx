import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
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
          <h3>Navigation Menu</h3>
          <DrawerDescription>Click to navigate other pages!</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button variant={checkRoute('home')} asChild>
            <a href="/">Home</a>
          </Button>
          <Button variant={checkRoute('blog')} asChild>
            <a href="/blog/">Blog</a>
          </Button>
          <Button variant={checkRoute('project')} asChild>
            <a href="/project/">Project</a>
          </Button>
          <Button variant={checkRoute('playground')} asChild>
            <a href="/playground/">Playground</a>
          </Button>
          <Button variant={checkRoute('about')} asChild>
            <a href="/about/">About</a>
          </Button>
          <DrawerClose>
            <Button className="w-full" variant="outline">Nav Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

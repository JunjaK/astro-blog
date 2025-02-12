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

  function moveToPage(e: string) {
    if (e === '') {
      window.location.href = '/';
    }
    else {
      window.location.href = `/${e}/`;
    }
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
          <Button variant={checkRoute('home')} onClick={() => moveToPage('')}>
            Home
          </Button>
          <Button variant={checkRoute('blog')} onClick={() => moveToPage('blog')}>
            Blog
          </Button>
          <Button variant={checkRoute('project')} onClick={() => moveToPage('project')}>
            Project
          </Button>
          <Button variant={checkRoute('playground')} onClick={() => moveToPage('playground')}>
            Playground
          </Button>
          <Button variant={checkRoute('about')} onClick={() => moveToPage('about')}>
            About
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

import type React from 'react';

import { Button } from '@/components/ui/button.tsx';
import { Dock, DockIcon } from '@/components/ui/dock';

interface Props {
  tab: string;
}

export default function DocNav({ tab }: Props) {
  function checkRoute(e: string) {
    return tab === e ? 'default' : 'ghost';
  }
  return (
    <Dock direction="middle" className="doc-nav max-md:hidden">
      <DockIcon>
        <Button variant={checkRoute('home')} size="icon" asChild className="nav-btn">
          <a href="/">
            Home
          </a>
        </Button>
      </DockIcon>
      <DockIcon>
        <Button variant={checkRoute('blog')} size="icon" asChild className="nav-btn">
          <a href="/blog/">
            Blog
          </a>
        </Button>
      </DockIcon>
      <DockIcon>
        <Button variant={checkRoute('project')} size="icon" asChild className="nav-btn">
          <a href="/project/">
            Project
          </a>
        </Button>
      </DockIcon>
      <DockIcon>
        <Button variant={checkRoute('playground')} size="icon" asChild className="nav-btn">
          <a href="/playground/">
            Playground
          </a>
        </Button>
      </DockIcon>
      <DockIcon>
        <Button variant={checkRoute('about')} size="icon" asChild className="nav-btn">
          <a href="/about/">
            About
          </a>
        </Button>
      </DockIcon>
    </Dock>
  );
}

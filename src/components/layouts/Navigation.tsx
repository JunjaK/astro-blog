import { Icon } from '@iconify/react';
import React, { useEffect } from 'react';
import DocNav from '@/components/layouts/DockNav.tsx';
import { DrawerNavigation } from '@/components/layouts/DrawerNavigation.tsx';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import { Button } from '@/components/ui/button.tsx';

export default function Navigation() {
  const [tab, setTab] = React.useState('');
  const [isMobileMenuOpened, setIsMobileMenuOpened] = React.useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/') {
      setTab('home');
    }
    else if (path.includes('blog')) {
      setTab('blog');
    }
    else if (path.includes('project')) {
      setTab('project');
    }
    else if (path.includes('playground')) {
      setTab('playground');
    }
    else if (path.includes('about')) {
      setTab('about');
    }
    else if (path.includes('resume')) {
      setTab('resume');
    }
  }, []);

  function toggleMenu() {
    setIsMobileMenuOpened(!isMobileMenuOpened);
  }

  return (
    <>
      <nav>
        <div className="nav-content-wrapper layout-background">
          <div className="nav-content">
            <Button
              variant="ghost"
              size="icon"
              asChild
              name="to-home"
              aria-label="to-home"
            >
              <a href="/">
                <Icon icon="mynaui:code-waves-solid" className="logo"></Icon>
              </a>
            </Button>

            <DocNav tab={tab} />

            <div className="action-btn-wrapper">
              <DrawerNavigation tab={tab}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMenu}
                  className="md:hidden"
                  asChild
                  aria-label="mobile-drawer-menu"
                  name="mobile-drawer-menu"
                >
                  <Icon icon="mynaui:menu" className="logo"></Icon>
                </Button>
              </DrawerNavigation>
              <AnimatedThemeToggler />
            </div>
          </div>
          <hr className="m-0 h-px w-full border-none bg-gradient-to-r from-neutral-200/0 via-neutral-200/30 to-neutral-200/0" />
        </div>
        <div className="h-1"></div>
      </nav>
    </>

  );
}

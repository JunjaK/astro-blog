import { DrawerNavigation } from '@/components/layouts/DrawerNavigation.tsx';
import { SearchSite } from '@/components/layouts/SearchSite.tsx';
import { ModeToggle } from '@/components/ModeToggle.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { Icon } from '@iconify/react';
import React, { useEffect, useMemo } from 'react';
import { useWindowSize } from 'react-use';

export default function Navigation() {
  const [tab, setTab] = React.useState('');
  const [isMobileMenuOpened, setIsMobileMenuOpened] = React.useState(false);
  const [openSearch, setOpenSearch] = React.useState(false);
  const { width } = useWindowSize();

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/') {
      setTab('home');
    }
    else if (path === '/blog/') {
      setTab('blog');
    }
    else if (path === '/project/') {
      setTab('project');
    }
    else if (path === '/playground/') {
      setTab('playground');
    }
    else if (path === '/about/') {
      setTab('about');
    }
    else if (path === '/resume/') {
      setTab('resume');
    }
  }, []);

  const isMobileSize = useMemo(() => {
    return width < 768;
  }, [width]);

  function changeRoute(e: string) {
    setTab(e);
  }

  function toggleMenu() {
    setIsMobileMenuOpened(!isMobileMenuOpened);
  }

  function onClickSearch() {
    setOpenSearch(true);
  }

  return (
    <>
      <nav>
        <div className="nav-content-wrapper layout-background">
          <div className="nav-content">
            <Button variant="ghost" size="icon" asChild>
              <a href="/">
                <Icon icon="mynaui:code-waves-solid" className="logo"></Icon>
              </a>
            </Button>
            { !isMobileSize && (
              <Tabs value={tab} onValueChange={changeRoute}>
                <TabsList>
                  <TabsTrigger value="home">
                    <a href="/">Home</a>
                  </TabsTrigger>
                  <TabsTrigger value="blog">
                    <a href="/blog/">Blog</a>
                  </TabsTrigger>
                  <TabsTrigger value="project">
                    <a href="/project/">Project</a>
                  </TabsTrigger>
                  <TabsTrigger value="playground">
                    <a href="/playground/">Playground</a>
                  </TabsTrigger>
                  <TabsTrigger value="about">
                    <a href="/about/">About</a>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            <div className="action-btn-wrapper">
              { isMobileSize && (
                <DrawerNavigation tab={tab}>
                  <Button variant="ghost" size="icon" onClick={toggleMenu}>
                    <Icon icon="mynaui:menu" className="logo"></Icon>
                  </Button>
                </DrawerNavigation>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClickSearch}
              >
                <Icon icon="mynaui:search" className="logo"></Icon>
              </Button>
              <ModeToggle />
            </div>
          </div>
          <hr className="m-0 h-px w-full border-none bg-gradient-to-r from-neutral-200/0 via-neutral-200/30 to-neutral-200/0" />
        </div>
        <div className="h-1"></div>
      </nav>
      <SearchSite openSearch={openSearch} setOpenSearch={setOpenSearch} />
    </>

  );
}

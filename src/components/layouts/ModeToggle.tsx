import { Button } from '@/components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { $theme, setTheme } from '@/store/system.ts';
import { Icon } from '@iconify/react';
import { useStore } from '@nanostores/react';
import * as React from 'react';

export function ModeToggle() {
  const theme = useStore($theme);

  React.useEffect(() => {
    localStorage.getItem('theme') && setTheme(localStorage.getItem('theme') ?? 'dark');
  }, []);

  React.useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList[isDark ? 'add' : 'remove']('dark');
    document.getElementsByClassName('markdown-body')[0]?.classList.add(isDark ? 'dark' : 'light');
  }, [theme]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Icon icon="mynaui:sun-solid" className="h-[2rem] w-[2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"></Icon>
          <Icon icon="mynaui:moon-solid" className="absolute h-[2rem] w-[2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"></Icon>
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

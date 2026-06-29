import { Moon, Sun } from 'lucide-react';
import { useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';

import { cn } from '@/lib/utils';
import { setTheme } from '@/store/system';

interface AnimatedThemeTogglerProps
  extends React.ComponentPropsWithoutRef<'button'> {
  duration?: number;
}

export function AnimatedThemeToggler({
  className,
  duration = 400,
  ...props
}: AnimatedThemeTogglerProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleTheme = useCallback(async () => {
    if (!buttonRef.current)
      return;

    // Read the live DOM theme (set by ThemeInit pre-paint) — never the nanostore,
    // which is the SSR/CSR-divergent value that caused the #418 mismatch.
    const currentlyDark = document.documentElement.classList.contains('dark');
    const newTheme = currentlyDark ? 'light' : 'dark';

    const applyTheme = () => {
      setTheme(newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      }
      else {
        document.documentElement.classList.remove('dark');
        document.documentElement.removeAttribute('data-theme');
      }
      document.body.dispatchEvent(new Event('theme-set'));
    };

    if (!document.startViewTransition) {
      applyTheme();
      return;
    }

    await document.startViewTransition(() => {
      flushSync(applyTheme);
    }).ready;

    const { top, left, width, height }
      = buttonRef.current.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const maxRadius = Math.hypot(
      Math.max(left, window.innerWidth - left),
      Math.max(top, window.innerHeight - top),
    );

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration,
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)',
      },
    );
  }, [duration]);

  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex items-center justify-center rounded-md p-2 transition-colors hover:bg-accent hover:text-accent-foreground',
        className,
      )}
      aria-label="Toggle theme"
      {...props}
    >
      {/* Both icons render identically on SSR & CSR; the .dark class (set by
          ThemeInit before paint) picks which one is visible — no theme-derived
          markup, so no hydration mismatch. */}
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}

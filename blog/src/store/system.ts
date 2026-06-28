import { atom } from 'nanostores';

export const $theme = atom('dark');

export function setTheme(theme: string) {
  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    $theme.set(systemTheme);
    localStorage.setItem('theme', systemTheme);
  }
  else {
    $theme.set(theme);
    localStorage.setItem('theme', theme);
  }
}

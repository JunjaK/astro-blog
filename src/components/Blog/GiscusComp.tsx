import { $theme, setTheme } from '@/store/system';
import Giscus from '@giscus/react';
import { useStore } from '@nanostores/react';
import { useEffect } from 'react';

export default function GiscusComp() {
  const theme = useStore($theme);
  const giscusTheme = theme === 'dark' ? 'noborder_dark' : 'noborder_light';

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored) setTheme(stored);
  }, []);

  return (
    <Giscus
      id="comments"
      repo="JunjaK/astro-blog"
      repoId="R_kgDONnXaZQ"
      category="General"
      categoryId="DIC_kwDONnXaZc4Cm4-Q"
      mapping="pathname"
      strict="1"
      reactionsEnabled="1"
      emitMetadata="0"
      inputPosition="bottom"
      theme={giscusTheme}
      lang="ko"
      loading="lazy"
    />
  );
}

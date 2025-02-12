import Giscus from '@giscus/react';

export default function GiscusComp() {
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
      theme="noborder_dark"
      lang="ko"
      loading="lazy"
    />
  );
}

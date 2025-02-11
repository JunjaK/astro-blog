import type { BlogFrontMatter } from '@/types/commonType.ts';
import BlogTags from '@/components/Blog/BlogTags';
import { MagicCard, MagicContainer } from '@/components/ui/magic-card';
import dayjs from 'dayjs';
import dayJsRelativeTime from 'dayjs/plugin/relativeTime';
import { useMemo } from 'react';

dayjs.extend(dayJsRelativeTime);

interface Props {
  frontmatter: BlogFrontMatter;
}

export default function BlogFrontmatter({ frontmatter }: Props) {
  const created = useMemo(() => {
    const today = dayjs();
    const targetDate = dayjs(frontmatter.created);
    const diff = today.diff(frontmatter.created, 'day') > 31;
    if (diff) {
      return targetDate.format('YYYY-MM-DD');
    }
    return targetDate.fromNow();
  }, [frontmatter.created]);

  return (
    <MagicContainer className="flex w-full">
      <MagicCard className="flex w-full  items-center overflow-hidden p-6 shadow-2xl">
        <div>
          <div className="text-slate-500 dark:text-slate-300 ">
            {frontmatter.category}
          </div>
          <div className="title">{frontmatter.title}</div>
          <p className="text-muted-foreground">{created}</p>
          <hr />
          <div className="tags-wrapper">
            <BlogTags tags={frontmatter.tags} />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 h-full bg-[radial-gradient(circle_at_50%_100%,rgba(88,88,88,0.2),rgba(255,255,255,0))]" />
      </MagicCard>
    </MagicContainer>
  );
}

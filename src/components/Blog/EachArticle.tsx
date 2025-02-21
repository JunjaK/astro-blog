import type { BlogFrontMatter } from '@/types/commonType';
import darkFallbackImg from '@/assets/images/fallbackImg.svg';
import { ny } from '@/lib/utils';
import dayjs from 'dayjs';
import dayJsRelativeTime from 'dayjs/plugin/relativeTime';
import React, { useEffect, useMemo, useState } from 'react';
import BlogTags from './BlogTags';

dayjs.extend(dayJsRelativeTime);

interface Props {
  frontmatter: BlogFrontMatter;
  url?: string;
}

const images = import.meta.glob<{ default: ImageMetadata }>('/src/content/blog/**/*.{jpeg,jpg,png,gif,webp}');

export default function EachArticle({ frontmatter, url }: Props) {
  const [imageSrc, setImageSrc] = useState<string | undefined>(darkFallbackImg.src);

  const created = useMemo(() => {
    const today = dayjs();
    const targetDate = dayjs(frontmatter.created);
    const diff = today.diff(frontmatter.created, 'day') > 31;
    if (diff) {
      return targetDate.format('YYYY-MM-DD');
    }
    return targetDate.fromNow();
  }, [frontmatter.created]);

  useEffect(() => {
    images[frontmatter.thumbnail]()
      .then((e) => {
        setImageSrc(e.default.src);
      });
  }, []);

  return (
    <figure
      className={`${ny(
        'relative min-h-fit cursor-pointer overflow-hidden rounded-2xl p-4',
        // animation styles

        'transition-all duration-200 ease-in-out hover:scale-[103%]',
        // light styles

        'bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]',
        // dark styles

        'transform-gpu dark:bg-transparent dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]',
      )} article-wrapper`}
    >
      <a href={url}>
        <article className="blog-article">
          <img
            src={imageSrc}
            alt={frontmatter.title}
            className="rounded-lg"
            width={128}
            height={128}
          />

          <div className="article-info">
            <h4 className="title">{frontmatter.title}</h4>
            <div className="desc">
              <BlogTags tags={frontmatter.tags ?? []} />
              <p className="text-green-600 dark:text-green-500 ">{frontmatter.category}</p>
              <p className="text-muted-foreground">{created}</p>
            </div>
          </div>
        </article>
      </a>
    </figure>

  );
}

import type { ProjectInfo, TechIconType } from '@/types/commonType';
import { TechIcon } from '@/components/About/TechStackComp/TechIcon';
import { cn } from '@/lib/utils';
import { $theme } from '@/store/system';
import getTechIcons from '@/utils/getTechIcons';
import { useStore } from '@nanostores/react';
import React, { useEffect, useState } from 'react';
import { Separator } from '../ui/separator';

interface EachArticlesProps {
  frontmatter: ProjectInfo;
  url?: string;
}

const EachArticles: React.FC<EachArticlesProps> = ({ frontmatter, url }) => {
  const theme = useStore($theme);
  const [techStacks, setTechStacks] = useState<TechIconType[]>([]);

  useEffect(() => {
    setTechStacks(getTechIcons(frontmatter.techStacks ?? [], theme));
  }, [theme, frontmatter]);

  return (
    <figure
      key={url}
      className={cn(
        'relative min-h-fit cursor-pointer  rounded-2xl',
        // animation styles
        'transition-all duration-200 ease-in-out hover:scale-[103%]',
        // light styles
        'bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]',
        // dark styles
        'transform-gpu dark:bg-transparent dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]',
        'project-article-wrapper',
      )}
    >
      <a href={url} className="h-full block">
        <article className="project-article">

          <img
            src={frontmatter.thumbnail ?? ''}
            alt={frontmatter.title}
            loading="lazy"
            className="rounded-t-2xl project-thumbnail"
          />

          <div className="article-info">
            <h3 className="article-title">{frontmatter.title}</h3>
            <div className="duration">
              {frontmatter.duration}
            </div>
            <p className="desc">
              {frontmatter.description?.split('<br/>').map((line, idx) => (
                <React.Fragment key={`${frontmatter.title}-${idx}`}>
                  {line}
                  <br />
                </React.Fragment>
              ))}
            </p>

            <Separator className="my-2" />
            <div className="tech-stack-wrapper">
              <div className="tech-stack-label">
                Tech Stack:
              </div>
              <div className="tech-stack-list">
                {techStacks.map((tech) => (
                  <TechIcon key={`${frontmatter.title}-${tech.techName}`} iconUrl={tech.iconUrl} techName={tech.techName} />
                ))}
              </div>

            </div>
          </div>
        </article>
      </a>
    </figure>
  );
};

export default EachArticles;

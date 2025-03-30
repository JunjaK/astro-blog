import type { CollectionEntry } from 'astro:content';
import EachArticles from '@/components/Project/EachArticles';
import React from 'react';

type Props = {
  projects: CollectionEntry<'playground'>[];
};

export default function Articles({ projects }: Props) {
  return (
    <div id="projects-wrapper" className="mt-8">
      {projects.map((project) => (
        <EachArticles key={project.slug} frontmatter={project.data} url={`/playground/${project.slug}`} />
      ))}
    </div>
  );
}

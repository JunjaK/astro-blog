import type { CollectionEntry } from 'astro:content';
import React from 'react';
import EachArticles from './EachArticles';

type Props = {
  projects: CollectionEntry<'project'>[];
};

export default function Articles({ projects }: Props) {
  return (
    <div id="projects-wrapper" className="mt-8">
      {projects.map((project) => (
        <EachArticles key={project.slug} frontmatter={project.data} url={`/project/${project.slug}`} />
      ))}
    </div>
  );
}

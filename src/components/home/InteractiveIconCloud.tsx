import { IconCloud } from '@/components/ui/icon-cloud';

const slugs = [
  'typescript',
  'javascript',
  'react',
  'nextdotjs',
  'vuedotjs',
  'nuxt',
  'astro',
  'testinglibrary',
  'vitest',
  'tailwindcss',
  'chartdotjs',
  'vitepress',
  'vite',
  'webpack',
  'html5',
  'css',
  'nodedotjs',
  'express',
  'postgresql',
  'pnpm',
  'vercel',
  'firebase',
  'nginx',
  'netlify',
  'linux',
  'docker',
  'git',
  'jira',
  'github',
  'gitlab',
  'webstorm',
  'figma',
  'perplexity',
  'anthropic',
];

const images = slugs.map(
  (slug) => `https://cdn.simpleicons.org/${slug}`,
);

export default function InteractiveIconCloud() {
  return (
    <IconCloud images={images} maxSize={550} className="flex justify-center" />
  );
}

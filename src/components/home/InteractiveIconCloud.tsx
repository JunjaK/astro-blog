import IconCloud from '@/components/ui/icon-cloud';

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
  'css3',
  'nodedotjs',
  'express',
  'postgresql',
  'amazonec2',
  'amazons3',
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
  'openai',
];

export default function InteractiveIconCloud() {
  return (
    <div className="relative flex size-full max-w-lg items-center justify-center overflow-hidden rounded-lg px-20 pb-20 pt-8 ">
      <IconCloud iconSlugs={slugs} />
    </div>
  );
}

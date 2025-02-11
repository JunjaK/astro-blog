import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
// @ts-check
import { defineConfig } from 'astro/config';
import { rehypeAccessibleEmojis } from 'rehype-accessible-emojis';
import rehypeFormat from 'rehype-format';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkDirective from 'remark-directive';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkToc from 'remark-toc';

// https://astro.build/config
export default defineConfig({
  // Enable React to support React JSX components.
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-dark-dimmed',
    },
    remarkPlugins: [
      [remarkToc, { heading: 'toc', maxDepth: 3 }],
      [remarkDirective],
      [remarkFrontmatter],
      [remarkGfm],
      [remarkMath],
    ],
    rehypePlugins: [
      [rehypeRaw],
      [rehypeFormat],
      [rehypeSanitize],
      [rehypeAccessibleEmojis],

    ],
  },
  vite: {
    ssr: {
      noExternal: ['react-use'],
    },
    optimizeDeps: {
      include: ['react-use'],
    },
  },

});

import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
// @ts-check
import { defineConfig, passthroughImageService } from 'astro/config';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import remarkMermaidToHtml from './src/plugins/remarkMermaidToHtml.mjs';
// https://astro.build/config

const SCSS_Logger = {
  warn(message, options) {
    // Mute "Mixed Declarations" warning
    if (options.deprecation && message.includes('mixed-decls')) {
      return;
    }
    // List all other warnings
    console.warn(`▲ [WARNING]: ${message}`);
  },
};

export default defineConfig({
  // Enable React to support React JSX components.
  site: 'https://jun-astro-blog.netlify.app',
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
    mdx(),
    sitemap(),
  ],
  image: {
    service: passthroughImageService(),
  },
  markdown: {
    shikiConfig: {
      theme: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
    remarkPlugins: [remarkMath, remarkMermaidToHtml],
    rehypePlugins: [rehypeKatex],
    syntaxHighlight: false,
  },
  vite: {
    ssr: {
      noExternal: ['react-use'],
    },
    optimizeDeps: {
      include: ['react-use'],
    },
    plugins: [],
    css: {
      preprocessorOptions: {
        scss: {
          logger: SCSS_Logger,
        },
      },
    },
  },

});

import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';
import tailwind from '@astrojs/tailwind';
import vue from '@astrojs/vue';
import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import expressiveCode from 'astro-expressive-code';
// @ts-check
import { defineConfig, passthroughImageService } from 'astro/config';
import { pluginColorChips } from 'expressive-code-color-chips';

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
  site: 'https://www.jun-devlog.win',
  integrations: [react(), svelte(), vue(), tailwind({ applyBaseStyles: false }), sitemap(), expressiveCode({
    themes: ['kanagawa-dragon', 'catppuccin-latte'],
    plugins: [pluginCollapsibleSections(), pluginLineNumbers(), pluginColorChips()],
  }), mdx({})],
  image: {
    service: passthroughImageService(),
  },
  markdown: {
    remarkPlugins: [remarkMermaidToHtml, remarkMath],
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

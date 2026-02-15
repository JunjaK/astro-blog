import fs from 'node:fs';
import path from 'node:path';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';
import vue from '@astrojs/vue';
import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import tailwindcss from '@tailwindcss/vite';
import expressiveCode from 'astro-expressive-code';
// @ts-check
import { defineConfig, passthroughImageService } from 'astro/config';
import { pluginColorChips } from 'expressive-code-color-chips';
import { lookup } from 'mrmime';

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
  integrations: [react(), svelte(), vue(), sitemap(), expressiveCode({
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
    plugins: [
      tailwindcss(),
      {
        name: 'serve-image-assets',
        configureServer(server) {
          server.middlewares.use('/files', (req, res, next) => {
            const filePath = path.join(process.cwd(), 'image-assets', req.url);
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              res.setHeader('Content-Type', lookup(filePath) || 'application/octet-stream');
              fs.createReadStream(filePath).pipe(res);
            }
            else {
              next();
            }
          });
        },
      },
    ],
    ssr: {
      noExternal: ['react-use'],
    },
    optimizeDeps: {
      include: ['react-use'],
    },
    css: {
      preprocessorOptions: {
        scss: {
          logger: SCSS_Logger,
        },
      },
    },
  },

});

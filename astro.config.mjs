import fs from 'node:fs';
import https from 'node:https';
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
import pagefind from 'astro-pagefind';
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
  }), mdx({}), pagefind()],
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
              res.setHeader('Cache-Control', 'public, max-age=86400');
              fs.createReadStream(filePath).pipe(res);
            }
            else {
              // Proxy to production server (e.g. live2d models on raspi)
              const proxyUrl = `https://www.jun-devlog.win/files${req.url}`;
              https.get(proxyUrl, (proxyRes) => {
                if (proxyRes.statusCode !== 200) { next(); return; }
                res.writeHead(proxyRes.statusCode, {
                  'Content-Type': proxyRes.headers['content-type'] || 'application/octet-stream',
                  'Cache-Control': 'public, max-age=86400',
                });
                proxyRes.pipe(res);
              }).on('error', () => next());
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

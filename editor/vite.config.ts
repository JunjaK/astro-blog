import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Editor SPA is served at https://jun-devlog.win/editor (behind Cloudflare),
// API at /editor-api. Base path must match the public mount point.
export default defineConfig({
  base: '/editor/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      scope: '/editor/',
      manifest: {
        name: 'jun-devlog editor',
        short_name: 'editor',
        start_url: '/editor/',
        scope: '/editor/',
        display: 'standalone',
        background_color: '#0a0a0a',
        theme_color: '#0a0a0a',
        icons: [
          { src: '/editor/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
    }),
  ],
  server: {
    // Dev: proxy API calls to the local Hono server.
    proxy: {
      '/editor-api': { target: 'http://localhost:4322', changeOrigin: true },
    },
  },
});

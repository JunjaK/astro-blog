import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Editor SPA is served at https://jun-devlog.win/editor (behind Cloudflare),
// API at /editor-api. Base path must match the public mount point.
export default defineConfig({
  base: '/editor/',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    react(),
    tailwindcss(),
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
      // dev-uploaded media is served by the local Hono server (./.media). Keep this
      // entry BEFORE '/files' so the more specific prefix matches first.
      '/files/media': { target: 'http://localhost:4322', changeOrigin: true },
      // already-published images (no local image-assets here) → pull from production.
      '/files': { target: 'https://www.jun-devlog.win', changeOrigin: true, secure: true },
    },
  },
});

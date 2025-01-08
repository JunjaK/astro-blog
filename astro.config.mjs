import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Enable React to support React JSX components.
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
});

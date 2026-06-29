import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

// Enumerate blog-post routes straight from the content collection on disk.
// `src/content/blog/diary/25-01-tokyo/02_01-21.mdx` → `/blog/diary/25-01-tokyo/02_01-21`
// (matches Astro's `[...slug]` = entry.id mapping). No sitemap dependency (dev may not emit one).
const CONTENT_DIR = join(import.meta.dirname, '../src/content/blog');

function blogRoutes(): string[] {
  return readdirSync(CONTENT_DIR, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.mdx?$/.test(entry.name))
    .map((entry) => {
      const abs = join(entry.parentPath, entry.name);
      // Astro lowercases the slug (e.g. nyxbUI.mdx → /blog/.../nyxbui); underscores/dashes kept.
      const rel = abs.slice(CONTENT_DIR.length + 1).replace(/\\/g, '/').replace(/\.mdx?$/, '').toLowerCase();
      return `/blog/${rel}`;
    })
    .sort();
}

// React logs the full message in the dev build ("Hydration failed because the
// server rendered HTML didn't match the client") and minified codes (#418/#423/#425) in prod.
const HYDRATION_RE = /#(?:418|421|422|423|425)|Hydration failed|did not match/i;

const routes = blogRoutes();

test.describe('hydration sweep — no SSR/CSR mismatch on blog posts', () => {
  for (const route of routes) {
    test(route, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error')
          errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(err.message));

      const res = await page.goto(route, { waitUntil: 'load' });
      expect(res?.ok(), `${route} did not return 2xx`).toBeTruthy();

      // client:visible islands only hydrate when scrolled into view; settle after.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);

      const hydrationErrors = errors.filter((text) => HYDRATION_RE.test(text));
      expect(hydrationErrors, `${route}\n${hydrationErrors.join('\n---\n')}`).toEqual([]);
    });
  }
});

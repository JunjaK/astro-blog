import { expect, test } from '@playwright/test';
import path from 'path';

const PAGE_URL = '/blog/diary/25-01-tokyo/01_01-20';
const SCREENSHOTS_DIR = path.join(import.meta.dirname, 'screenshots');

// Scroll the DiaryGalleryUnified section into view to trigger client:visible
// hydration, then coerce R3F's ResizeObserver to fire by dispatching a resize
// event, then wait for all images to load (overlay → opacity-0).
async function waitForGalleryLoaded(page: import('@playwright/test').Page) {
  // Navigate to the section via window.scrollTo so IntersectionObserver fires.
  const sectionTop = await page.evaluate(() => {
    const section = document.querySelector('section.relative');
    return section ? section.getBoundingClientRect().top + window.scrollY : 2500;
  });

  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), sectionTop);

  // Also wheel-scroll to ensure IO callback fires in headless Chromium.
  const vp = page.viewportSize()!;
  await page.mouse.move(vp.width / 2, vp.height / 2);
  await page.mouse.wheel(0, 100);

  // Wait for the component to hydrate (canvas appears in DOM).
  await page.waitForSelector('canvas', { state: 'attached', timeout: 15_000 });

  // Force R3F's ResizeObserver by toggling the viewport size slightly.
  // This reliably triggers the canvas resize in headless Chromium.
  await page.setViewportSize({ width: vp.width + 1, height: vp.height });
  await page.setViewportSize({ width: vp.width, height: vp.height });

  // Also dispatch window resize event inside the page for good measure.
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));

  // Wait for R3F to resize the canvas (grows from 300×150 default).
  await page.waitForFunction(
    () => {
      const c = document.querySelector('canvas');
      return c !== null && c.width > 300;
    },
    { timeout: 15_000 },
  );

  // Wait for all textures to load (overlay → opacity-0).
  const loadingOverlay = page.locator('.z-30').first();
  await expect(loadingOverlay).toHaveClass(/opacity-0/, { timeout: 60_000 });
}

test.describe('DiaryGalleryUnified - Three.js WebGL canvas', () => {
  test.setTimeout(90_000);

  test('canvas exists and loading overlay disappears after images load', async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForLoadState('domcontentloaded');

    await waitForGalleryLoaded(page);

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // Confirm canvas has real dimensions (not the 300×150 HTML default)
    const [w, h] = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      return c ? [c.width, c.height] : [0, 0];
    });
    expect(w).toBeGreaterThan(300);
    expect(h).toBeGreaterThan(150);

    const box = await canvas.boundingBox();
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'threejs-canvas-after-load.png'),
      clip: box ?? undefined,
    });
  });

  test('canvas renders with a valid WebGL context', async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForLoadState('domcontentloaded');

    await waitForGalleryLoaded(page);

    const hasWebGL = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      if (!c) return false;
      const gl = c.getContext('webgl2') ?? c.getContext('webgl');
      return gl !== null;
    });
    expect(hasWebGL).toBe(true);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'threejs-canvas-webgl.png'),
    });
  });

  test('loading counter reaches total and overlay fades out', async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForLoadState('domcontentloaded');

    await waitForGalleryLoaded(page);

    // After loading the text reads "X / Y" where X === Y
    const loadingText = await page.evaluate(() => {
      const overlay = document.querySelector('.z-30');
      return overlay ? (overlay.querySelector('p')?.textContent ?? '') : '';
    });
    const [loaded, total] = loadingText.split('/').map((s) => parseInt(s.trim(), 10));
    expect(loaded).toBe(total);
    expect(total).toBeGreaterThan(0);
  });

  test('section indicator dots are visible after loading', async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForLoadState('domcontentloaded');

    await waitForGalleryLoaded(page);

    // Dots container: right-aligned column of small circles inside the sticky div.
    // They get opacity-100 once allLoaded = true.
    const dotsContainer = page.locator('.sticky .rounded-full').first();
    await expect(dotsContainer).toBeVisible({ timeout: 10_000 });

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'threejs-canvas-with-dots.png'),
    });
  });
});

import { test, expect } from '@playwright/test';

test.describe('Live2D Widget', () => {
  test('widget loads without errors', async ({ page }) => {
    const live2dErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (
          text.toLowerCase().includes('live2d') ||
          text.toLowerCase().includes('cubism') ||
          text.toLowerCase().includes('waifu')
        ) {
          live2dErrors.push(text);
        }
      }
    });

    const notFoundRequests: string[] = [];
    page.on('response', (response) => {
      if (response.status() >= 400) {
        const url = response.url();
        if (url.includes('live2d') || url.includes('waifu') || url.includes('cubism')) {
          notFoundRequests.push(`${response.status()} ${url}`);
        }
      }
    });

    await page.goto('http://localhost:4321', { waitUntil: 'networkidle' });
    await page.waitForTimeout(8000);

    console.log('=== Live2D Errors ===');
    live2dErrors.forEach((e) => console.log(`  ${e}`));

    console.log('=== Live2D 4xx Responses ===');
    notFoundRequests.forEach((r) => console.log(`  ${r}`));

    // Widget DOM exists
    expect(await page.locator('#waifu').count()).toBeGreaterThan(0);
    expect(await page.locator('#waifu-toggle').count()).toBeGreaterThan(0);
    expect(await page.locator('#live2d').count()).toBeGreaterThan(0);

    // No Live2D-specific 404s
    expect(notFoundRequests).toHaveLength(0);

    // No Live2D console errors
    expect(live2dErrors).toHaveLength(0);

    await page.screenshot({ path: 'e2e/screenshots/live2d-final.png', fullPage: false });
  });
});

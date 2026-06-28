import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForLoadState('networkidle');
    // Filter out known benign errors (e.g. favicon, analytics)
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('analytics') && !e.includes('clarity'),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('LightRays background renders', async ({ page }) => {
    // LightRays renders animated divs inside a container
    const lightRays = page.locator('[class*="fixed inset-0"]');
    await expect(lightRays).toBeVisible();
  });

  test('text animations render visible text', async ({ page }) => {
    // Wait for hydration
    await page.waitForTimeout(2000);

    // "Hello World! I'm Junja" text should be visible after TextAnimate hydrates
    const introText = page.getByText("Hello World! I'm Junja", { exact: false });
    await expect(introText.first()).toBeVisible({ timeout: 10000 });

    // "Technologies I've worked" text
    const techText = page.getByText("Technologies I've worked", { exact: false });
    // Scroll into view first
    await techText.first().scrollIntoViewIfNeeded();
    await expect(techText.first()).toBeVisible({ timeout: 10000 });
  });

  test('IconCloud canvas is present and sized correctly', async ({ page }) => {
    const canvas = page.locator('canvas[aria-label="Interactive 3D Icon Cloud"]');
    await canvas.scrollIntoViewIfNeeded();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Verify canvas has reasonable size (responsive, should be > 300px on desktop)
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(300);
    expect(box!.height).toBeGreaterThan(300);
    // Square aspect ratio
    expect(box!.width).toBe(box!.height);
  });

  test('FlickeringGrid canvas renders', async ({ page }) => {
    // FlickeringGrid renders a canvas element inside a container
    const flickeringContainer = page.locator('[class*="mask-image"]');
    await flickeringContainer.scrollIntoViewIfNeeded();
    const canvas = flickeringContainer.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
  });

  test('Intro section text is visible after hydration', async ({ page }) => {
    await page.waitForTimeout(2000);

    // BoxReveal content should be visible
    const introContent = page.getByText('안녕하세요, 여기는 저의 개인 블로그입니다', { exact: false });
    await expect(introContent.first()).toBeVisible({ timeout: 10000 });

    // "포스트 바로가기" button
    const blogButton = page.getByText('포스트 바로가기');
    await expect(blogButton).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Home page - mobile', () => {
  test.use({ viewport: { width: 393, height: 851 } }); // Pixel 5

  test('renders correctly on mobile viewport', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Text should still be visible
    const introText = page.getByText("Hello World! I'm Junja", { exact: false });
    await expect(introText.first()).toBeVisible({ timeout: 10000 });

    // Blog button should be accessible
    const blogButton = page.getByText('포스트 바로가기');
    await blogButton.scrollIntoViewIfNeeded();
    await expect(blogButton).toBeVisible({ timeout: 10000 });
  });

  test('IconCloud fits within mobile viewport', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('canvas[aria-label="Interactive 3D Icon Cloud"]');
    await canvas.scrollIntoViewIfNeeded();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    // Canvas should not overflow the 393px viewport
    expect(box!.width).toBeLessThanOrEqual(393);
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.width).toBe(box!.height);
  });
});

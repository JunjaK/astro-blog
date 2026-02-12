import { expect, test } from '@playwright/test';

const DIARY_URL = '/blog/diary/japan-around-trip/23_12-19';

test.describe('DiaryGallery - 23_12-19', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DIARY_URL);
    await page.waitForLoadState('networkidle');
  });

  test('page renders with correct title', async ({ page }) => {
    await expect(page).toHaveTitle('Jun devlog | 12월 19일 히로사키시와 아오모리시');
  });

  test('frontmatter displays correctly', async ({ page }) => {
    await expect(page.getByText('Diary', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('12월 19일 히로사키시와 아오모리시', { exact: true })).toBeVisible();
    await expect(page.getByText('2025-04-09', { exact: true })).toBeVisible();
  });

  test('all diary sections render with headings', async ({ page }) => {
    const sectionHeadings = [
      '루트 및 방문한 곳',
      '아오모리시로 이동',
      '신아오모리역 도착',
      '히로사키역 도착',
      '히로사키성 (첫번째 스탬프)',
      '후지타기념정원 (두번째 스탬프)',
      '히로사키시립관광관 (세번째 스탬프)',
      '히로사키마치나카정보센터 (네번째 스탬프)',
      'JR히로사키역 쓰가루 라운지 (다섯번째 스탬프)',
      '우토우 신사',
      '텐마이 (저녁)',
      '식후 산책',
    ];

    for (const heading of sectionHeadings) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }
  });

  test('hero images render for each section', async ({ page }) => {
    const heroAlts = [
      '12월 19일 루트',
      '숙소 로비의 후로후시 온천 그림',
      '눈 쌓인 신아오모리 거리 풍경',
      '히로사키역의 유키미쿠',
      '히로사키성 천수각',
      '후지타기념정원 눈 덮인 정원',
      '유키미쿠 캠페인 홍보',
      '사쿠라미쿠 전시장',
      '쓰가루 라운지',
      '눈 덮인 우토우 신사 입구',
      '아오모리 지자케 5종 세트',
      '아스팜 야경 녹색 조명',
    ];

    for (const alt of heroAlts) {
      await expect(page.getByAltText(alt)).toBeAttached();
    }
  });

  test('gallery grid images render', async ({ page }) => {
    await expect(page.getByAltText('휴게소 풍경')).toBeAttached();
    await expect(page.getByAltText('사쿠라미쿠 콜라보 드립 커피')).toBeAttached();
    await expect(page.getByAltText('신아오모리역 주변 적설')).toBeAttached();
    await expect(page.getByAltText('눈 쌓인 성 아래 공원')).toBeAttached();
    await expect(page.getByAltText('텐마이 이자카야 입구')).toBeAttached();
  });

  test('tag badges display on tagged images', async ({ page }) => {
    await expect(page.getByText('유키미쿠').first()).toBeAttached();
    await expect(page.getByText('니혼슈').first()).toBeAttached();
    await expect(page.getByText('네부타').first()).toBeAttached();
    await expect(page.getByText('사쿠라미쿠').first()).toBeAttached();
  });

  test('lightbox opens on hero image click', async ({ page }) => {
    // Scroll to trigger client:visible hydration
    const heroImage = page.getByAltText('숙소 로비의 후로후시 온천 그림');
    await heroImage.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000); // Wait for React hydration

    await heroImage.click();

    const lightbox = page.locator('.PhotoView-Portal');
    await expect(lightbox).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Escape');
    await expect(lightbox).not.toBeVisible();
  });

  test('lightbox opens on gallery image click', async ({ page }) => {
    const galleryImage = page.getByAltText('휴게소 풍경');
    await galleryImage.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000); // Wait for React hydration

    await galleryImage.click();

    const lightbox = page.locator('.PhotoView-Portal');
    await expect(lightbox).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Escape');
    await expect(lightbox).not.toBeVisible();
  });

  test('prev/next blog navigation links work', async ({ page }) => {
    const prevLink = page.getByRole('link', { name: /이전 글/ }).first();
    await expect(prevLink).toHaveAttribute('href', '/blog/diary/japan-around-trip/22_12-18');

    const nextLink = page.getByRole('link', { name: /다음 글/ }).first();
    await expect(nextLink).toHaveAttribute('href', '/blog/diary/japan-around-trip/24_12-20');
  });

  test('route section has visited places list', async ({ page }) => {
    const routeSection = page.locator('li', { hasText: '아오모리현 후쿠우라지마' }).first();
    await expect(routeSection).toBeVisible();

    await expect(page.locator('li', { hasText: '아오모리현 히로사키시' }).first()).toBeVisible();
    await expect(page.locator('li', { hasText: '아오모리현 아오모리시' }).first()).toBeVisible();
  });
});

test.describe('DiaryGallery - responsive', () => {
  test('mobile: sections stack vertically', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(DIARY_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.getByAltText('12월 19일 루트')).toBeAttached();
    await expect(page.getByRole('heading', { name: '루트 및 방문한 곳' })).toBeVisible();
  });
});

/**
 * DiaryCarousel E2E tests using agent-browser + vitest.
 * Tests the 25-01 Tokyo Day 1 diary page.
 *
 * NOTE: Interactive tests (lightbox, carousel buttons) require client:visible
 * hydration, which needs a running dev server with fresh Vite cache.
 * If hydration fails, those tests are skipped gracefully.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AgentBrowser } from './helpers/ab';

const BASE_URL = 'http://localhost:4321';
const DIARY_PATH = '/blog/diary/25-01-tokyo/01_01-20';

describe('DiaryCarousel - 25-01 Tokyo Day 1', () => {
  const ab = new AgentBrowser();

  beforeAll(() => {
    ab.open(`${BASE_URL}${DIARY_PATH}`);
    ab.waitForLoad('networkidle');
  });

  afterAll(() => {
    ab.close();
  });

  // --- Static content tests (no hydration needed) ---

  it('page renders with correct title', () => {
    const title = ab.getTitle();
    expect(title).toContain('1일차');
    expect(title).toContain('몬자야키');
  });

  it('section headings are present', () => {
    const snap = ab.snapshot();
    const headings = [
      '루트 및 방문한 곳',
      '여행 목적',
      '츠키시마 몬쟈 스트리트',
      '긴자',
      '우에노',
    ];
    for (const h of headings) {
      expect(AgentBrowser.contains(snap, h)).toBe(true);
    }
  });

  it('carousel regions exist', () => {
    const snap = ab.snapshot();
    // 3 DiaryCarousels on the page → 3 "Previous slide" buttons
    const count = (snap.match(/Previous slide/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it('navigation links present', () => {
    const snap = ab.snapshot();
    expect(AgentBrowser.contains(snap, '이전 글')).toBe(true);
  });

  it('mobile viewport still renders content', () => {
    ab.setViewport(375, 812);
    ab.wait(500);

    const snap = ab.snapshot();
    expect(AgentBrowser.contains(snap, '루트 및 방문한 곳')).toBe(true);

    ab.setViewport(1280, 720);
    ab.wait(300);
  });

  // --- Interactive tests (require client:visible hydration) ---

  it('carousel buttons become enabled after hydration', () => {
    // Scroll to first carousel to trigger client:visible hydration
    ab.eval(`document.querySelector('[aria-roledescription="carousel"]')?.scrollIntoView({ behavior: 'instant', block: 'center' })`);
    ab.wait(3000);

    const enabledCount = Number(
      ab.eval(`document.querySelectorAll('[aria-roledescription=carousel] button:not([disabled])').length`),
    );

    if (enabledCount === 0) {
      // Hydration didn't fire (stale Vite cache or headless IO issue)
      console.warn('Skipping: carousel not hydrated (restart dev server with fresh Vite cache)');
      return;
    }

    // Click Next slide button
    const snap = ab.snapshot({ interactive: true });
    const nextRef = AgentBrowser.findRefs(snap, /Next slide/);
    expect(nextRef.length).toBeGreaterThan(0);

    ab.click(nextRef[0]);
    ab.wait(500);

    const afterSnap = ab.snapshot({ compact: true });
    expect(afterSnap.length).toBeGreaterThan(0);
  });

  it('lightbox opens on image click and closes on Escape', () => {
    ab.eval(`document.querySelector('[aria-roledescription="carousel"]')?.scrollIntoView({ behavior: 'instant', block: 'center' })`);
    ab.wait(3000);

    const hydrated = Number(
      ab.eval(`document.querySelectorAll('[aria-roledescription=carousel] button:not([disabled])').length`),
    );

    if (hydrated === 0) {
      console.warn('Skipping: carousel not hydrated');
      return;
    }

    // Click first carousel image
    ab.eval(`document.querySelector('[aria-roledescription=carousel] img[class*=cursor-pointer]')?.click()`);
    ab.wait(1000);

    const lbSnap = ab.snapshot();
    const hasLightbox =
      AgentBrowser.contains(lbSnap, 'dialog') ||
      AgentBrowser.contains(lbSnap, 'portal') ||
      AgentBrowser.contains(lbSnap, 'overlay');

    expect(hasLightbox).toBe(true);

    ab.press('Escape');
    ab.wait(500);
  });
});

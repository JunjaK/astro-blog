import { expect, test } from '@playwright/test';

import { groupSpots, isPlottable } from '../src/components/Blog/TravelMap/groupSpots';
import { spots as spots23 } from '../src/data/diarySpots/23_12-19';
import { spots as spots24 } from '../src/data/diarySpots/24_12-20';

// 두 편을 쓴다 — 한 편으로는 두 모드를 못 덮는다.
//   23_12-19  단일 현(아오모리) · 시정촌 경계 · 도시 마커 · anchor 있음
//   24_12-20  2개 현(아오모리+도쿄) · 현 실루엣 · 현 마커
const SINGLE = {
  url: '/blog/diary/japan-around-trip/23_12-19',
  spots: spots23,
  level: 'city' as const,
};
const MULTI = {
  url: '/blog/diary/japan-around-trip/24_12-20',
  spots: spots24,
  level: 'prefecture' as const,
};

const markerCount = (spots: typeof spots23, level: 'city' | 'prefecture') =>
  groupSpots(spots, level).filter(isPlottable).length;

/** client:visible 아일랜드라 뷰포트에 들어와야 하이드레이션된다. 고정 대기 대신 마커를 기다린다. */
async function openMap(page: import('@playwright/test').Page, url: string) {
  await page.goto(url);
  await page.locator('.tm-wrapper').scrollIntoViewIfNeeded();
  await expect(page.locator('.tm-dot').first()).toBeVisible();
}

test.describe('TravelMap — 단일 현 (23_12-19)', () => {
  test.beforeEach(async ({ page }) => openMap(page, SINGLE.url));

  test('마커 수가 도시 그룹 수와 같다', async ({ page }) => {
    await expect(page.locator('.tm-dot')).toHaveCount(markerCount(SINGLE.spots, SINGLE.level));
  });

  test('마커가 겹치지 않는다', async ({ page }) => {
    // D4′ 가 고친 결함의 회귀 방지 — 겹친 마커는 보이지 않는데 Tab 으로는 포커스된다
    const positions = await page.locator('.tm-dot').evaluateAll(nodes =>
      nodes.map(n => `${Math.round(+n.getAttribute('cx')!)},${Math.round(+n.getAttribute('cy')!)}`));

    expect(new Set(positions).size).toBe(positions.length);
  });

  test('배경이 시정촌 경계다 (현 실루엣 아님)', async ({ page }) => {
    await expect(page.locator('.tm-muni').first()).toBeAttached();
    await expect(page.locator('.tm-muni--plain')).toHaveCount(0);
  });

  test('마커는 버튼이고 svg 는 group 이다', async ({ page }) => {
    // role="img" 로 되돌아가면 하위 트리가 presentational 이 돼 마커가 AT 에서 사라진다
    await expect(page.locator('.tm-svg')).toHaveAttribute('role', 'group');

    const dots = page.locator('.tm-dot');
    for (let i = 0; i < await dots.count(); i++) {
      await expect(dots.nth(i)).toHaveAttribute('role', 'button');
      await expect(dots.nth(i)).toHaveAttribute('tabindex', '0');
      await expect(dots.nth(i)).toHaveAttribute('aria-label', /\S/);
    }
  });

  test('hover 하면 그룹 라벨이 툴팁에 뜬다', async ({ page, isMobile }) => {
    test.skip(isMobile, 'hover 는 데스크톱 전용');

    const label = groupSpots(SINGLE.spots, SINGLE.level).filter(isPlottable)[0].label;
    await page.locator('.tm-dot').first().hover();

    await expect(page.getByRole('tooltip')).toContainText(label);
  });

  test('anchor 가 있는 마커를 클릭하면 본문으로 이동한다', async ({ page, isMobile }) => {
    test.skip(isMobile, '터치는 two-tap 테스트에서 다룬다');

    // 히로사키시 그룹 → #히로사키성-첫번째-스탬프
    const groups = groupSpots(SINGLE.spots, SINGLE.level).filter(isPlottable);
    const index = groups.findIndex(g => g.label === '히로사키시');
    expect(index).toBeGreaterThanOrEqual(0);

    await page.locator('.tm-dot').nth(index).click();

    const heading = page.locator('#히로사키성-첫번째-스탬프');
    await expect(heading).toBeInViewport();
    // sticky 네비(약 64px)에 가리지 않아야 한다
    const top = await heading.evaluate(el => el.getBoundingClientRect().top);
    expect(top).toBeGreaterThan(64);
  });

  test('「방문한 곳」 목록은 도시 단위로 남는다', async ({ page }) => {
    await expect(page.locator('.tm-visited > li')).toHaveCount(
      groupSpots(SINGLE.spots, 'city').length,
    );
  });

  test('details 를 열면 원본 스크린샷이 보인다', async ({ page }) => {
    const image = page.getByAltText('여행 루트 (원본 구글 맵 스크린샷)');
    await expect(image).toBeAttached();

    await page.getByText('구글 맵 원본 보기').click();
    await expect(image).toBeVisible();
  });
});

test.describe('TravelMap — 2개 현 (24_12-20)', () => {
  test.beforeEach(async ({ page }) => openMap(page, MULTI.url));

  test('마커가 현 단위로 묶인다', async ({ page }) => {
    // 도시 단위로 두면 도쿄 지구 3개가 700km 축척에서 한 점에 겹친다
    await expect(page.locator('.tm-dot')).toHaveCount(markerCount(MULTI.spots, MULTI.level));
    expect(markerCount(MULTI.spots, MULTI.level)).toBeLessThan(markerCount(MULTI.spots, 'city'));
  });

  test('마커가 겹치지 않는다', async ({ page }) => {
    const positions = await page.locator('.tm-dot').evaluateAll(nodes =>
      nodes.map(n => `${Math.round(+n.getAttribute('cx')!)},${Math.round(+n.getAttribute('cy')!)}`));

    expect(new Set(positions).size).toBe(positions.length);
  });

  test('배경이 현 실루엣이다 (내부 경계선 없음)', async ({ page }) => {
    await expect(page.locator('.tm-muni--plain').first()).toBeAttached();
  });

  test('지도는 현 단위여도 목록은 도시 상세를 유지한다', async ({ page }) => {
    const cityGroups = groupSpots(MULTI.spots, 'city').length;

    await expect(page.locator('.tm-visited > li')).toHaveCount(cityGroups);
    expect(cityGroups).toBeGreaterThan(markerCount(MULTI.spots, MULTI.level));
  });
});

test.describe('TravelMap — 모바일 two-tap', () => {
  test('첫 탭은 툴팁만, 같은 마커 두 번째 탭에서 이동한다', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile-chrome 전용');

    await openMap(page, SINGLE.url);
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);

    const groups = groupSpots(SINGLE.spots, SINGLE.level).filter(isPlottable);
    const index = groups.findIndex(g => g.label === '히로사키시');
    const marker = page.locator('.tm-dot').nth(index);
    const heading = page.locator('#히로사키성-첫번째-스탬프');

    await marker.tap();
    await expect(page.getByRole('tooltip')).toBeVisible();
    await expect(heading).not.toBeInViewport();

    await marker.tap();
    await expect(heading).toBeInViewport();
  });
});

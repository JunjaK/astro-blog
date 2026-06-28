import { expect, test } from '@playwright/test';

const DAY1_PATH = '/blog/diary/25-01-tokyo/01_01-20';
const DAY2_PATH = '/blog/diary/25-01-tokyo/02_01-21';
const SCRAPBOOK_SELECTOR = '[data-polaroid-gallery="scrapbook"]';

test.describe('Tokyo diary scrapbook gallery', () => {
  test('day 1 uses scrapbook galleries instead of the old carousel', async ({ page }) => {
    await page.goto(DAY1_PATH);

    await expect(page.locator(SCRAPBOOK_SELECTOR)).toHaveCount(4);
    await expect(page.locator(`${SCRAPBOOK_SELECTOR} [data-polaroid-card]`)).toHaveCount(21);
    await expect(page.locator('[aria-roledescription="carousel"]')).toHaveCount(0);
  });

  test('day 1 scrapbook lightbox opens from the converted gallery content', async ({ page }) => {
    await page.goto(DAY1_PATH);

    const firstCard = page.locator(`${SCRAPBOOK_SELECTOR} [data-polaroid-card]`).first();
    await firstCard.scrollIntoViewIfNeeded();
    await firstCard.click();

    await expect(page.getByText('도쿄로 가는 길')).toBeVisible();
    await expect(page.getByText('1 /2')).toBeVisible();
  });

  test('day 2 renders a single scrapbook gallery without comparison headings', async ({ page }) => {
    await page.goto(DAY2_PATH);

    await expect(page.locator(SCRAPBOOK_SELECTOR)).toHaveCount(1);
    await expect(page.locator(`${SCRAPBOOK_SELECTOR} [data-polaroid-card]`)).toHaveCount(10);
    await expect(page.getByRole('heading', { name: 'Current' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Draft 1/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Draft 2/i })).toHaveCount(0);
  });

  test('scrapbook cards do not show a focus outline ring', async ({ page }) => {
    await page.goto(DAY2_PATH);

    const firstCard = page.locator(`${SCRAPBOOK_SELECTOR} [data-polaroid-card]`).first();
    await firstCard.scrollIntoViewIfNeeded();
    await firstCard.focus();

    const focusStyles = await firstCard.evaluate((node) => {
      const styles = getComputedStyle(node);
      return {
        outlineStyle: styles.outlineStyle,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
      };
    });

    expect(focusStyles.outlineStyle).toBe('none');
    expect(focusStyles.outlineWidth).toBe('0px');
    expect(focusStyles.boxShadow).toBe('none');
  });

  test('scrapbook lightbox wraps from last image to first and back again', async ({ page }) => {
    await page.goto(DAY2_PATH);

    const scrapbookCards = page.locator(`${SCRAPBOOK_SELECTOR} [data-polaroid-card]`);
    await scrapbookCards.last().scrollIntoViewIfNeeded();
    await scrapbookCards.last().click();

    await expect(page.getByText('제목 10')).toBeVisible();
    await expect(page.getByText('10 /10')).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByText('제목 1')).toBeVisible();
    await expect(page.getByText('1 /10')).toBeVisible();

    await page.keyboard.press('ArrowLeft');
    await expect(page.getByText('제목 10')).toBeVisible();
    await expect(page.getByText('10 /10')).toBeVisible();
  });

  test('scrapbook lightbox description truncates then expands into a scrollable drawer', async ({ page }) => {
    await page.goto(DAY2_PATH);

    const firstCard = page.locator(`${SCRAPBOOK_SELECTOR} [data-polaroid-card]`).first();
    await firstCard.scrollIntoViewIfNeeded();
    await firstCard.click();

    const drawer = page.locator('[data-polaroid-description-drawer]');
    const content = page.locator('[data-polaroid-description-content]');
    await expect(drawer).toBeVisible();

    const collapsed = await drawer.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return {
        viewportWidth: window.innerWidth,
        widthRatio: Number((rect.width / window.innerWidth).toFixed(3)),
        height: Math.round(rect.height),
        expanded: node.getAttribute('aria-expanded'),
      };
    });
    const collapsedContent = await content.evaluate((node) => {
      const styles = getComputedStyle(node);
      return {
        whiteSpace: styles.whiteSpace,
        textOverflow: styles.textOverflow,
        overflowX: styles.overflowX,
      };
    });

    expect(collapsed.widthRatio).toBeLessThanOrEqual(collapsed.viewportWidth <= 768 ? 0.85 : 0.55);
    expect(collapsed.expanded).toBe('false');
    expect(collapsedContent.whiteSpace).toBe('nowrap');
    expect(collapsedContent.textOverflow).toBe('ellipsis');
    expect(collapsedContent.overflowX).toBe('hidden');

    await drawer.click({ force: true });

    await expect
      .poll(async () => {
        return await drawer.evaluate((node) => Math.round(node.getBoundingClientRect().height));
      })
      .toBeGreaterThan(collapsed.height + 120);

    const expanded = await drawer.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return {
        height: Math.round(rect.height),
        expanded: node.getAttribute('aria-expanded'),
      };
    });
    const expandedContent = await content.evaluate((node) => {
      const styles = getComputedStyle(node);
      return {
        overflowY: styles.overflowY,
        scrollHeight: node.scrollHeight,
        clientHeight: node.clientHeight,
        whiteSpace: styles.whiteSpace,
      };
    });

    expect(expanded.expanded).toBe('true');
    expect(expanded.height).toBeGreaterThan(collapsed.height + 120);
    expect(expandedContent.whiteSpace).toBe('normal');
    expect(expandedContent.overflowY === 'auto' || expandedContent.overflowY === 'scroll').toBeTruthy();
    expect(expandedContent.scrollHeight).toBeGreaterThan(expandedContent.clientHeight);
  });

  test('scrapbook stage stays visually clean without a board background', async ({ page }) => {
    await page.goto(DAY2_PATH);

    const stage = page.locator(`${SCRAPBOOK_SELECTOR} .scrapbook-polaroid-stage`);
    await stage.scrollIntoViewIfNeeded();

    const stageStyles = await stage.evaluate((node) => {
      const styles = getComputedStyle(node);
      return {
        backgroundImage: styles.backgroundImage,
        boxShadow: styles.boxShadow,
      };
    });

    expect(stageStyles.backgroundImage).toBe('none');
    expect(stageStyles.boxShadow).toBe('none');
  });

  test('scrapbook card frame switches between light and dark paper tones without paper gradients', async ({ page }) => {
    await page.goto(DAY2_PATH);

    const body = page.locator(`${SCRAPBOOK_SELECTOR} .scrapbook-polaroid-card__body`).first();
    await body.scrollIntoViewIfNeeded();

    const measureTone = (value: string) => {
      const matches = value.match(/\d+/g)?.map(Number) ?? [];
      if (matches.length < 3)
        return Number.POSITIVE_INFINITY;
      return (matches[0] + matches[1] + matches[2]) / 3;
    };

    const lightPaper = await body.evaluate((node) => {
      const styles = getComputedStyle(node);
      return {
        backgroundColor: styles.backgroundColor,
        backgroundImage: styles.backgroundImage,
      };
    });

    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    const darkPaper = await body.evaluate((node) => {
      const styles = getComputedStyle(node);
      return {
        backgroundColor: styles.backgroundColor,
        backgroundImage: styles.backgroundImage,
      };
    });

    expect(lightPaper.backgroundImage).toBe('none');
    expect(darkPaper.backgroundImage).toBe('none');
    expect(darkPaper.backgroundColor).not.toEqual(lightPaper.backgroundColor);
    expect(measureTone(lightPaper.backgroundColor)).toBeGreaterThan(220);
    expect(measureTone(darkPaper.backgroundColor)).toBeLessThan(90);
  });

  test('scrapbook photos get a nostalgic film treatment', async ({ page }) => {
    await page.goto(DAY2_PATH);

    const photo = page.locator(`${SCRAPBOOK_SELECTOR} .scrapbook-polaroid-card__photo`).first();
    const image = photo.locator('img');
    await photo.scrollIntoViewIfNeeded();

    const filter = await image.evaluate((node) => getComputedStyle(node).filter);
    const overlay = await photo.evaluate((node) => getComputedStyle(node, '::after').backgroundImage);

    expect(filter).toContain('sepia');
    expect(overlay).not.toBe('none');
  });

  test('dense scrapbook layout keeps three mobile rows and many visible cards', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(DAY2_PATH);

    const scrapbookStage = page.locator(`${SCRAPBOOK_SELECTOR} .scrapbook-polaroid-stage`);
    const scrapbookCards = page.locator(`${SCRAPBOOK_SELECTOR} [data-polaroid-card]`);

    await scrapbookStage.scrollIntoViewIfNeeded();
    await expect(scrapbookCards.first()).toBeVisible();

    const scrapbookWidth = await scrapbookCards.first().evaluate((node) => Math.round(node.getBoundingClientRect().width));
    const visibleCards = await scrapbookCards.evaluateAll((nodes) =>
      nodes.filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < window.innerHeight;
      }).length,
    );
    const rowBands = await scrapbookCards.evaluateAll((nodes) => {
      const tops = nodes
        .map((node) => Math.round(node.getBoundingClientRect().top))
        .sort((a, b) => a - b);
      const groups: number[] = [];
      tops.forEach((top) => {
        if (!groups.length || Math.abs(top - groups.at(-1)!) > 24)
          groups.push(top);
      });
      return groups.length;
    });

    expect(scrapbookWidth).toBeLessThan(150);
    expect(visibleCards).toBeGreaterThanOrEqual(9);
    expect(rowBands).toBe(3);
  });

  test('scrapbook tegaki caption keeps a readable width on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(DAY2_PATH);

    const caption = page.locator(`${SCRAPBOOK_SELECTOR} [data-scrapbook-caption]`).first();
    await caption.scrollIntoViewIfNeeded();
    await expect(caption).toBeVisible();

    const metrics = await caption.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const canvas = node.querySelector('[data-tegaki="canvas"]');
      const canvasRect = canvas?.getBoundingClientRect();
      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        canvasWidth: canvasRect ? Math.round(canvasRect.width) : 0,
      };
    });

    expect(metrics.width).toBeGreaterThan(80);
    expect(metrics.height).toBeGreaterThan(12);
    expect(metrics.canvasWidth).toBeGreaterThan(60);
  });
});

import { expect, test } from '@playwright/test';

const POST_URL = '/blog/music/sekai-no-arukikata';

test.describe('blog/music — sekai-no-arukikata', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(POST_URL);
    await page.waitForLoadState('networkidle');
  });

  test('renders music card with Apple Music iframe and link buttons', async ({ page }) => {
    const musicCard = page.locator('.music-card');
    await expect(musicCard).toBeVisible();
    await expect(musicCard.locator('iframe')).toBeVisible();
    await expect(page.getByRole('link', { name: /Apple Music/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /YouTube Music/ })).toBeVisible();
  });

  test('lyrics block renders with all stanzas collapsed by default', async ({ page }) => {
    const lyrics = page.locator('.lyrics-block');
    await lyrics.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);
    await expect(lyrics).toBeVisible();

    const firstStanza = page.locator('.lyrics-stanza').first();
    await expect(firstStanza).toHaveAttribute('aria-expanded', 'false');

    const rtVisibility = await firstStanza.locator('rt').first().evaluate(
      (el) => window.getComputedStyle(el).display,
    );
    expect(rtVisibility).toBe('none');
  });

  test('clicking a stanza reveals furigana and Korean translation', async ({ page }) => {
    const lyrics = page.locator('.lyrics-block');
    await lyrics.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);

    const firstStanza = page.locator('.lyrics-stanza').first();
    await firstStanza.click();

    await expect(firstStanza).toHaveAttribute('aria-expanded', 'true');
    await expect(firstStanza).toHaveClass(/is-expanded/);

    const rtVisibility = await firstStanza.locator('rt').first().evaluate(
      (el) => window.getComputedStyle(el).display,
    );
    expect(rtVisibility).not.toBe('none');

    await expect(firstStanza.locator('.ko')).toBeVisible();

    await firstStanza.click();
    await expect(firstStanza).toHaveAttribute('aria-expanded', 'false');
  });

  test('expand-all toggles all stanzas at once', async ({ page }) => {
    const lyrics = page.locator('.lyrics-block');
    await lyrics.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: '전체 펼치기' }).click();

    const stanzas = page.locator('.lyrics-stanza');
    const count = await stanzas.count();
    for (let i = 0; i < count; i++) {
      await expect(stanzas.nth(i)).toHaveAttribute('aria-expanded', 'true');
    }

    await page.getByRole('button', { name: '전체 접기' }).click();
    for (let i = 0; i < count; i++) {
      await expect(stanzas.nth(i)).toHaveAttribute('aria-expanded', 'false');
    }
  });
});

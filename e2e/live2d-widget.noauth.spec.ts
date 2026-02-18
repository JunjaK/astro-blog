import { test } from '@playwright/test';

test('debug React Live2D widget', async ({ page }) => {
  const allConsole: string[] = [];
  page.on('console', (msg) => {
    allConsole.push(`[${msg.type()}] ${msg.text()}`);
  });

  const live2dNetwork: string[] = [];
  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('live2d') || url.includes('waifu') || url.includes('cubism')) {
      live2dNetwork.push(`${response.status()} ${url}`);
    }
  });

  await page.goto('http://localhost:4321', { waitUntil: 'networkidle' });
  await page.waitForTimeout(10000);

  // Check React hydration
  const wrapperHTML = await page.evaluate(() => {
    const wrapper = document.getElementById('live2d-wrapper');
    return wrapper ? wrapper.outerHTML.substring(0, 500) : 'NOT FOUND';
  });
  console.log('=== Wrapper HTML ===');
  console.log(wrapperHTML);

  // Check if initWidget exists
  const initWidgetType = await page.evaluate(() => typeof (window as any).initWidget);
  console.log(`initWidget type: ${initWidgetType}`);

  // Check innerWidth
  const innerWidth = await page.evaluate(() => window.innerWidth);
  console.log(`window.innerWidth: ${innerWidth}`);

  // Check for #waifu
  const waifuExists = await page.evaluate(() => !!document.getElementById('waifu'));
  console.log(`#waifu: ${waifuExists}`);

  console.log('=== Live2D Network ===');
  live2dNetwork.forEach((r) => console.log(`  ${r}`));

  console.log('=== Errors ===');
  allConsole
    .filter((m) => m.startsWith('[error]'))
    .forEach((m) => console.log(`  ${m}`));
});

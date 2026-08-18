import process from 'node:process';
import { defineConfig, devices } from '@playwright/test';

// Astro 7 은 dev 를 데몬으로 띄우고 4321 이 점유돼 있으면 다른 포트를 잡는다.
// 이 저장소 밖의 프로젝트가 4321 을 쓰고 있으면 reuseExistingServer 가 **엉뚱한 사이트**를
// 테스트하게 되므로, 실행 시 포트를 넘길 수 있게 열어둔다.
//   E2E_BASE_URL=http://localhost:4322 bun x playwright test
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:4321';

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: './e2e/report' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'bun dev',
    url: BASE_URL,
    reuseExistingServer: true,
  },
});

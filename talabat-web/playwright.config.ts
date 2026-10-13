import { defineConfig } from '@playwright/test';

export const SPA_BASE_URL = 'http://localhost:4200';
export const IDENTITY_ORIGIN = 'https://localhost:7237';
export const CUSTOMER_API_ORIGIN = 'https://localhost:7056';

const loopbackHttpsOrigins = [IDENTITY_ORIGIN, CUSTOMER_API_ORIGIN];

function assertLoopbackTopology() {
  for (const origin of loopbackHttpsOrigins) {
    const url = new URL(origin);
    if (url.protocol !== 'https:') {
      throw new Error(`E2E topology requires https for ${origin}`);
    }
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      throw new Error(
        `E2E topology requires loopback origins; refusing non-localhost ${origin}`,
      );
    }
  }
  const spa = new URL(SPA_BASE_URL);
  if (spa.protocol !== 'http:' || spa.hostname !== 'localhost') {
    throw new Error(`E2E topology requires http://localhost for the SPA; got ${SPA_BASE_URL}`);
  }
}

assertLoopbackTopology();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  outputDir: 'test-results',
  use: {
    baseURL: SPA_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
});

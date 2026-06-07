import { fileURLToPath } from 'node:url';

import { defineConfig } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3001';

export default defineConfig({
  testDir: fileURLToPath(new URL('./test/e2e', import.meta.url)),

  testMatch: '**/*.e2e-spec.ts',

  /*
   * Database-based E2E tests commonly share state.
   * Start with sequential execution and enable parallelism
   * later when test-data isolation is implemented.
   */
  fullyParallel: false,
  workers: 1,

  retries: process.env.CI ? 2 : 0,

  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL,

    extraHTTPHeaders: {
      Accept: 'application/json',
    },
  },

  /*
   * When E2E_BASE_URL is set, Playwright tests that external
   * application and does not start a local NestJS server.
   */
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'NODE_ENV=test PORT=3001 pnpm start',
        url: `${baseURL}/`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});

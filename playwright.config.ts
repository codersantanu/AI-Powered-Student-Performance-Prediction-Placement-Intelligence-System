import { defineConfig } from '@playwright/test';

const port = process.env.VITE_TEST_PORT || '5173';
const apiUrl = process.env.VITE_TEST_API_URL || '';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.mjs',
  timeout: 90000,
  workers: 1,
  reporter: 'list',
  use: { browserName: 'chromium', headless: true, launchOptions: { args: ['--no-sandbox'] } },
  webServer: {
    command: `node node_modules/vite/bin/vite.js --host 0.0.0.0 --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
    env: { VITE_API_URL: apiUrl, VITE_AUTH_MODE: 'bearer' },
  },
});
